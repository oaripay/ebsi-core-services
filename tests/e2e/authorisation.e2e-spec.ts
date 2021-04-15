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
import axios from "axios";
import fromKeyLike, { JWK } from "jose/jwk/from_key_like";
import { createJwt, SimpleSigner } from "@cef-ebsi/did-jwt";
import SignJWT from "jose/jwt/sign";
import { ConfigService } from "@nestjs/config";
import base64url from "base64url";
import { FastifyInstance } from "fastify";
import jwtVerify from "jose/jwt/verify";
import { Ake1SigPayload, AkeResponse, Agent } from "@cef-ebsi/oauth2-auth";
import querystring from "querystring";
import { AppModule } from "../../src/app.module";
import { AuthenticationRequestResponse } from "../../src/modules/authorisation/authorisation.interface";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { loadConfig, ApiConfig } from "../../src/config/configuration";
import { getPublicKey } from "../utils/publicKey";
import {
  decrypt,
  generateKeys,
} from "../../src/modules/authorisation/authorisation.utils";

async function createClient(alg) {
  const {
    publicKey,
    privateKey,
    publicKeyEncryption,
    privateKeyEncryption,
  } = await generateKeys(alg);

  let jwk: JWK | JWK[];

  if (alg === "EdDSA") {
    // two types of keys for Edward
    jwk = [
      {
        ...(await fromKeyLike(publicKeyEncryption)),
        use: "enc",
      },
      {
        ...(await fromKeyLike(publicKey)),
        use: "sig",
      },
    ];
  } else {
    jwk = await fromKeyLike(publicKey);
  }

  return {
    publicKey,
    privateKey,
    publicKeyEncryption,
    privateKeyEncryption,
    did: `did:ebsi:${crypto.randomBytes(12).toString("base64")}`,
    jwk,
  };
}

describe("Authorisation (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let appTestId: string;
  let trustedAppsRegistry: string;
  let kidApi: string;
  let didApi: string;
  let publicKeyApi: crypto.KeyObject;
  let trustedApp: {
    name: string;
    applicationId: string;
    privateKey: string;
    kid: string;
  };

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

    const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );
    const apiName = configService.get<string>("apiName");
    const appTestName = configService.get<string>("appTestName");
    const appTestPrivateKey = configService.get<string>("appTestPrivateKey");
    trustedAppsRegistry = configService.get<string>("trustedAppsRegistry");

    let listAppsByName: {
      data: { items: { id: string }[] };
    } = await axios.get(`${trustedAppsRegistry}?name=${apiName}`);
    const applicationId = listAppsByName.data.items[0].id;

    listAppsByName = await axios.get(
      `${trustedAppsRegistry}?name=${appTestName}`
    );
    appTestId = listAppsByName.data.items[0].id;

    const { publicKeyObject, did } = await getPublicKey(
      configService.get("apiPrivateKey")
    );
    publicKeyApi = publicKeyObject;
    didApi = did;
    kidApi = `${trustedAppsRegistry}/${applicationId}`;

    trustedApp = {
      name: appTestName,
      applicationId: appTestId,
      privateKey: appTestPrivateKey,
      kid: `${trustedAppsRegistry}/${appTestId}`,
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
      expect.assertions(3);

      const response = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "openid did_authn",
        });

      expect(response.body).toStrictEqual({
        uri: expect.stringContaining(
          `openid://?scope=openid%20did_authn&response_type=id_token&client_id=`
        ) as string,
      });
      expect(response.status).toBe(200);

      const query = querystring.decode(
        (response.body as AuthenticationRequestResponse).uri.replace(
          "openid://?",
          ""
        )
      );

      const { publicKeyObject } = await getPublicKey(
        loadConfig().apiPrivateKey
      );
      const verification = await jwtVerify(
        query.request as string,
        publicKeyObject
      );
      expect(verification.payload).toStrictEqual({
        iat: expect.any(Number) as number,
        scope: "openid did_authn",
        response_type: "id_token",
        client_id: expect.any(String) as string,
        nonce: expect.any(String) as string,
        iss: "authorisation-api",
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
      const token = await createJwt(payload, {
        alg: "ES256K",
        issuer: trustedApp.name,
        signer: SimpleSigner(crypto.randomBytes(32).toString("hex")),
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

      const applicationId =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const nonce = crypto.randomBytes(10).toString("base64");
      let agent = new Agent(crypto.randomBytes(32).toString("hex"), {
        issuer: trustedApp.name,
        kid: `${trustedAppsRegistry}/${applicationId}`,
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
        detail: expect.stringContaining(
          `App ${applicationId} not found`
        ) as string,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      agent = new Agent(crypto.randomBytes(32).toString("hex"), {
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

    it("should create an oauth2 session", async () => {
      expect.assertions(3);
      const nonce = crypto.randomBytes(10).toString("base64");
      const agent = new Agent(trustedApp.privateKey, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const authRequest = await agent.createRequestPayload("storage-api", {
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
        kid: kidApi,
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

  describe.each(["ES256K", "ES256", "RS256", "EdDSA"])(
    "POST /siop-sessions with alg %s",
    (alg) => {
      it("should reject bad requests", async () => {
        expect.assertions(10);

        const client = await createClient(alg);

        let response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send("invalid string");

        expect(response.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: `["id_token must be a jwt string","state must be a string"]`,
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
          .setIssuer(client.did)
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({
            id_token: idToken,
            state: crypto.randomBytes(4).toString("hex"),
          });
        expect(response.body).toStrictEqual({
          title: "Invalid Id Token",
          status: 400,
          detail: "Invalid JWT header",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: client.did,
          })
          .setIssuedAt()
          .setIssuer(client.did)
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({
            id_token: idToken,
            state: crypto.randomBytes(4).toString("hex"),
          });
        expect(response.body).toStrictEqual({
          title: "Invalid Id Token",
          status: 400,
          detail:
            "The payload should contain iss, sub, aud, exp, iat, sub_jwk, sub_did_verification_method_uri, nonce, and claims",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        payload = {
          sub: "thumbprint of the sub_jwk",
          aud: "storage-api",
          sub_jwk: "sub_jwk",
          sub_did_verification_method_uri: client.did,
          nonce: crypto.randomBytes(4).toString("hex"),
          exp: Math.trunc(Date.now() / 1000) + 15,
          claims: {},
        };
        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: client.did,
          })
          .setIssuedAt()
          .setIssuer(client.did)
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({
            id_token: idToken,
            state: crypto.randomBytes(4).toString("hex"),
          });
        expect(response.body).toStrictEqual({
          title: "Invalid Id Token",
          status: 400,
          detail: "Invalid sub_jwk: JWK must be an object",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        payload = {
          sub: "thumbprint of the sub_jwk",
          aud: "storage-api",
          sub_jwk: (await createClient(alg)).jwk,
          sub_did_verification_method_uri: client.did,
          nonce: crypto.randomBytes(4).toString("hex"),
          exp: Math.trunc(Date.now() / 1000) + 15,
          claims: {},
        };

        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: client.did,
          })
          .setIssuedAt()
          .setIssuer(client.did)
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({
            id_token: idToken,
            state: crypto.randomBytes(4).toString("hex"),
          });
        expect(response.body).toStrictEqual({
          title: "Invalid Id Token",
          status: 400,
          detail: "Invalid signature",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });

      it(`should create a siop session for a user that uses alg ${alg}`, async () => {
        expect.assertions(4);

        const nonce = crypto.randomBytes(10).toString("base64");

        const client = await createClient(alg);

        const payload = {
          sub: "thumbprint of the sub_jwk",
          sub_jwk: client.jwk,
          sub_did_verification_method_uri: client.did,
          nonce,
          exp: Math.trunc(Date.now() / 1000) + 15,
          claims: {},
        };

        const idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: client.did,
          })
          .setIssuedAt()
          .setIssuer(client.did)
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({
            id_token: idToken,
            state: crypto.randomBytes(4).toString("hex"),
          });

        expect(response.body).toStrictEqual({
          ake1_enc_payload: expect.any(String) as string,
          ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
          ake1_sig_payload: expect.objectContaining({
            ake1_enc_payload: expect.any(String) as string,
            ake1_nonce: nonce,
            did: client.did,
            iat: expect.any(Number) as number,
            iss: "authorisation-api",
          }) as Ake1SigPayload,
          did: didApi,
        });
        expect(response.status).toBe(200);

        // verify ake
        const {
          ake1_enc_payload: ake1EncPayload,
          ake1_sig_payload: ake1SigPayload,
          ake1_jws_detached: ake1JwsDetached,
        } = response.body as AkeResponse;

        // check ake1EncPayload
        const ake1DecPayload = (await decrypt(
          alg,
          alg === "EdDSA" ? client.privateKeyEncryption : client.privateKey,
          ake1EncPayload
        )) as {
          access_token: string;
          did: string;
        };
        expect(ake1DecPayload).toStrictEqual({
          access_token: expect.any(String) as string,
          did: didApi,
          nonce,
        });

        // check ake1JwsDetached
        const ake1SignPayload = ake1JwsDetached.replace(
          "..",
          `.${base64url(JSON.stringify(ake1SigPayload))}.`
        );
        const { payload: payloadAke } = await jwtVerify(
          ake1SignPayload,
          publicKeyApi
        );
        expect(payloadAke).toStrictEqual(ake1SigPayload);
      });
    }
  );
});
