import { vi, describe, beforeAll, afterEach, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { of } from "rxjs";
import { HttpService } from "@nestjs/axios";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { JWTVerifyResult } from "jose";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../filters/http-exception.filter.js";
import type { ApiConfig } from "../config/configuration.js";

vi.mock("@cef-ebsi/siop-auth", async () => {
  const mod = await vi.importActual<typeof import("@cef-ebsi/siop-auth")>(
    "@cef-ebsi/siop-auth",
  );
  // Return a mocked version so we can redefine property `verifyJwtTar` later
  return {
    ...mod,
    verifyJwtTar: async () =>
      Promise.resolve({ payload: { sub: "did:ebsi:any" } } as JWTVerifyResult),
  };
});

describe("Logging interceptor", () => {
  let app: NestFastifyApplication;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig, true>;

  const mockedLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(mockedLogger);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should NOT log the request and response", async () => {
      expect.assertions(1);

      await request(app.getHttpServer()).get(`/health`);

      const calls = mockedLogger.log.mock.calls.length;
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        "Nest application successfully started",
        "NestApplication",
      );
    });

    it("should log the request and response", async () => {
      expect.assertions(2);

      vi.spyOn(httpService, "request")
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
        "LoggingInterceptor",
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
        "LoggingInterceptor",
      );
    });
  });

  describe("POST /notifications with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      await request(app.getHttpServer())
        .post("/notifications")
        .auth("token", { type: "bearer" })
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
            authorization: "Bearer token",
            connection: "close",
            "content-length": "12",
            "content-type": "application/x-www-form-urlencoded",
            host: expect.stringContaining("127.0.0.1:"),
            conformance: "test-id-conformance",
          },
          message: "Incoming request - POST - /notifications",
          method: "POST",
          conformance: "test-id-conformance",
        },
        "LoggingInterceptor - POST - /notifications",
        "LoggingInterceptor",
      );

      // It should have logged the response
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        warnCalls,
        {
          body: {
            "invalid body": "",
          },
          error: expect.any(Error),
          message: "Outgoing response - 400 - POST - /notifications",
          method: "POST",
          url: "/notifications",
          conformance: "test-id-conformance",
        },
        "LoggingInterceptor - 400 - POST - /notifications",
        "LoggingInterceptor",
      );
    });
  });
});
