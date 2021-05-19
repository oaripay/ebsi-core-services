import request from "supertest";
import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import canonicalize from "canonicalize";
import bs58 from "bs58";
import { parseJwk } from "jose/jwk/parse";
import { createJWT, ES256KSigner } from "@cef-ebsi/did-jwt";
import generateKeyPair from "jose/util/generate_key_pair";
import { ec as EC } from "elliptic";
import SignJWT from "jose/jwt/sign";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import jwtVerify from "jose/jwt/verify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { v4 as uuidv4 } from "uuid";
import {
  Ake1SigPayload,
  AkeResponse,
  Agent as OAuth2Agent,
} from "@cef-ebsi/oauth2-auth";
import {
  EbsiDidAuth,
  Agent as SiopAgent,
  DidAuthResponseMode,
} from "@cef-ebsi/siop-auth";
import querystring from "querystring";
import axios from "axios";
import base64url from "base64url";
import { AppModule } from "../../src/app.module";
import { AuthenticationRequestResponse } from "../../src/modules/authorisation/authorisation.interface";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import { getPublicKey } from "../utils/keys";
import { createVerifiableAuthorisation } from "../utils/verifiableAuthorisation";
import { createVP } from "../utils/verfiablePresentation";

function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

const base64ToBase64Url = (base64: string): string =>
  base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

describe("Authorisation (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let appTestId: string;
  let didRegistry: string;
  let trustedAppsRegistry: string;
  let trustedIssuersRegistry: string;
  let authorisationCredentialSchema: string;
  let onboardingApiPrivateKey: string;
  let onboardingApiDid: string;
  let apiKid: string;
  let apiDid: string;
  let trustedApp: {
    name: string;
    apiTarId: string;
    privateKey: string;
    kid: string;
  };
  let trustedIssuer: {
    privateKey: string;
    did: string;
  };
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    const apiName = configService.get<string>("apiName");
    const testAppName = configService.get<string>("testAppName");
    const testAppPrivateKey = configService.get<string>("testAppPrivateKey");
    const testIssuerDid = configService.get<string>("testIssuerDid");
    const testIssuerPrivateKey = configService.get<string>(
      "testIssuerPrivateKey"
    );
    trustedAppsRegistry = configService.get<string>("trustedAppsRegistry");
    trustedIssuersRegistry = configService.get<string>(
      "trustedIssuersRegistry"
    );
    didRegistry = configService.get<string>("didRegistry");
    authorisationCredentialSchema = configService.get<string>(
      "authorisationCredentialSchema"
    );
    onboardingApiPrivateKey = prefix0x(
      configService.get<string>("onboardingApiPrivateKey")
    );
    onboardingApiDid = configService.get<string>("onboardingApiDid");

    let listAppsByName: {
      data: { items: { id: string }[] };
    } = await axios.get(`${trustedAppsRegistry}?name=${apiName}`);
    const apiTarId = listAppsByName.data.items[0].id;

    listAppsByName = await axios.get(
      `${trustedAppsRegistry}?name=${testAppName}`
    );
    appTestId = listAppsByName.data.items[0].id;

    apiDid = configService.get("apiDid");
    apiKid = `${trustedAppsRegistry}/${apiTarId}`;

    trustedApp = {
      name: testAppName,
      apiTarId: appTestId,
      privateKey: testAppPrivateKey,
      kid: `${trustedAppsRegistry}/${appTestId}`,
    };
    trustedIssuer = {
      privateKey: testIssuerPrivateKey,
      did: testIssuerDid,
    };
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

      const query = querystring.decode(
        (response.body as AuthenticationRequestResponse).uri.replace(
          "openid://?",
          ""
        )
      );

      expect(query.scope).toStrictEqual("openid did_authn");
      expect(query.response_type).toStrictEqual("id_token");
      expect(query.client_id).toBeDefined();
      expect(query.nonce).toBeDefined();
      expect(query.request).toBeDefined();

      const { publicKeyObject } = await getPublicKey(
        configService.get("apiPrivateKey")
      );
      const verification = await jwtVerify(
        query.request as string,
        publicKeyObject
      );

      expect(verification.payload).toStrictEqual({
        iat: expect.any(Number) as number,
        exp: expect.any(Number) as number,
        scope: "openid did_authn",
        response_type: "id_token",
        client_id: expect.any(String) as string,
        nonce: expect.any(String) as string,
        iss: configService.get<string>("apiDid"),
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
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
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
        detail:
          "Assertion token requires aud, iss, exp, sub, jti, nonce and iat in the payload",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      const apiTarId =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const nonce = uuidv4();
      let agent = new OAuth2Agent(crypto.randomBytes(32).toString("hex"), {
        issuer: trustedApp.name,
        kid: `${trustedAppsRegistry}/${apiTarId}`,
      });

      let authRequest = await agent.createRequestPayload("storage-api", {
        nonce,
      });

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: expect.stringContaining(`App ${apiTarId} not found`) as string,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      agent = new OAuth2Agent(crypto.randomBytes(32).toString("hex"), {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      authRequest = await agent.createRequestPayload("storage-api", {
        nonce,
      });

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: "token validation failed",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should create an OAuth2 session", async () => {
      expect.assertions(3);
      const nonce = uuidv4();
      const agent = new OAuth2Agent(trustedApp.privateKey, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const authRequest = await agent.createRequestPayload("ledger-api", {
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
          iss: "authorisation-api",
        }) as Ake1SigPayload,
        ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
        kid: apiKid,
      });
      expect(response.status).toBe(200);

      const check = async () => {
        await agent.verifyAuthenticationResponse(
          response.body as AkeResponse,
          nonce
        );
      };

      await expect(check()).resolves.not.toThrow();
    });
  });

  describe.each(["ES256K"])("POST /siop-sessions with alg %s", (alg) => {
    it("should reject bad requests", async () => {
      expect.assertions(10);

      const clientDid = configService.get<string>("testClientDid");
      const ec = new EC("secp256k1");
      const ecKey = ec.keyFromPrivate(
        configService.get<string>("testClientPrivateKey")
      );
      const jwk = {
        kty: "EC",
        crv: "secp256k1",
        x: base64ToBase64Url(
          ecKey.getPublic().getX().toArrayLike(Buffer).toString("base64")
        ),
        y: base64ToBase64Url(
          ecKey.getPublic().getY().toArrayLike(Buffer).toString("base64")
        ),
        d: base64ToBase64Url(
          ecKey.getPrivate().toArrayLike(Buffer).toString("base64")
        ),
      };
      const clientPrivateKey = await parseJwk(jwk, "ES256K");
      const domain = configService.get<string>("domain");
      const urlPrefix = configService.get<string>("apiUrlPrefix");
      const siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;
      const nonce = uuidv4();

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

      let payload = {};
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
        detail:
          "The Response Token Issuer Claim (iss) MUST be https://self-issued.me",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      idToken = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
          kid: "did:ebsi:1234", // wrong DID
        })
        .setIssuedAt()
        .setIssuer("https://self-issued.me")
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
        detail:
          "Unable to resolve DID document for https://self-issued.me: notFound, registry used: https://api.test.intebsi.xyz/did-registry/v2/identifiers",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      payload = {
        nonce: undefined, // missing nonce
      };

      idToken = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
          kid: clientDid,
        })
        .setIssuedAt()
        .setIssuer("https://self-issued.me")
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

      payload = {
        nonce,
      };

      const wrongPrivateKey = (await generateKeyPair("ES256K")).privateKey;
      idToken = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
          kid: clientDid,
        })
        .setIssuedAt()
        .setIssuer("https://self-issued.me")
        .setAudience(siopSessionsUrl)
        .setExpirationTime("15s")
        .sign(wrongPrivateKey);

      response = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: idToken });

      expect(response.body).toStrictEqual({
        title: "Invalid ID Token",
        status: 400,
        detail: "Signature invalid for JWT",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it(`should create a SIOP session for a user that uses alg ${alg}`, async () => {
      expect.assertions(3);

      const domain = configService.get<string>("domain");
      const urlPrefix = configService.get<string>("apiUrlPrefix");
      const privateKey = prefix0x(configService.get<string>("apiPrivateKey"));
      const siopSessionsUrl = `${domain}${urlPrefix}/siop-sessions`;

      const { uri } = await EbsiDidAuth.createAuthenticationRequest({
        redirectUri: siopSessionsUrl,
        hexPrivateKey: privateKey,
        kid: apiKid,
        issuer: apiDid,
      });

      const uriDecoded = querystring.decode(uri.replace("openid://?", ""));

      const nonce = uuidv4();
      const authenticationResponse =
        await EbsiDidAuth.createAuthenticationResponse({
          hexPrivatekey: prefix0x(configService.get("testClientPrivateKey")),
          did: configService.get("testClientDid"),
          nonce,
          redirectUri: uriDecoded.client_id as string,
          response_mode: DidAuthResponseMode.FORM_POST,
        });

      const authResponseDecoded = querystring.decode(
        authenticationResponse.bodyEncoded || ""
      );

      const response = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: authResponseDecoded.id_token });

      expect(response.body).toStrictEqual({
        ake1_enc_payload: expect.any(String) as string,
        ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
        ake1_sig_payload: expect.objectContaining({
          ake1_enc_payload: expect.any(String) as string,
          ake1_nonce: nonce,
          did: configService.get<string>("testClientDid"),
          iat: expect.any(Number) as number,
          exp: expect.any(Number) as number,
          iss: apiDid,
        }) as Ake1SigPayload,
        did: apiDid,
      });
      expect(response.status).toBe(200);

      // Check that we can get the access token
      const client = {
        privateKey: prefix0x(configService.get<string>("testClientPrivateKey")),
        did: configService.get<string>("testClientDid"),
        didRegistry: configService.get<string>("didRegistry"),
      };
      const agent = new SiopAgent(client);
      const accessToken = await agent.verifyAuthenticationResponse(
        response.body,
        nonce
      );
      expect(accessToken).toBeDefined();
    });
  });

  describe("SIOP flow", () => {
    it("should support the full SIOP flow for a known user (registered did)", async () => {
      expect.assertions(1);
      // 1. First, the client calls /authentication-requests
      const authenticationRequestsResponse = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "openid did_authn",
        });

      // 2. The client verifies the response
      const { uri } = authenticationRequestsResponse.body as { uri: string };
      const uriDecoded = querystring.decode(uri.replace("openid://?", "")) as {
        request: string;
      };

      const payload = await EbsiDidAuth.verifyAuthenticationRequest(
        uriDecoded.request,
        configService.get<string>("didRegistry")
      );

      // 3. The client creates an authentication response and gets an ID Token
      const nonce = uuidv4();
      const authenticationResponse =
        await EbsiDidAuth.createAuthenticationResponse({
          hexPrivatekey: prefix0x(configService.get("testClientPrivateKey")),
          did: configService.get("testClientDid"),
          nonce,
          redirectUri: payload.client_id,
          response_mode: DidAuthResponseMode.FORM_POST,
          claims: {},
        });

      const authResponseDecoded = querystring.decode(
        authenticationResponse.bodyEncoded ?? ""
      );

      const idToken = authResponseDecoded.id_token;

      // 4. The client calls /siop-sessions with the ID Token
      const siopSessionsResponse = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: idToken });

      // 5. Finally, the client verifies the SIOP authentication response and gets an access token
      const siopAgent = new SiopAgent({
        privateKey: prefix0x(configService.get<string>("testClientPrivateKey")),
        didRegistry: configService.get<string>("didRegistry"),
      });

      const accessToken = await siopAgent.verifyAuthenticationResponse(
        siopSessionsResponse.body,
        nonce
      );

      expect(accessToken).toBeDefined();
    });

    it("should support the full SIOP flow for an unknown user (not registered did)", async () => {
      expect.assertions(2);

      // 1. The user creates an authentication request in Onboarding api
      // Since this step requires human intervention (eulogin, recaptcha) this test
      // will skip it and create the response:
      // A verifiable credential signed by onboarding api
      const did = `did:ebsi:${bs58.encode(crypto.randomBytes(32))}`;
      const privateKey = crypto.randomBytes(32).toString("hex");
      const privateKeyHexEncryption = crypto.randomBytes(32).toString("hex");
      const publicKeyEncryption = new EbsiWallet(
        privateKeyHexEncryption
      ).getPublicKey({ format: "jwk" }) as JsonWebKey;
      const verifiableCredential = await createVerifiableAuthorisation(
        did,
        authorisationCredentialSchema,
        onboardingApiPrivateKey,
        onboardingApiDid,
        didRegistry
      );

      // 2. The client creates a verifiable presentation using the verifiable credential
      const vp = await createVP(did, privateKey, verifiableCredential, {
        resolver: didRegistry,
        tirUrl: trustedIssuersRegistry,
      });
      const nonce = uuidv4();
      const canonicalizedVP = base64url.encode(canonicalize(vp));
      // const canonicalizedVP = base64url.encode(JSON.stringify(vp));
      const authenticationResponse =
        await EbsiDidAuth.createAuthenticationResponse({
          hexPrivatekey: prefix0x(privateKey),
          did,
          nonce,
          redirectUri: "/siop-sessions",
          response_mode: DidAuthResponseMode.FORM_POST,
          claims: {
            verified_claims: canonicalizedVP,
            encryption_key: publicKeyEncryption,
          } as unknown as {
            userinfo?: { [x: string]: unknown };
            id_token?: { [x: string]: unknown };
          },
        });

      const authResponseDecoded = querystring.decode(
        authenticationResponse.bodyEncoded ?? ""
      );

      const idToken = authResponseDecoded.id_token;

      // 3. The client calls /siop-sessions with the ID Token
      const siopSessionsResponse = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: idToken });

      expect(siopSessionsResponse.status).toBe(200);

      // 4. Finally, the client verifies the SIOP authentication response and gets an access token
      const siopAgent = new SiopAgent({
        privateKey: prefix0x(privateKeyHexEncryption),
        didRegistry: configService.get<string>("didRegistry"),
      });

      const accessToken = await siopAgent.verifyAuthenticationResponse(
        siopSessionsResponse.body,
        nonce
      );

      expect(accessToken).toBeDefined();
    });

    it("should not support the full SIOP flow for an unknown user (not registered did) if the verifiable authorisation is not signed by Users onboarding API", async () => {
      expect.assertions(2);

      // 1. A Trusted Issuer (different from onboarding api)
      // creates a verifiable authorisation
      const did = `did:ebsi:${bs58.encode(crypto.randomBytes(32))}`;
      const privateKey = crypto.randomBytes(32).toString("hex");
      const privateKeyHexEncryption = crypto.randomBytes(32).toString("hex");
      const publicKeyEncryption = new EbsiWallet(
        privateKeyHexEncryption
      ).getPublicKey({ format: "jwk" }) as JsonWebKey;
      const verifiableCredential = await createVerifiableAuthorisation(
        did,
        authorisationCredentialSchema,
        trustedIssuer.privateKey, // not signed by onboarding api, but by a different Trusted Issuer
        trustedIssuer.did,
        didRegistry
      );

      // 2. The client creates a verifiable presentation using the verifiable credential
      const vp = await createVP(did, privateKey, verifiableCredential, {
        resolver: didRegistry,
        tirUrl: trustedIssuersRegistry,
      });
      const nonce = uuidv4();
      const canonicalizedVP = base64url.encode(canonicalize(vp));
      // const canonicalizedVP = base64url.encode(JSON.stringify(vp));
      const authenticationResponse =
        await EbsiDidAuth.createAuthenticationResponse({
          hexPrivatekey: prefix0x(privateKey),
          did,
          nonce,
          redirectUri: "/siop-sessions",
          response_mode: DidAuthResponseMode.FORM_POST,
          claims: {
            verified_claims: canonicalizedVP,
            encryption_key: publicKeyEncryption,
          } as unknown as {
            userinfo?: { [x: string]: unknown };
            id_token?: { [x: string]: unknown };
          },
        });

      const authResponseDecoded = querystring.decode(
        authenticationResponse.bodyEncoded ?? ""
      );

      const idToken = authResponseDecoded.id_token;

      // 3. The client calls /siop-sessions with the ID Token
      const siopSessionsResponse = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({ id_token: idToken });

      expect(siopSessionsResponse.body).toStrictEqual({
        detail: `All verifiable credentials must be signed by onboarding api (${onboardingApiDid})`,
        status: 400,
        title: "Invalid Verifiable Presentation",
        type: "about:blank",
      });
      expect(siopSessionsResponse.status).toBe(400);
    });
  });
});
