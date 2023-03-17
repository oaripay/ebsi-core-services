import {
  jest,
  describe,
  beforeAll,
  afterEach,
  it,
  expect,
} from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { HttpService } from "@nestjs/axios";
import type { FastifyInstance } from "fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { of } from "rxjs";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import nock from "nock";
import { AppModule } from "../app.module";
import { AllExceptionsFilter } from "../filters/http-exception.filter";
import { ApiConfig } from "../config/configuration";

jest.setTimeout(60000);

describe("Logging interceptor", () => {
  let app: INestApplication;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig, true>;

  const mockedLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(mockedLogger);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      jest
        .spyOn(httpService, "request")
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .mockImplementation(() => of({}));

      await request(app.getHttpServer()).get(`/health`);

      const calls = mockedLogger.log.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls - 1,
        {
          headers: {
            "accept-encoding": "gzip, deflate",
            connection: "close",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: "Incoming request - GET - /health",
          method: "GET",
        },
        "LoggingInterceptor - GET - /health",
        "LoggingInterceptor"
      );

      // It should have logged the response
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        {
          body: {
            details: {
              "ebsi-apis": {
                status: "up",
              },
            },
            error: {},
            info: {
              "ebsi-apis": {
                status: "up",
              },
            },
            status: "ok",
          },
          message: "Outgoing response - 200 - GET - /health",
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor"
      );
    });
  });

  describe("POST /jsonrpc with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      // Mock Auth API v3
      const authApiKeyPair = await generateKeyPair("ES256");
      const authorisationApiUrl = new URL(
        configService.get<string>("authorisationApiV3Url")
      );

      // Mock Auth API v3 /.well-known/openid-configuration endpoint
      nock(authorisationApiUrl.origin)
        .get(`${authorisationApiUrl.pathname}/.well-known/openid-configuration`)
        .reply(200, {
          jwks_uri: `${authorisationApiUrl.origin}${authorisationApiUrl.pathname}/jwks`,
        })
        .persist();

      // Mock Auth API v3 /jwks endpoint
      const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
      const kid = await calculateJwkThumbprint(publicKeyJwk);
      nock(authorisationApiUrl.origin)
        .get(`${authorisationApiUrl.pathname}/jwks`)
        .reply(200, {
          keys: [
            {
              ...publicKeyJwk,
              kid,
            },
          ],
        })
        .persist();

      const controllerDid = EbsiWallet.createDid();
      const userAccessToken = await new SignJWT({
        sub: controllerDid,
        scp: "openid tir_invite",
      })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid,
        })
        .sign(authApiKeyPair.privateKey);

      await request(app.getHttpServer())
        .post("/jsonrpc")
        .auth(userAccessToken, { type: "bearer" })
        .send("invalid body");

      const logCalls = mockedLogger.log.mock.calls.length;
      const warnCalls = mockedLogger.warn.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        logCalls,
        {
          body: { "invalid body": "" },
          headers: {
            "accept-encoding": "gzip, deflate",
            authorization: `Bearer ${userAccessToken}`,
            connection: "close",
            "content-length": "12",
            "content-type": "application/x-www-form-urlencoded",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: "Incoming request - POST - /jsonrpc",
          method: "POST",
        },
        "LoggingInterceptor - POST - /jsonrpc",
        "LoggingInterceptor"
      );

      // It should have logged the response
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        warnCalls,
        {
          body: {
            "invalid body": "",
          },
          error: expect.any(Error),
          message: "Outgoing response - 400 - POST - /jsonrpc",
          method: "POST",
          url: "/jsonrpc",
        },
        "LoggingInterceptor - 400 - POST - /jsonrpc",
        "LoggingInterceptor"
      );
    });
  });
});
