import {
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  afterEach,
  vi,
} from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { setupServer } from "msw/node";
import { HttpResponse, http } from "msw";
import { AppModule } from "./app.module.js";
import { configureApp } from "../tests/utils/app.js";
import { ApiConfig, DEPENDENCIES } from "./config/configuration.js";

const mockedLogger = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

async function startApp() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = await configureApp(moduleFixture);

  Logger.overrideLogger(mockedLogger);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

describe("App Module", () => {
  const mockServer = setupServer();

  beforeAll(() => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe("GET /", () => {
    it("should return 'ok' without logging the request nor the response", async () => {
      expect.assertions(3);

      vi.stubEnv("LOG_LEVEL", "debug");

      const app = await startApp();
      const server = app.getHttpServer();

      const response = await request(server).get("/");

      expect(response.text).toBe("ok");
      expect(response.status).toBe(200);

      // The last logs show that the application was started
      const calls = mockedLogger.log.mock.calls.length;
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        "Nest application successfully started",
        "NestApplication",
      );

      await app.close();
    });

    it("should not display the framework in the error message", async () => {
      expect.assertions(2);

      vi.stubEnv("LOG_LEVEL", "debug");

      const app = await startApp();
      const server = app.getHttpServer();

      const response = await request(server).get("/%91").send();

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        detail: "/%91 is not a valid url component",
        status: 400,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      await app.close();
    });
  });

  describe("GET /unknown-route", () => {
    it("should return an error and log it", async () => {
      expect.assertions(3);

      vi.stubEnv("LOG_LEVEL", "debug");

      const app = await startApp();
      const server = app.getHttpServer();

      const response = await request(server).get("/unknown-route").send();

      expect(response.body).toStrictEqual({
        detail: "Cannot GET /unknown-route",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      // The last logs show the error
      const calls = mockedLogger.error.mock.calls.length;
      expect(mockedLogger.error).toHaveBeenNthCalledWith(
        calls,
        "Cannot GET /unknown-route",
        expect.stringContaining("NotFoundException: Cannot GET /unknown-route"),
        "AllExceptionsFilter",
      );

      await app.close();
    });
  });

  describe("GET /health", () => {
    it('should NOT log the request and response if the header "EBSI-Healthcheck" is present', async () => {
      expect.assertions(1);

      vi.stubEnv("LOG_LEVEL", "debug");

      const app = await startApp();
      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

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
        .set("EBSI-Healthcheck", "1");

      const calls = mockedLogger.log.mock.calls.length;
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        "Nest application successfully started",
        "NestApplication",
      );

      await app.close();
    });

    it('should log the request and response without response body when the log level is not "debug"', async () => {
      expect.assertions(2);

      vi.stubEnv("LOG_LEVEL", "info");

      const app = await startApp();
      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

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

      // It should have logged the response (without body)
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls,
        {
          message: "Outgoing response - 200 - GET - /health",
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor",
      );

      await app.close();
    });

    it('should log the request and response with response body when the log level is "debug"', async () => {
      expect.assertions(2);

      vi.stubEnv("LOG_LEVEL", "debug");

      const app = await startApp();
      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

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

      await app.close();
    });
  });
});
