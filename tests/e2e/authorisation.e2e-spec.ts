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
import { v4 as uuidv4 } from "uuid";
import { createJwt, SimpleSigner } from "@cef-ebsi/did-jwt";
import { ConfigService } from "@nestjs/config";
import base64url from "base64url";
import { FastifyInstance } from "fastify";
import jwtVerify from "jose/jwt/verify";
import querystring from "querystring";
import { AppModule } from "../../src/app.module";
import {
  Ake1SigPayload,
  AkeResponse,
  AuthenticationRequestResponse,
} from "../../src/modules/authorisation/authorisation.interface";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { loadConfig, ApiConfig } from "../../src/config/configuration";
import { getPublicKey } from "../utils/publicKey";
import { decrypt } from "../../src/modules/authorisation/authorisation.utils";

describe("Authorisation (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let appTestName: string;
  let appTestPrivateKey: string;
  let appTestId: string;
  let trustedAppsRegistry: string;
  let apiPublicKeyPemBase64: string;
  let apiPublicKeyObject: crypto.KeyObject;
  let kidApi: string;

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
    appTestName = configService.get("appTestName");
    appTestPrivateKey = configService.get("appTestPrivateKey");
    trustedAppsRegistry = configService.get("trustedAppsRegistry");
    const applicationId: string = configService.get("applicationId");

    const listAppsByName: {
      data: { items: { id: string }[] };
    } = await axios.get(`${trustedAppsRegistry}/apps?name=${appTestName}`);
    appTestId = listAppsByName.data.items[0].id;

    const pubKey = await getPublicKey(configService.get("apiPrivateKey"));
    apiPublicKeyObject = pubKey.publicKeyObject;
    apiPublicKeyPemBase64 = Buffer.from(pubKey.publicKeyPem).toString("base64");
    kidApi = `${trustedAppsRegistry}/apps/${applicationId}`;
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
      expect.assertions(10);

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
        issuer: appTestName,
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
        detail: "Invalid JWT header",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      let applicationId =
        "0x0000000000000000000000000000000000000000000000000000000000000000";

      payload = {};
      let header = {
        kid: `${trustedAppsRegistry}/apps/${applicationId}`,
      };
      token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: "test-app",
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
        title: "Bad Request",
        status: 400,
        detail: expect.stringContaining(
          `App ${applicationId} not found`
        ) as string,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      applicationId = appTestId;
      header = {
        kid: `${trustedAppsRegistry}/apps/${applicationId}`,
      };
      token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: appTestName,
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
          issuer: appTestName,
          signer: SimpleSigner(appTestPrivateKey),
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
      const nonce = crypto.randomBytes(10).toString("base64");
      const kidTrustedApp = `${trustedAppsRegistry}/apps/${appTestId}`;
      const header = {
        kid: kidTrustedApp,
      };
      const payload = {
        iss: appTestName,
        sub: appTestName,
        aud: "storage-api",
        jti: uuidv4(),
        exp: Math.trunc(Date.now() / 1000) + 15,
        nonce,
      };
      const token = await createJwt(
        payload,
        {
          alg: "ES256K",
          issuer: appTestName,
          signer: SimpleSigner(appTestPrivateKey),
        },
        header
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
          appTestPrivateKey,
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
