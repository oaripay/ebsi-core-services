import crypto, { randomUUID } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import { URLSearchParams } from "node:url";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { INestApplication, HttpServer } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  exportJWK,
  generateKeyPair,
  importJWK,
  jwtVerify,
  JWTVerifyResult,
  SignJWT,
} from "jose";
import type { JWK } from "jose";
import KeyEncoder from "key-encoder";
import { createJWT, decodeJWT, ES256KSigner } from "did-jwt";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Agent as OAuth2Agent } from "@cef-ebsi/oauth2-auth";
import type { Ake1SigPayload, AkeResponse } from "@cef-ebsi/oauth2-auth";
import {
  RP,
  Agent as SiopAgent,
  encode,
  verifyJwtTar,
} from "@cef-ebsi/siop-auth";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import type { ApiConfig } from "../../src/config/configuration";
import { getPublicKey, randomPrivateKeySecp256k1 } from "../utils/keys";
import { createVerifiableAuthorisationJwt } from "../utils/verifiableAuthorisation";
import { createVpJwt } from "../utils/verfiablePresentation";
import {
  createAuthenticationResponseJose,
  getKeyByAlg,
} from "../utils/didAuth";
import { getServer } from "../utils/getServer";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

describe("Authorisation (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let trustedAppsRegistry: string;
  let authorisationCredentialSchema: string;
  let onboardingApiPrivateKey: string;
  let onboardingAllowlist: string[];
  let apiKid: string;
  let apiName: string;
  let trustedApp: {
    name: string;
    privateKey: string;
    kid: string;
  };
  let trustedIssuer: {
    privateKey: string;
    did: string;
  };
  let configService: ConfigService<ApiConfig, true>;
  let ebsiEnv: "test" | "conformance" | "pilot" | "prod";
  let domain: string;

  // Fake audience used for the creation of the VP JWT (not checked by the API)
  const audience = "authorisation-api";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);
    const testAppName = configService.get<string>("testAppName");
    const testAppPrivateKey = configService.get<string>("testAppPrivateKey");
    const testIssuerDid = configService.get<string>("testIssuerDid");
    const testIssuerPrivateKey = configService.get<string>(
      "testIssuerPrivateKey"
    );
    trustedAppsRegistry = configService.get<string>("trustedAppsRegistry");
    authorisationCredentialSchema = configService.get<string>(
      "authorisationCredentialSchema"
    );
    onboardingApiPrivateKey = prefix0x(
      configService.get<string>("onboardingApiPrivateKey")
    );
    onboardingAllowlist = configService.get<string[]>("onboardingAllowlist");

    apiName = configService.get<string>("apiName");
    apiKid = `${trustedAppsRegistry}/${apiName}`;

    trustedApp = {
      name: testAppName,
      privateKey: testAppPrivateKey,
      kid: `${trustedAppsRegistry}/${testAppName}`,
    };
    trustedIssuer = {
      privateKey: testIssuerPrivateKey,
      did: testIssuerDid,
    };
    ebsiEnv = configService.get<"test" | "conformance" | "pilot" | "prod">(
      "ebsiEnv"
    );
    domain = configService.get<string>("domain");
  });

  describe("POST /authentication-requests", () => {
    it("should reject bad requests", async () => {
      expect.assertions(4);

      let response = await request(server)
        .post("/authentication-requests")
        .send("invalid string");
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/authentication-requests")
        .send({ scope: "invalid scope" });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an authentication request", async () => {
      expect.assertions(7);

      const response = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "openid did_authn",
        });

      expect(response.status).toBe(200);

      const query = new URLSearchParams(
        response.text.replace("openid://?", "")
      );

      expect(query.get("scope")).toBe("openid did_authn");
      expect(query.get("response_type")).toBe("id_token");
      expect(query.get("client_id")).toBeDefined();
      expect(query.get("nonce")).toBeDefined();
      expect(query.get("request")).toBeDefined();

      const queryRequest = query.get("request") || "";

      let verification: JWTVerifyResult | null;

      if (process.env.TEST_ENV !== "remote") {
        const { publicKeyObject } = await getPublicKey(
          configService.get("apiPrivateKey")
        );

        verification = await jwtVerify(queryRequest, publicKeyObject);
      } else {
        // When running the tests on the remote API, we need to get the public key from TAR
        const { payload } = decodeJWT(queryRequest);
        const { iss } = payload;

        const appInfo = await request(trustedAppsRegistry).get(`/${iss}`);

        const { publicKeys } = appInfo.body as unknown as {
          publicKeys: string[];
        };

        const keyEncoder = new KeyEncoder("secp256k1");

        const verificationResults = await Promise.all(
          publicKeys.map(async (publicKeyBase64) => {
            try {
              const publicKeyHex = keyEncoder.encodePublic(
                Buffer.from(publicKeyBase64, "base64").toString("utf-8"),
                "pem",
                "raw"
              );

              const publicKeyObject = (await importJWK(
                encode.publicKey.fromHextoJWK(publicKeyHex),
                "ES256K"
              )) as crypto.KeyObject;

              const res = await jwtVerify(queryRequest, publicKeyObject);
              return res;
            } catch (e) {
              return null;
            }
          })
        );

        [verification] = verificationResults.filter((res) => res);
      }

      if (!verification) {
        throw new Error("No verification result found");
      }

      expect(verification.payload).toStrictEqual({
        iat: expect.any(Number) as number,
        exp: expect.any(Number) as number,
        scope: "openid did_authn",
        response_type: "id_token",
        client_id: expect.any(String) as string,
        nonce: expect.any(String) as string,
        redirect_uri: expect.stringContaining(
          "/authorisation/v2/siop-sessions"
        ) as string,
        response_mode: "post",
        iss: expect.stringMatching(/^authorisation-api_/) as string,
        claims: expect.objectContaining({}) as { id_token: unknown },
      });
    });
  });

  describe("POST /oauth2-sessions", () => {
    it("should reject bad requests", async () => {
      expect.assertions(8);

      let response = await request(server)
        .post("/oauth2-sessions")
        .send("invalid string");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["grantType must be equal to client_credentials","clientAssertionType must be equal to urn:ietf:params:oauth:client-assertion-type:jwt-bearer","clientAssertion must be a jwt string","scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      const payload = {};
      const token = await createJWT(payload, {
        alg: "ES256K",
        issuer: trustedApp.name,
        signer: ES256KSigner(
          Buffer.from(randomPrivateKeySecp256k1().replace(/^0x/, ""), "hex")
        ),
      });

      response = await request(server).post("/oauth2-sessions").send({
        grantType: "client_credentials",
        clientAssertionType:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        clientAssertion: token,
        scope: "openid did_authn",
      });

      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: `JWT with invalid kid. It should be hosted at ${configService.get<string>(
          "trustedAppsRegistry"
        )}`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      const nonce = randomUUID();

      let agent = new OAuth2Agent({
        privateKey: randomPrivateKeySecp256k1(),
        name: "invalid-app",
        trustedAppsRegistry: configService.get<string>("trustedAppsRegistry"),
      });

      let authRequest = await agent.createRequest("storage-api", {
        nonce,
      });

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: expect.stringContaining("App invalid-app not found") as string,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      agent = new OAuth2Agent({
        privateKey: randomPrivateKeySecp256k1(),
        name: trustedApp.name,
        trustedAppsRegistry: configService.get<string>("trustedAppsRegistry"),
      });

      authRequest = await agent.createRequest("storage-api", {
        nonce,
      });

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: expect.stringContaining(
          "signature verification failed"
        ) as string,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should create an OAuth2 session", async () => {
      expect.assertions(3);
      const nonce = randomUUID();

      const agent = new OAuth2Agent({
        privateKey: trustedApp.privateKey,
        name: trustedApp.name,
        trustedAppsRegistry: configService.get<string>("trustedAppsRegistry"),
      });

      const authRequest = await agent.createRequest("ledger-api", {
        nonce,
      });

      const response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(response.body).toStrictEqual({
        ake1_enc_payload: expect.any(String) as string,
        ake1_sig_payload: expect.objectContaining({
          iat: expect.any(Number) as number,
          exp: expect.any(Number) as number,
          ake1_nonce: nonce,
          ake1_enc_payload: expect.any(String) as string,
          kid: trustedApp.kid,
          iss: expect.stringMatching(/^authorisation-api_/) as string,
        }) as Ake1SigPayload,
        ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
        kid: expect.stringMatching(
          `${trustedAppsRegistry}/authorisation-api_`
        ) as string,
      });
      expect(response.status).toBe(200);

      const check = async () => {
        await agent.verifyAkeResponse(response.body as AkeResponse, { nonce });
      };

      await expect(check()).resolves.not.toThrow();
    });
  });

  describe.each(["ES256K", "ES256", "RS256", "EdDSA"] as const)(
    "POST /siop-sessions with alg %s",
    (alg) => {
      it("should reject bad requests", async () => {
        expect.assertions(14);

        const clientDid = configService.get<string>("testClientDid");
        const clientPrivateKeys = JSON.parse(
          Buffer.from(
            configService.get<string>("testClientPrivateKeysBase64"),
            "base64"
          ).toString()
        ) as {
          type: string;
          id: string;
          privateKeyJwk: JWK;
          publicKeyJwk?: JWK;
          privateKeyEncryptionJwk?: JWK;
          publicKeyEncryptionJwk?: JWK;
        }[];
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        const clientPrivateKey = await importJWK(keyObject.privateKeyJwk, alg);
        const urlPrefix = configService.get<string>("apiUrlPrefix");
        const siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;
        const nonce = randomUUID();

        let response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send("invalid string");

        expect(response.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: '["id_token must be a jwt string"]',
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        let payload: Record<string, unknown> = {
          sub_did_verification_method_uri: `${clientDid}#keys-2`,
          sub: clientDid,
          did: clientDid,
          sub_jwk: {},
          nonce: "nonce",
        };
        let idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
          })
          .setIssuedAt()
          .setIssuer(clientDid) // wrong issuer
          .setAudience(siopSessionsUrl)
          .setExpirationTime("15s")
          .sign(clientPrivateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: `invalid issuer ${clientDid}. Possible values: https://self-issued.me, https://self-issued.me/v2`,
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        const randomDid = EbsiWallet.createDid();
        payload = {
          sub_did_verification_method_uri: `${randomDid}#keys-2`, // wrong DID
          sub: clientDid,
          did: randomDid,
          sub_jwk: {},
          nonce: "nonce",
          // missing claims with encryption_key
        };

        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: randomDid, // wrong DID
          })
          .setIssuedAt()
          .setIssuer("https://self-issued.me/v2")
          .setAudience(siopSessionsUrl)
          .setExpirationTime("15s")
          .sign(clientPrivateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: "no encryption_key found in the claims",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        // Create encryption key
        const encryptionKeyPair =
          alg === "EdDSA"
            ? crypto.generateKeyPairSync("x25519")
            : await generateKeyPair(alg);

        const publicEncryptionKeyJwk = await exportJWK(
          encryptionKeyPair.publicKey
        );

        payload = {
          sub_did_verification_method_uri: `${randomDid}#keys-2`, // wrong DID
          sub: clientDid,
          did: randomDid,
          sub_jwk: {},
          nonce: "nonce",
          claims: {
            encryption_key: publicEncryptionKeyJwk,
          },
        };

        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: randomDid, // wrong DID
          })
          .setIssuedAt()
          .setIssuer("https://self-issued.me/v2")
          .setAudience(siopSessionsUrl)
          .setExpirationTime("15s")
          .sign(clientPrivateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: `Unable to resolve ${randomDid}. Error: notFound. Message: Identifier ${randomDid} not found | Registry used: ${configService.get<string>(
            "didRegistry"
          )}`,
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        payload = {
          sub_did_verification_method_uri: clientDid,
          sub: clientDid,
          did: clientDid,
          sub_jwk: {},
          nonce: undefined, // missing nonce
          claims: {
            encryption_key: publicEncryptionKeyJwk,
          },
        };

        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: clientDid,
          })
          .setIssuedAt()
          .setIssuer("https://self-issued.me/v2")
          .setAudience(siopSessionsUrl)
          .setExpirationTime("15s")
          .sign(clientPrivateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: "No nonce found in JWT payload",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        const wrongJwk = await exportJWK(
          (
            await generateKeyPair(alg)
          ).privateKey
        );

        idToken = await createAuthenticationResponseJose({
          alg,
          keyId: keyObject.id,
          nonce,
          redirectUri: "redirect_uri",
          privateKeyJwk: wrongJwk,
          publicKeyEncryptionJwk: publicEncryptionKeyJwk,
        });

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: "signature verification failed",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        idToken = await createAuthenticationResponseJose({
          alg,
          keyId: "did:ebsi:bad-did#keys1",
          nonce,
          redirectUri: "redirect_uri",
          privateKeyJwk: wrongJwk,
          publicKeyEncryptionJwk: publicEncryptionKeyJwk,
        });

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: `Unable to resolve did:ebsi:bad-did. Error: invalidDid. Message: The method-specific identifier must start with "z" (multibase base58btc-encoded)`,
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });

      it(`should create a SIOP session for a user that uses alg ${alg}`, async () => {
        expect.assertions(4);

        const urlPrefix = configService.get<string>("apiUrlPrefix");
        const privateKey = prefix0x(configService.get<string>("apiPrivateKey"));
        const siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;

        // The RP creates an authentication request
        const rp = new RP({
          privateKey: await importJWK(
            encode.privateKey.fromHextoJWK(privateKey),
            "ES256K"
          ),
          alg: "ES256K",
          name: apiName,
          kid: apiKid,
          redirectUri: siopSessionsUrl,
          didRegistry: configService.get<string>("didRegistry"),
        });
        const uri = await rp.createRequest({});

        // The agent verifies the authentication request
        const uriDecoded = new URLSearchParams(uri.replace("openid://?", ""));

        const nonce = randomUUID();

        const clientPrivateKeys = JSON.parse(
          Buffer.from(
            configService.get<string>("testClientPrivateKeysBase64"),
            "base64"
          ).toString()
        ) as {
          type: string;
          id: string;
          privateKeyJwk: JWK;
          publicKeyJwk: JWK;
        }[];

        const encryptionKeyPair =
          alg === "EdDSA"
            ? crypto.generateKeyPairSync("x25519")
            : await generateKeyPair(alg);

        const publicEncryptionKeyJwk = await exportJWK(
          encryptionKeyPair.publicKey
        );

        const privateEncryptionKeyJwk = await exportJWK(
          encryptionKeyPair.privateKey
        );

        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        let clientKid: string;
        switch (alg) {
          case "ES256K": {
            clientKid = configService.get<string>("testClientKidES256K");
            break;
          }
          case "ES256": {
            clientKid = configService.get<string>("testClientKidES256");
            break;
          }
          case "RS256": {
            clientKid = configService.get<string>("testClientKidRS256");
            break;
          }
          case "EdDSA": {
            clientKid = configService.get<string>("testClientKidEdDSA");
            break;
          }
          default: {
            throw Error("Unhandled case");
          }
        }

        const agent = new SiopAgent({
          privateKey: await importJWK(keyObject.privateKeyJwk, alg),
          alg,
          kid: clientKid,
          siopV2: true,
        });

        const authenticationResponse = await agent.createResponse({
          nonce,
          redirectUri: uriDecoded.get("client_id") || "",
          claims: {
            encryption_key: publicEncryptionKeyJwk,
          },
          responseMode: "form_post",
        });

        const { idToken } = authenticationResponse;

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          ake1_enc_payload: expect.any(String) as string,
          ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
          ake1_sig_payload: expect.objectContaining({
            ake1_enc_payload: expect.any(String) as string,
            ake1_nonce: nonce,
            did: expect.any(String) as string,
            iat: expect.any(Number) as number,
            exp: expect.any(Number) as number,
            iss: expect.stringMatching(/^authorisation-api_/) as string,
          }) as Ake1SigPayload,
          kid: expect.stringMatching(
            `${trustedAppsRegistry}/authorisation-api_`
          ) as string,
        });
        expect(
          (
            response.body as { ake1_sig_payload: { did: string } }
          ).ake1_sig_payload.did.toLowerCase()
        ).toStrictEqual(
          configService.get<string>("testClientDid").toLowerCase()
        );
        expect(response.status).toBe(200);

        // Check that we can get the access token
        const accessToken = await SiopAgent.verifyAkeResponse(
          response.body as AkeResponse,
          {
            nonce,
            privateEncryptionKeyJwk,
            trustedAppsRegistry,
            alg,
          }
        );

        expect(accessToken).toBeDefined();
      });
    }
  );

  describe("SIOP flow", () => {
    it("should support the full SIOP flow for a known user (registered did)", async () => {
      expect.assertions(2);
      // 1. First, the client calls /authentication-requests
      const authenticationRequestsResponse = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "openid did_authn",
        });

      // 2. The client verifies the response
      const clientPrivateKeys = JSON.parse(
        Buffer.from(
          configService.get<string>("testClientPrivateKeysBase64"),
          "base64"
        ).toString()
      ) as {
        type: string;
        id: string;
        privateKeyJwk: JWK;
        publicKeyJwk?: JWK;
      }[];

      const keyObject = await getKeyByAlg(clientPrivateKeys, "ES256K");

      const siopAgent = new SiopAgent({
        privateKey: await importJWK(
          encode.privateKey.fromHextoJWK(keyObject.privateKeyHexES256K),
          "ES256K"
        ),
        alg: "ES256K",
        kid: configService.get<string>("testClientKidES256K"),
        siopV2: true,
      });

      const uri = authenticationRequestsResponse.text;
      const urlParams = new URLSearchParams(uri.replace("openid://?", ""));
      const params = Object.fromEntries(urlParams);

      Object.keys(params).forEach((k) => {
        params[k] = decodeURIComponent(params[k]);
      });

      const { payload } = await verifyJwtTar(params.request, {
        trustedAppsRegistry,
      });

      // 3. The client creates an authentication response and gets an ID Token
      const encryptionKeyPair = await generateKeyPair("ES256K");

      const publicEncryptionKeyJwk = await exportJWK(
        encryptionKeyPair.publicKey
      );

      const privateEncryptionKeyJwk = await exportJWK(
        encryptionKeyPair.privateKey
      );

      const nonce = randomUUID();
      const authenticationResponse = await siopAgent.createResponse({
        nonce,
        redirectUri: payload.client_id as string,
        claims: {
          encryption_key: publicEncryptionKeyJwk,
        },
        responseMode: "form_post",
      });

      const { idToken } = authenticationResponse;

      // 4. The client calls /siop-sessions with the ID Token
      const siopSessionsResponse = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: idToken });

      // 5. Finally, the client verifies the SIOP authentication response and gets an access token
      const accessToken = await SiopAgent.verifyAkeResponse(
        siopSessionsResponse.body as AkeResponse,
        {
          nonce,
          privateEncryptionKeyJwk,
          trustedAppsRegistry,
          alg: "ES256K",
        }
      );

      expect(accessToken).toBeDefined();

      // Verify access token
      await expect(
        verifyJwtTar(accessToken, {
          trustedAppsRegistry,
          audience: "ebsi-core-services",
        })
      ).resolves.not.toThrow();
    });

    describe("should support the full SIOP flow for an unknown user (not registered did)", () => {
      it.each(["ES256K", "ES256", "EdDSA"] as const)(
        "with alg %s",
        async (alg) => {
          expect.assertions(3);

          // 1. The user creates an authentication request in Onboarding api
          // Since this step requires human intervention (eulogin, recaptcha) this test
          // will skip it and create the response:
          // A verifiable credential signed by onboarding api
          const did = EbsiWallet.createDid("LEGAL_ENTITY");
          const keyPair = await generateKeyPair(alg);
          const publicKeyJwk = await exportJWK(keyPair.publicKey);
          const privateKeyJwk = await exportJWK(keyPair.privateKey);
          const privateKeyHexEncryption = randomPrivateKeySecp256k1();
          const privateEncryptionKeyJwk = encode.privateKey.fromHextoJWK(
            privateKeyHexEncryption
          );
          const publicKeyEncryption = new EbsiWallet(
            privateKeyHexEncryption
          ).getPublicKey({ format: "jwk" }) as JsonWebKey;

          const verifiableCredentialJwt =
            await createVerifiableAuthorisationJwt(
              did,
              authorisationCredentialSchema,
              onboardingApiPrivateKey,
              onboardingAllowlist[0], // must be did of onboarding api
              domain
            );

          // 2. The client creates a verifiable presentation using the verifiable credential
          const siopAgent = new SiopAgent({
            privateKey: await importJWK(
              encode.privateKey.fromHextoJWK(privateKeyHexEncryption),
              "ES256K"
            ),
            kid: `${did}#keys-1`,
            alg: "ES256K",
            siopV2: true,
          });

          const vp = await createVpJwt(
            did,
            publicKeyJwk,
            privateKeyJwk,
            verifiableCredentialJwt,
            audience,
            ebsiEnv,
            alg
          );

          const nonce = randomUUID();

          const authenticationResponse = await siopAgent.createResponse({
            nonce,
            redirectUri: "/siop-sessions",
            responseMode: "form_post",
            claims: {
              encryption_key: { ...publicKeyEncryption },
            },
            _vp_token: {
              presentation_submission: {
                // The presentation_submission object MUST contain an id property.
                // The value of this property MUST be a unique identifier, such as a UUID.
                id: randomUUID(),
                // The presentation_submission object MUST contain a definition_id property.
                // The value of this property MUST be the id value of a valid Presentation Definition.
                definition_id: randomUUID(),
                // The presentation_submission object MUST include a descriptor_map property.
                // The value of this property MUST be an array of Input Descriptor Mapping Objects, composed as follows:
                descriptor_map: [
                  {
                    // The descriptor_map object MUST include an id property.
                    // The value of this property MUST be a string that matches the id property of the Input Descriptor in the Presentation Definition that this Presentation Submission is related to.
                    id: randomUUID(),
                    // The descriptor_map object MUST include a format property.
                    // The value of this property MUST be a string that matches one of the Claim Format Designation. This denotes the data format of the Claim.
                    format: "jwt_vp",
                    // The descriptor_map object MUST include a path property.
                    // The value of this property MUST be a JSONPath string expression. The path property indicates the Claim submitted in relation to the identified Input Descriptor, when executed against the top-level of the object the Presentation Submission is embedded within.
                    path: "$",
                    // The object MAY include a path_nested object to indicate the presence of a multi-Claim envelope format.
                    // This means the Claim indicated is to be decoded separately from its parent enclosure.
                    path_nested: {
                      id: "onboarding-input-id",
                      format: "jwt_vc",
                      path: "$.vp.verifiableCredential[0]",
                    },
                  },
                ],
              },
            },
          });

          const { idToken } = authenticationResponse;

          // 3. The client calls /siop-sessions with the ID Token
          const siopSessionsResponse = await request(server)
            .post("/siop-sessions")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send({ id_token: idToken, vp_token: vp });

          expect(siopSessionsResponse.status).toBe(200);

          // 4. Finally, the client verifies the SIOP authentication response and gets an access token
          const accessToken = await SiopAgent.verifyAkeResponse(
            siopSessionsResponse.body as AkeResponse,
            {
              nonce,
              privateEncryptionKeyJwk,
              trustedAppsRegistry,
              alg: "ES256K",
            }
          );

          expect(accessToken).toBeDefined();

          // Verify access token
          await expect(
            verifyJwtTar(accessToken, {
              trustedAppsRegistry,
              audience: "ebsi-core-services",
            })
          ).resolves.not.toThrow();
        }
      );
    });

    it("should not support the full SIOP flow for an unknown user (not registered did) if the verifiable authorisation is not signed by Users onboarding API", async () => {
      expect.assertions(2);

      // 1. A Trusted Issuer (different from onboarding api)
      // creates a verifiable authorisation
      const did = EbsiWallet.createDid();
      const keyPair = await generateKeyPair("ES256K");
      const publicKeyJwk = await exportJWK(keyPair.publicKey);
      const privateKeyJwk = await exportJWK(keyPair.privateKey);
      const privateKeyHexEncryption = randomPrivateKeySecp256k1();

      const publicKeyEncryption = new EbsiWallet(
        privateKeyHexEncryption
      ).getPublicKey({ format: "jwk" }) as JsonWebKey;

      const verifiableCredentialJwt = await createVerifiableAuthorisationJwt(
        did,
        authorisationCredentialSchema,
        trustedIssuer.privateKey, // not signed by onboarding api, but by a different Trusted Issuer
        trustedIssuer.did,
        domain
      );

      // 2. The client creates a verifiable presentation using the verifiable credential
      const siopAgent = new SiopAgent({
        privateKey: await importJWK(
          encode.privateKey.fromHextoJWK(privateKeyHexEncryption),
          "ES256K"
        ),
        alg: "ES256K",
        kid: `${did}#keys-1`,
        siopV2: true,
      });

      const vp = await createVpJwt(
        did,
        publicKeyJwk,
        privateKeyJwk,
        verifiableCredentialJwt,
        audience,
        ebsiEnv
      );

      const nonce = randomUUID();

      const authenticationResponse = await siopAgent.createResponse({
        nonce,
        redirectUri: "/siop-sessions",
        responseMode: "form_post",
        claims: {
          encryption_key: { ...publicKeyEncryption },
        },
        _vp_token: {
          presentation_submission: {
            // The presentation_submission object MUST contain an id property.
            // The value of this property MUST be a unique identifier, such as a UUID.
            id: randomUUID(),
            // The presentation_submission object MUST contain a definition_id property.
            // The value of this property MUST be the id value of a valid Presentation Definition.
            definition_id: randomUUID(),
            // The presentation_submission object MUST include a descriptor_map property.
            // The value of this property MUST be an array of Input Descriptor Mapping Objects, composed as follows:
            descriptor_map: [
              {
                // The descriptor_map object MUST include an id property.
                // The value of this property MUST be a string that matches the id property of the Input Descriptor in the Presentation Definition that this Presentation Submission is related to.
                id: randomUUID(),
                // The descriptor_map object MUST include a format property.
                // The value of this property MUST be a string that matches one of the Claim Format Designation. This denotes the data format of the Claim.
                format: "jwt_vp",
                // The descriptor_map object MUST include a path property.
                // The value of this property MUST be a JSONPath string expression. The path property indicates the Claim submitted in relation to the identified Input Descriptor, when executed against the top-level of the object the Presentation Submission is embedded within.
                path: "$",
                // The object MAY include a path_nested object to indicate the presence of a multi-Claim envelope format.
                // This means the Claim indicated is to be decoded separately from its parent enclosure.
                path_nested: {
                  id: "onboarding-input-id",
                  format: "jwt_vc",
                  path: "$.vp.verifiableCredential[0]",
                },
              },
            ],
          },
        },
      });

      const { idToken } = authenticationResponse;

      // 3. The client calls /siop-sessions with the ID Token
      const siopSessionsResponse = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: idToken, vp_token: vp });

      expect(siopSessionsResponse.body).toStrictEqual({
        detail: `All verifiable credentials must be signed by issuers in the allowlist: ${onboardingAllowlist.join(
          ", "
        )}`,
        status: 400,
        title: "Invalid Verifiable Presentation",
        type: "about:blank",
      });
      expect(siopSessionsResponse.status).toBe(400);
    });
  });
});
