import {
  vi,
  describe,
  beforeAll,
  afterEach,
  it,
  expect,
  afterAll,
} from "vitest";
import crypto from "node:crypto";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { JWTVerifyResult } from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../filters/http-exception.filter.js";
import { DEPENDENCIES, type ApiConfig } from "../config/configuration.js";

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
  let configService: ConfigService<ApiConfig, true>;

  const mockedLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const mockServer = setupServer();

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url}`);
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        // By default, maxParamLength=100 but we allow keys to be up to 256 bytes, thus we need to allow more chars
        // https://www.fastify.io/docs/latest/Server/#maxparamlength
        maxParamLength: 400,
        // By default, bodyLimit=1048576 (1MB)
        // https://www.fastify.io/docs/latest/Server/#bodylimit
        bodyLimit: 10 * 1024 * 1024,
      }),
    );
    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(mockedLogger);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("GET /health", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      const dependencies = Object.keys(
        DEPENDENCIES,
      ) as (keyof typeof DEPENDENCIES)[];

      const localOrigin =
        configService.get<string>("localOrigin") ||
        configService.get<string>("domain");

      // All the dependencies return a 200
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
            HttpResponse.json({}),
          ),
        ),
      );

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
        "LoggingInterceptor",
      );

      // Expect all the dependencies to be up
      const expectedStatuses = dependencies
        .map((dependency) => ({
          [`${dependency}`]: { status: "up" },
        }))
        .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {});

      // It should have logged the response
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        {
          body: {
            details: expectedStatuses,
            error: {},
            info: expectedStatuses,
            status: "ok",
          },
          message: "Outgoing response - 200 - GET - /health",
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor",
      );
    });
  });

  describe("PUT /stores/distributed/key-values with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      const key = "key-1";
      const value = { value: 3 };

      await request(app.getHttpServer())
        .put(`/stores/distributed/key-values/${key}`)
        .auth("token", { type: "bearer" })
        .type("json")
        .send(value);

      const logCalls = mockedLogger.log.mock.calls.length;
      const errorCalls = mockedLogger.error.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        logCalls,
        {
          body: value,
          headers: {
            "accept-encoding": "gzip, deflate",
            authorization: "Bearer token",
            connection: "close",
            "content-length": "11",
            "content-type": "application/json",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: `Incoming request - PUT - /stores/distributed/key-values/${key}`,
          method: "PUT",
        },
        `LoggingInterceptor - PUT - /stores/distributed/key-values/${key}`,
        "LoggingInterceptor",
      );

      // It should have logged the response
      expect(mockedLogger.error).toHaveBeenNthCalledWith(
        errorCalls,
        {
          message: `Outgoing response - PUT - /stores/distributed/key-values/${key}`,
        },
        expect.stringContaining("BadRequestError: Bad Request"),
        `LoggingInterceptor - PUT - /stores/distributed/key-values/${key}`,
        "LoggingInterceptor",
      );
    });
  });

  describe("PUT /stores/distributed/key-values with a key too larger", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      const key = crypto.randomBytes(129).toString("hex"); // 129 * 2 = 258 > 256
      const value = "value";

      await request(app.getHttpServer())
        .put(`/stores/distributed/key-values/${key}`)
        .auth("token", { type: "bearer" })
        .type("text/plain")
        .send(value);

      const logCalls = mockedLogger.log.mock.calls.length;
      const warnCalls = mockedLogger.warn.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        logCalls,
        {
          body: value,
          headers: {
            "accept-encoding": "gzip, deflate",
            authorization: "Bearer token",
            connection: "close",
            "content-length": "5",
            "content-type": "text/plain",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: `Incoming request - PUT - /stores/distributed/key-values/${key}`,
          method: "PUT",
        },
        `LoggingInterceptor - PUT - /stores/distributed/key-values/${key}`,
        "LoggingInterceptor",
      );

      // It should have logged the response
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        warnCalls,
        {
          body: value,
          error: expect.any(Error),
          message: `Outgoing response - 400 - PUT - /stores/distributed/key-values/${key}`,
          method: "PUT",
          url: `/stores/distributed/key-values/${key}`,
        },
        `LoggingInterceptor - 400 - PUT - /stores/distributed/key-values/${key}`,
        "LoggingInterceptor",
      );
    });
  });
});
