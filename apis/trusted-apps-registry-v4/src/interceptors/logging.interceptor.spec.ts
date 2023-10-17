import { vi, describe, beforeAll, afterEach, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { HttpService } from "@nestjs/axios";
import { ethers } from "ethers";
import * as didJwt from "did-jwt";
import { of } from "rxjs";
import type { JWTVerifyResult } from "jose";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../filters/http-exception.filter.js";
import type { ApiConfig } from "../config/configuration.js";

// Mock access token verification
vi.mock("@cef-ebsi/siop-auth", async () => {
  const mod = await vi.importActual<typeof import("@cef-ebsi/siop-auth")>(
    "@cef-ebsi/siop-auth",
  );

  return {
    ...mod,
    verifyJwtTar: async () =>
      Promise.resolve({ payload: { sub: "test" } } as JWTVerifyResult),
  };
});

vi.mock("did-jwt", async () => {
  const mod = await vi.importActual<typeof import("did-jwt")>("did-jwt");

  return {
    ...mod,
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
    // Mock WebSocketProvider
    vi.spyOn(ethers.providers, "WebSocketProvider").mockImplementation(
      () =>
        new ethers.providers.BaseProvider(
          "any",
        ) as ethers.providers.WebSocketProvider,
    );

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
    it("should log the request and response", async () => {
      expect.assertions(2);

      vi.spyOn(httpService, "request")
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
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor",
      );
    });
  });

  describe("POST /jsonrpc with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);
      const decodedToken: Partial<ReturnType<typeof didJwt.decodeJWT>> = {
        payload: {
          login_hint: "did_siop",
        },
      };

      vi.spyOn(didJwt, "decodeJWT").mockImplementation(
        () => decodedToken as ReturnType<typeof didJwt.decodeJWT>,
      );

      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      await request(app.getHttpServer())
        .post("/jsonrpc")
        .auth(token, { type: "bearer" })
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
            authorization: `Bearer ${token}`,
            connection: "close",
            "content-length": "12",
            "content-type": "application/x-www-form-urlencoded",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: "Incoming request - POST - /jsonrpc",
          method: "POST",
        },
        "LoggingInterceptor - POST - /jsonrpc",
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
          message: "Outgoing response - 400 - POST - /jsonrpc",
          method: "POST",
          url: "/jsonrpc",
        },
        "LoggingInterceptor - 400 - POST - /jsonrpc",
        "LoggingInterceptor",
      );
    });
  });
});
