import request from "supertest";
import crypto from "crypto";
import base64url from "base64url";
import fromKeyLike, { JWK } from "jose/jwk/from_key_like";
import {
  Session,
  Agent,
  AkeResponse,
  Ake1SigPayload,
  InvalidTokenError,
  InvalidAppError,
} from "@cef-ebsi/oauth2-auth";
import SignJWT from "jose/jwt/sign";
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
import { FastifyInstance } from "fastify";
import jwtVerify from "jose/jwt/verify";
import querystring from "querystring";
import { AuthorisationModule } from "./authorisation.module";
import { AuthenticationRequestResponse } from "./authorisation.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { loadConfig } from "../../config/configuration";
import { getPublicKey } from "../../../tests/utils/publicKey";
import { decrypt, generateKeys, getPrivateKeyHex } from "./authorisation.utils";

async function generateApp() {
  const { privateKey, publicKey } = await generateKeys("ES256K");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  });
  const privateKeyHex = await getPrivateKeyHex(privateKey);
  const publicKeyPemBase64 = Buffer.from(publicKeyPem).toString("base64");
  const applicationId = `0x${crypto.randomBytes(32).toString("hex")}`;
  const name = `test-${crypto.randomBytes(3).toString("hex")}`;
  const kid = `${loadConfig().trustedAppsRegistry}/${applicationId}`;
  return {
    name,
    applicationId,
    privateKey,
    privateKeyHex,
    publicKeyPemBase64,
    publicKey,
    kid,
  };
}

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

describe("Authorisation Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let didApi: string;
  let publicKeyApi: crypto.KeyObject;
  const mockOauth2 = {
    verifyAuthenticationRequest: jest.spyOn(
      Session.prototype,
      "verifyAuthenticationRequest"
    ),
    createAccessToken: jest.spyOn(Session.prototype, "createAccessToken"),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthorisationModule],
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

    // mock library
    mockOauth2.verifyAuthenticationRequest.mockImplementation(
      async (): Promise<crypto.KeyObject> =>
        Promise.reject(
          new Error(
            "Forgot to implement the mock for verifyAuthenticationRequest?"
          )
        )
    );

    mockOauth2.createAccessToken.mockImplementation(
      async (): Promise<AkeResponse> =>
        Promise.reject(
          new Error("Forgot to implement the mock for createAccessToken?")
        )
    );

    const { publicKeyObject, did } = await getPublicKey(
      loadConfig().apiPrivateKey
    );
    publicKeyApi = publicKeyObject;
    didApi = did;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
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
      expect.assertions(6);

      const trustedApp = await generateApp();

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

      const agent = new Agent(trustedApp.privateKeyHex, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const nonce = crypto.randomBytes(10).toString("base64");
      const authRequest = await agent.createRequestPayload("storage-api", {
        nonce,
      });

      jest
        .spyOn(Session.prototype, "verifyAuthenticationRequest")
        .mockImplementation(
          async (): Promise<crypto.KeyObject> =>
            Promise.reject(new InvalidTokenError("mock invalid token"))
        );

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);
      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: "mock invalid token",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      jest
        .spyOn(Session.prototype, "verifyAuthenticationRequest")
        .mockImplementation(
          async (): Promise<crypto.KeyObject> =>
            Promise.reject(new InvalidAppError("mock invalid app"))
        );

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);
      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: "mock invalid app",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should create an oauth2 session", async () => {
      expect.assertions(1);

      const trustedApp = await generateApp();

      const agent = new Agent(trustedApp.privateKeyHex, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const nonce = crypto.randomBytes(10).toString("base64");
      const authRequest = await agent.createRequestPayload("storage-api", {
        nonce,
      });

      jest
        .spyOn(Session.prototype, "verifyAuthenticationRequest")
        .mockImplementation(
          async (): Promise<crypto.KeyObject> =>
            Promise.resolve(trustedApp.publicKey)
        );
      jest
        .spyOn(Session.prototype, "createAccessToken")
        .mockImplementation(
          async (): Promise<AkeResponse> => Promise.resolve(null as AkeResponse)
        );

      await request(server).post("/oauth2-sessions").send(authRequest);
      expect(mockOauth2.createAccessToken).toHaveBeenCalledWith(
        authRequest,
        trustedApp.publicKey
      );
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
