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
import { HealthIndicatorResult } from "@nestjs/terminus";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import type { JwtTarVerifyResult } from "@cef-ebsi/oauth2-auth";
import axios from "axios";
import { AppModule } from "../app.module";
import { AllExceptionsFilter } from "../filters/http-exception.filter";
import { createFakeToken } from "../../tests/utils/authorisation";
import { ApiConfig } from "../config/configuration";

jest.setTimeout(120000);

jest.mock("@cef-ebsi/oauth2-auth", () => ({
  // In the following tests, we assume that the OAuth2 JWT is valid
  verifyJwtTar: async (): Promise<JwtTarVerifyResult> =>
    Promise.resolve({} as JwtTarVerifyResult),
}));

describe("Logging interceptor", () => {
  let app: INestApplication;
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      const status = { "ebsi-apis": { status: "up" } } as HealthIndicatorResult;

      jest.spyOn(axios, "get").mockImplementation(() => {
        return Promise.resolve(status);
      });

      await request(app.getHttpServer()).get("/health");

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

  describe("POST /blockchains/besu with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      const tokenOAuth2 = await createFakeToken({
        loginHint: "oauth2",
        authorisationApiName: "authorisation-api",
        testAppName: "test-app",
        useKidAuthApi: false,
        configService,
      });

      await request(app.getHttpServer())
        .post("/blockchains/besu")
        .auth(tokenOAuth2, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "eth_invalid",
          params: [],
          id: "42",
        });

      const logCalls = mockedLogger.log.mock.calls.length;
      const warnCalls = mockedLogger.warn.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        logCalls,
        {
          body: { jsonrpc: "2.0", method: "eth_invalid", params: [], id: "42" },
          headers: {
            "accept-encoding": "gzip, deflate",
            authorization: `Bearer ${tokenOAuth2}`,
            connection: "close",
            "content-length": "62",
            "content-type": "application/json",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: "Incoming request - POST - /blockchains/besu",
          method: "POST",
        },
        "LoggingInterceptor - POST - /blockchains/besu",
        "LoggingInterceptor"
      );

      // It should have logged the response
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        warnCalls,
        {
          body: {
            jsonrpc: "2.0",
            method: "eth_invalid",
            params: [],
            id: "42",
          },
          error: expect.any(Error),
          message: "Outgoing response - 400 - POST - /blockchains/besu",
          method: "POST",
          url: "/blockchains/besu",
        },
        "LoggingInterceptor - 400 - POST - /blockchains/besu",
        "LoggingInterceptor"
      );
    });
  });
});
