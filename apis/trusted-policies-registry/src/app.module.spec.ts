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
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { frameworkErrors, methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyHelmet } from "@fastify/helmet";
import { fastifyAccepts } from "@fastify/accepts";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import { type ApiConfig } from "./config/configuration.js";
import { createLogger } from "./logger/logger.js";

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
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe("Generic tests", () => {
    const mockedLogger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    async function startApp() {
      // Start server
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const logger = createLogger({ silent: true });
      const adapter = new FastifyAdapter({
        frameworkErrors: frameworkErrors(logger),
      });
      const app =
        moduleFixture.createNestApplication<NestFastifyApplication>(adapter);

      // Turn off logger
      Logger.overrideLogger(mockedLogger);

      // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
      await app.register(fastifyHelmet, {
        contentSecurityPolicy: {
          directives: {
            "frame-ancestors": ["'none'"],
          },
        },
        xFrameOptions: {
          action: "deny",
        },
      });

      // Parse "Accept" request header
      await app.register(fastifyAccepts);

      app.useGlobalFilters(new AllExceptionsFilter());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const fastifyInstance = app.getHttpAdapter().getInstance();
      fastifyInstance.addHook("onRequest", methodNotAllowed);

      await app.init();
      await fastifyInstance.ready();
      return app;
    }

    afterEach(() => {
      vi.clearAllMocks();
      vi.unstubAllEnvs();
      mockServer.resetHandlers();
    });

    describe("GET /", () => {
      it("should return 'ok' without logging the request nor the response", async () => {
        expect.assertions(5);

        vi.stubEnv("LOG_LEVEL", "debug");

        const app = await startApp();
        const server = app.getHttpServer();

        const response = await request(server).get("/");

        expect(response.text).toBe("ok");
        expect(response.status).toBe(200);

        // Check headers
        expect(response.headers["content-security-policy"]).toContain(
          "frame-ancestors 'none'",
        );
        expect(response.headers["x-frame-options"]).toStrictEqual("DENY");

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

      it("should return an error 405 if called with a method different from GET", async () => {
        expect.assertions(17);

        const app = await startApp();
        const server = app.getHttpServer();

        // POST
        let response = await request(server).post("/");

        expect(response.body).toStrictEqual({
          detail: "Cannot POST /. Allowed HTTP methods: GET",
          status: 405,
          title: "Method Not Allowed",
          type: "about:blank",
        });
        expect(response.headers["allow"]).toStrictEqual("GET");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // HEAD
        response = await request(server).head("/");

        expect(response.body).toStrictEqual({}); // HEAD response body is empty
        expect(response.headers["allow"]).toStrictEqual("GET");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // PUT
        response = await request(server).put("/");

        expect(response.body).toStrictEqual({
          detail: "Cannot PUT /. Allowed HTTP methods: GET",
          status: 405,
          title: "Method Not Allowed",
          type: "about:blank",
        });
        expect(response.headers["allow"]).toStrictEqual("GET");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // PATCH
        response = await request(server).patch("/");

        expect(response.body).toStrictEqual({
          detail: "Cannot PATCH /. Allowed HTTP methods: GET",
          status: 405,
          title: "Method Not Allowed",
          type: "about:blank",
        });
        expect(response.headers["allow"]).toStrictEqual("GET");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // Check logs
        expect(mockedLogger.error.mock.calls).toStrictEqual([
          [
            "Cannot POST /. Allowed HTTP methods: GET",
            expect.stringContaining(
              "MethodNotAllowedError: Method Not Allowed",
            ),
            "AllExceptionsFilter",
          ],
          [
            "Cannot HEAD /. Allowed HTTP methods: GET",
            expect.stringContaining(
              "MethodNotAllowedError: Method Not Allowed",
            ),
            "AllExceptionsFilter",
          ],
          [
            "Cannot PUT /. Allowed HTTP methods: GET",
            expect.stringContaining(
              "MethodNotAllowedError: Method Not Allowed",
            ),
            "AllExceptionsFilter",
          ],
          [
            "Cannot PATCH /. Allowed HTTP methods: GET",
            expect.stringContaining(
              "MethodNotAllowedError: Method Not Allowed",
            ),
            "AllExceptionsFilter",
          ],
        ]);

        await app.close();
      });

      it("should return an error 406 if called with an unsupported 'Accept' header", async () => {
        expect.assertions(4);

        const app = await startApp();
        const server = app.getHttpServer();

        const response = await request(server)
          .get("/")
          .set("Accept", "application/xml");

        expect(response.body).toStrictEqual({
          detail: "Only 'text/plain' content types supported",
          status: 406,
          title: "Not Acceptable",
          type: "about:blank",
        });
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(406);

        // Check logs
        expect(mockedLogger.error.mock.calls).toStrictEqual([
          [
            "Cannot GET / with 'Accept' header 'application/xml'",
            expect.stringContaining("NotAcceptableError: Not Acceptable"),
            "AcceptsGuard",
          ],
        ]);

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
          expect.stringContaining(
            "NotFoundException: Cannot GET /unknown-route",
          ),
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

        // All the dependencies return a 200
        mockServer.use(
          http.get(configService.get("besuReadinessEndpoint"), () =>
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

        await app.close();
      });

      it('should log the request and response without response body when the log level is not "debug"', async () => {
        expect.assertions(2);

        vi.stubEnv("LOG_LEVEL", "info");

        const app = await startApp();
        const configService =
          app.get<ConfigService<ApiConfig, true>>(ConfigService);

        // All the dependencies return a 200
        mockServer.use(
          http.get(configService.get("besuReadinessEndpoint"), () =>
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

        await app.close();
      });

      it('should log the request and response with response body when the log level is "debug"', async () => {
        expect.assertions(2);

        vi.stubEnv("LOG_LEVEL", "debug");

        const app = await startApp();
        const configService =
          app.get<ConfigService<ApiConfig, true>>(ConfigService);

        // All the dependencies return a 200
        mockServer.use(
          http.get(configService.get("besuReadinessEndpoint"), () =>
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
        const expectedStatuses = ["Besu"]
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
});
