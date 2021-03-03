import request from "supertest";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import base64url from "base64url";
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
import axios, { AxiosError, AxiosResponse } from "axios";
import { createJwt, SimpleSigner } from "@cef-ebsi/did-jwt";
import jwtVerify from "jose/jwt/verify";
import querystring from "querystring";
import { AuthorisationModule } from "./authorisation.module";
import {
  Ake1SigPayload,
  AkeResponse,
  AuthenticationRequestResponse,
} from "./authorisation.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { loadConfig } from "../../config/configuration";
import { getPublicKey, createKeys } from "../../../tests/utils/publicKey";
import { decrypt } from "./authorisation.utils";

async function generateApp() {
  const { privateKey, publicKey } = await createKeys();
  const { publicKeyPem } = publicKey;

  const publicKeyPemBase64 = Buffer.from(publicKeyPem).toString("base64");
  const applicationId = `0x${crypto.randomBytes(32).toString("hex")}`;
  const name = `test-${crypto.randomBytes(3).toString("hex")}`;
  return {
    name,
    applicationId,
    privateKey,
    publicKeyPemBase64,
  };
}

describe("Authorisation Module", () => {
  let app: INestApplication;
  let server: HttpServer;

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
      expect.assertions(12);

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

      let payload = {};
      let token = await createJwt(payload, {
        alg: "ES256K",
        issuer: trustedApp.name,
        signer: SimpleSigner(trustedApp.privateKey),
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
        detail: "Invalid JWT header",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      const dataErrorTar = {
        title: "App Not Found",
        status: 404,
        type: "about:blank",
        detail: `App ${trustedApp.applicationId} not found`,
      };

      jest.spyOn(axios, "get").mockImplementation(
        (): Promise<AxiosError<unknown>> => {
          const err = new Error("Not Found");
          (err as AxiosError).config = {};
          (err as AxiosError).isAxiosError = true;
          (err as AxiosError).toJSON = () => ({});
          (err as AxiosError).response = {
            data: dataErrorTar,
            status: 404,
            statusText: "Not Found",
            config: {},
            headers: {},
          };

          return Promise.reject(err);
        }
      );

      payload = {};
      const header = {
        kid: `${loadConfig().trustedAppsRegistry}/apps/${
          trustedApp.applicationId
        }`,
      };
      token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: trustedApp.name,
          signer: SimpleSigner(trustedApp.privateKey),
        },
        header
      );
      response = await request(server).post("/oauth2-sessions").send({
        grantType: "client_credentials",
        clientAssertionType:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        clientAssertion: token,
        scope: "openid did_authn",
      });

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: JSON.stringify(dataErrorTar),
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      jest.spyOn(axios, "get").mockImplementation(
        (): Promise<AxiosResponse<unknown>> => {
          const resp: AxiosResponse = {
            data: {
              applicationId: trustedApp.applicationId,
              name: "another-tar-app",
            },
            status: 200,
            statusText: "Success",
            headers: {},
            config: {},
          };
          return Promise.resolve(resp);
        }
      );

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
        detail: `Expected issuer: another-tar-app. Payload iss: ${trustedApp.name}`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      jest.spyOn(axios, "get").mockImplementation(
        (): Promise<AxiosResponse<unknown>> => {
          const resp: AxiosResponse = {
            data: {
              applicationId: trustedApp.applicationId,
              name: trustedApp.name,
              publicKeys: [trustedApp.publicKeyPemBase64],
            },
            status: 200,
            statusText: "Success",
            headers: {},
            config: {},
          };
          return Promise.resolve(resp);
        }
      );

      token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: trustedApp.name,
          signer: SimpleSigner(crypto.randomBytes(32).toString("hex")),
        },
        header
      );

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
        detail: "Invalid signature",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: trustedApp.name,
          signer: SimpleSigner(trustedApp.privateKey),
        },
        header
      );

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
        detail: "The payload should contain sub, aud, jti, nonce, and exp",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should create an oauth2 session", async () => {
      expect.assertions(4);
      const {
        publicKeyPem,
        publicKeyObject: apiPublicKeyObject,
      } = await getPublicKey(loadConfig().apiPrivateKey);
      const apiPublicKeyPemBase64 = Buffer.from(publicKeyPem).toString(
        "base64"
      );
      const kidApi = `${loadConfig().trustedAppsRegistry}/apps/${
        loadConfig().applicationId
      }`;

      const trustedApp = await generateApp();
      const kidTrustedApp = `${loadConfig().trustedAppsRegistry}/apps/${
        trustedApp.applicationId
      }`;

      const nonce = crypto.randomBytes(10).toString("base64");
      const header = { kid: kidTrustedApp };
      const payload = {
        iss: trustedApp.name,
        sub: trustedApp.name,
        aud: "storage-api",
        jti: uuidv4(),
        exp: Math.trunc(Date.now() / 1000) + 15,
        nonce,
      };
      const token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: trustedApp.name,
          signer: SimpleSigner(trustedApp.privateKey),
        },
        header
      );

      jest.spyOn(axios, "get").mockImplementation(
        async (): Promise<AxiosResponse<unknown>> => {
          const resp: AxiosResponse = {
            data: {
              applicationId: trustedApp.applicationId,
              name: trustedApp.name,
              publicKeys: [trustedApp.publicKeyPemBase64],
            },
            status: 200,
            statusText: "Success",
            headers: {},
            config: {},
          };
          return Promise.resolve(resp);
        }
      );

      const response = await request(server).post("/oauth2-sessions").send({
        grantType: "client_credentials",
        clientAssertionType:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        clientAssertion: token,
        scope: "openid did_authn",
      });

      expect(response.body).toStrictEqual({
        ake1_enc_payload: expect.any(String) as string,
        ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
        ake1_sig_payload: expect.objectContaining({
          ake1_enc_payload: expect.any(String) as string,
          ake1_nonce: nonce,
          kid: kidTrustedApp,
          iat: expect.any(Number) as number,
          iss: "authorisation-api",
        }) as Ake1SigPayload,
        kid: kidApi,
      });
      expect(response.status).toBe(200);

      // verify ake
      const {
        ake1_enc_payload: ake1EncPayload,
        ake1_sig_payload: ake1SigPayload,
        ake1_jws_detached: ake1JwsDetached,
      } = response.body as AkeResponse;

      // check ake1EncPayload
      const ake1DecPayload = JSON.parse(
        await decrypt(
          trustedApp.privateKey,
          ake1EncPayload,
          nonce,
          apiPublicKeyPemBase64
        )
      ) as {
        access_token: string;
        kid: string;
      };
      expect(ake1DecPayload).toStrictEqual({
        access_token: expect.any(String) as string,
        kid: kidApi,
      });

      // check ake1JwsDetached
      const ake1SignPayload = ake1JwsDetached.replace(
        "..",
        `.${base64url(JSON.stringify(ake1SigPayload))}.`
      );
      const { payload: payloadAke } = await jwtVerify(
        ake1SignPayload,
        apiPublicKeyObject
      );
      expect(payloadAke).toStrictEqual(ake1SigPayload);
    });
  });
});
