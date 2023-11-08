import {
  vi,
  describe,
  beforeAll,
  afterEach,
  it,
  expect,
  afterAll,
} from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AppModule } from "../app.module.js";
import { DEPENDENCIES, type ApiConfig } from "../config/configuration.js";
import { configureApp } from "../../tests/utils/app.js";

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

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture, configService);

    Logger.overrideLogger(mockedLogger);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockServer.resetHandlers();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("GET /health", () => {
    it("should NOT log the request and response", async () => {
      expect.assertions(1);

      await request(app.getHttpServer()).get("/health");

      const calls = mockedLogger.log.mock.calls.length;
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        "Nest application successfully started",
        "NestApplication",
      );
    });

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
          conformance: "test-id-conformance",
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor",
      );
    });
  });
});
