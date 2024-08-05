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
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { JwtTarVerifyResult } from "@cef-ebsi/oauth2-auth";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../filters/http-exception.filter.js";
import { createFakeToken } from "../../tests/utils/authorisation.js";
import { DEPENDENCIES, type ApiConfig } from "../config/configuration.js";

vi.mock("@cef-ebsi/oauth2-auth", () => ({
  // In the following tests, we assume that the OAuth2 JWT is valid
  verifyJwtTar: async (): Promise<JwtTarVerifyResult> =>
    Promise.resolve({} as JwtTarVerifyResult),
}));

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
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter());
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
    it('should NOT log the request and response if the header "EBSI-Healthcheck" is present', async () => {
      expect.assertions(1);

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
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}),
        ),
      );

      await request(app.getHttpServer())
        .get("/health")
        .set("EBSI-Healthcheck", "1");

      const calls = mockedLogger.log.mock.calls.length;
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        "Nest application successfully started",
        "NestApplication",
      );
    });

    it('should log the request and response without response body when the log level is not "debug"', async () => {
      expect.assertions(2);

      configService.set("logLevel", "info");

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
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}),
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

      // It should have logged the response (without body)
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        {
          message: "Outgoing response - 200 - GET - /health",
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor",
      );
    });

    it('should log the request and response with response body when the log level is "debug"', async () => {
      expect.assertions(2);

      configService.set("logLevel", "debug");

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
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}),
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
      const expectedStatuses = ([...dependencies, "Besu"] as const)
        .map((dependency) => ({
          [`${dependency}`]: { status: "up" },
        }))
        .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {});

      // It should have logged the response (with body)
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
        "LoggingInterceptor",
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
        "LoggingInterceptor",
      );
    });
  });
});
