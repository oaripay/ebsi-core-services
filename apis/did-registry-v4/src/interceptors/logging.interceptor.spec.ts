import {
  jest,
  describe,
  beforeAll,
  afterEach,
  afterAll,
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
import nock from "nock";
import type { FastifyInstance } from "fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { of } from "rxjs";
import { AppModule } from "../app.module";
import { AllExceptionsFilter } from "../filters/http-exception.filter";
import { ApiConfig } from "../config/configuration";

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
    // Disable external requests
    nock.disableNetConnect();
    // Allow localhost connections so we can test local routes and mock servers.
    nock.enableNetConnect("127.0.0.1");

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

    // Mock dependencies
    const ledgerApiUrl = new URL(
      `${configService.get<string>("ledgerApiUrl")}/health`
    );
    const authorisationApiV2Url = new URL(
      `${configService.get<string>("authorisationApiV2Url")}/health`
    );

    nock(ledgerApiUrl.origin).get(ledgerApiUrl.pathname).reply(200).persist();
    nock(authorisationApiV2Url.origin)
      .get(authorisationApiV2Url.pathname)
      .reply(200)
      .persist();

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    nock.restore();
  });

  describe("GET /health", () => {
    it("should NOT log the request and response", async () => {
      expect.assertions(1);

      jest
        .spyOn(httpService, "request")
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .mockImplementation(() => of({}));

      await request(app.getHttpServer()).get(`/health`);

      const calls = mockedLogger.log.mock.calls.length;
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        "Nest application successfully started",
        "NestApplication"
      );
    });

    it("should log the request and response", async () => {
      expect.assertions(2);

      jest
        .spyOn(httpService, "request")
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .mockImplementation(() => of({}));

      await request(app.getHttpServer())
        .get(`/health`)
        .set("conformance", "test-id-conformance");

      const calls = mockedLogger.log.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls - 1,
        {
          headers: {
            "accept-encoding": "gzip, deflate",
            connection: "close",
            host: expect.stringContaining("127.0.0.1:"),
            conformance: "test-id-conformance",
          },
          message: "Incoming request - GET - /health",
          method: "GET",
          conformance: "test-id-conformance",
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
          conformance: "test-id-conformance",
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
        scp: "openid didr_invite",
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
        .set("conformance", "test-id-conformance")
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
            conformance: "test-id-conformance",
          },
          message: "Incoming request - POST - /jsonrpc",
          method: "POST",
          conformance: "test-id-conformance",
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
          conformance: "test-id-conformance",
        },
        "LoggingInterceptor - 400 - POST - /jsonrpc",
        "LoggingInterceptor"
      );
    });
  });
});
