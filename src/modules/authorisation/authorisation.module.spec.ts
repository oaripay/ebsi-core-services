import request from "supertest";
import crypto from "crypto";
import fromKeyLike from "jose/jwk/from_key_like";
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
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import jwtVerify from "jose/jwt/verify";
import querystring from "querystring";
import * as EbsiDidJwt from "@cef-ebsi/did-jwt/dist/jwt";
import { AuthorisationModule } from "./authorisation.module";
import { AuthenticationRequestResponse } from "./authorisation.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  getPublicKey,
  generateKeys,
  getPrivateKeyHex,
} from "../../../tests/utils/keys";

import { ApiConfig } from "../../config/configuration";

async function generateApp(apiPrivateKey: string) {
  const { privateKey, publicKey } = await generateKeys("ES256K");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  });

  const privateKeyHex = await getPrivateKeyHex(privateKey);
  const publicKeyPemBase64 = Buffer.from(publicKeyPem).toString("base64");
  const apiTarId = `0x${crypto.randomBytes(32).toString("hex")}`;
  const name = `test-${crypto.randomBytes(3).toString("hex")}`;
  const kid = `${apiPrivateKey}/${apiTarId}`;

  return {
    name,
    apiTarId,
    privateKey,
    privateKeyHex,
    publicKeyPemBase64,
    publicKey,
    kid,
  };
}

async function createClient(alg: string) {
  const {
    publicKey,
    privateKey,
    publicKeyEncryption,
    privateKeyEncryption,
  } = await generateKeys(alg);

  const jwk = await fromKeyLike(publicKey);

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
  let configService: ConfigService<ApiConfig>;
  let apiPrivateKey: string;
  let apiDid: string;

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

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    apiPrivateKey = configService.get("apiPrivateKey");
    apiDid = configService.get("apiDid");

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
  });

  afterEach(() => {
    jest.resetAllMocks();
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

      const { publicKeyObject } = await getPublicKey(apiPrivateKey);

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
        iss: configService.get<string>("apiDid"),
        exp: expect.any(Number) as number,
      });
    });
  });

  describe("POST /oauth2-sessions", () => {
    it("should reject bad requests", async () => {
      expect.assertions(6);

      const trustedApp = await generateApp(apiPrivateKey);

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

      const nonce = uuidv4();
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

    it("should create an OAuth2 session", async () => {
      expect.assertions(1);

      const trustedApp = await generateApp(apiPrivateKey);

      const agent = new Agent(trustedApp.privateKeyHex, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const nonce = uuidv4();
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

  describe.each(["ES256K"])("POST /siop-sessions with alg %s", (alg) => {
    it("should reject bad requests", async () => {
      expect.assertions(6);

      const client = await createClient(alg);

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

      const payload = {};
      let idToken = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
        })
        .setIssuedAt()
        .setIssuer(client.did) // wrong issuer
        .setAudience("storage-api")
        .setExpirationTime("15s")
        .sign(client.privateKey);

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
          kid: client.did,
        })
        .setIssuedAt()
        .setIssuer("https://self-issued.me")
        .setAudience("storage-api")
        .setExpirationTime("15s")
        .sign(client.privateKey);

      // Fake verifyEbsiJWT result
      jest.spyOn(EbsiDidJwt, "verifyEbsiJWT").mockImplementation(async () =>
        Promise.resolve({
          payload,
          didResolutionResult: {
            didDocument: {
              id: client.did,
            },
            didDocumentMetadata: {},
            didResolutionMetadata: {},
          },
          issuer: "",
          signer: {
            publicKeyJwk: client.jwk,
          },
          jwt: "",
        })
      );

      response = await request(server)
        .post("/siop-sessions")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send({
          id_token: idToken,
        });

      expect(response.body).toStrictEqual({
        title: "Invalid ID Token",
        status: 400,
        detail: "No nonce found in JWT payload",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it(`should create a siop session for a user that uses alg ${alg}`, async () => {
      expect.assertions(2);

      const nonce = uuidv4();

      const client = await createClient(alg);

      const payload = {
        nonce,
      };

      const idToken = await new SignJWT(payload)
        .setProtectedHeader({
          alg,
          typ: "JWT",
          kid: client.did,
        })
        .setIssuedAt()
        .setIssuer("https://self-issued.me")
        .setAudience("storage-api")
        .setExpirationTime("15s")
        .sign(client.privateKey);

      // Fake verifyEbsiJWT result
      jest.spyOn(EbsiDidJwt, "verifyEbsiJWT").mockImplementation(async () =>
        Promise.resolve({
          payload,
          didResolutionResult: {
            didDocument: {
              id: client.did,
            },
            didDocumentMetadata: {},
            didResolutionMetadata: {},
          },
          issuer: "",
          signer: {
            publicKeyJwk: client.jwk,
          },
          jwt: "",
        })
      );

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
          did: client.did,
          iat: expect.any(Number) as number,
          exp: expect.any(Number) as number,
          iss: apiDid,
        }) as Ake1SigPayload,
        did: apiDid,
      });
      expect(response.status).toBe(200);
    });
  });
});
