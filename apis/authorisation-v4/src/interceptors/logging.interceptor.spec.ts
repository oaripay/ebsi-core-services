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
import { Logger } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import type { FastifyInstance } from "fastify";
import { of } from "rxjs";
import { AppModule } from "../app.module";
import type { ApiConfig } from "../config/configuration";
import { configureApp } from "../../tests/utils/app";

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

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture, configService);

    Logger.overrideLogger(mockedLogger);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should NOT log the request and response", async () => {
      expect.assertions(1);

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
        .get("/health")
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
});
