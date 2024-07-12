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
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { frameworkErrors } from "@ebsiint-api/shared";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import { DEPENDENCIES, type ApiConfig } from "./config/configuration.js";
import { createLogger } from "./logger/logger.js";

interface ResponseHeaders {
  "ebsi-image-tag": string;
  [key: string]: string;
}

describe("App Module", () => {
  const mockServer = setupServer();

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url}`);
      },
    });
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  describe("onApplicationBootstrap hook", () => {
    afterEach(() => {
      mockServer.resetHandlers();
    });

    it("should prevent the app from starting if the url of a dependency is not mocked with MSW", async () => {
      expect.assertions(1);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;
      const url = configService
        .get<string>("authorisationApiV2Url")
        .replace(domain, localOrigin);

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url}, shutting down...`,
      );

      await app.close();
    });

    it("should prevent the app from starting if one of the dependencies still responds with a 404 after all the attempts", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;
      const url = configService
        .get<string>("authorisationApiV2Url")
        .replace(domain, localOrigin);

      mockServer.use(
        http.get(url, () => HttpResponse.text("Not Found", { status: 404 })),
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url}, shutting down...`,
      );

      // Retry 30 times -> log 30 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(30);

      await app.close();
    });

    it("should start if all the dependencies are up and running", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;

      const authorisationApiV2Url = `${configService.get<string>(
        "authorisationApiV2Url",
      )}`.replace(domain, localOrigin);

      let reqCounter = 0;
      mockServer.use(
        http.get(authorisationApiV2Url, () => {
          reqCounter += 1;

          // Authorisation API first responds 15 times with a 404 (because it's starting)
          if (reqCounter <= 15) {
            return HttpResponse.text("Not Found", { status: 404 });
          }

          // Then, it responds with a 200
          return HttpResponse.json({});
        }),
      );

      await expect(app.init()).resolves.not.toThrow();

      // Retry 15 times -> log 15 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(15);

      await app.close();
    });
  });

  describe("Generic tests", () => {
    let app: NestFastifyApplication;
    let server: RawServerDefault;
    let configService: ConfigService<ApiConfig, true>;
    const dockerTag = "version";

    beforeAll(async () => {
      process.env.DOCKER_TAG = dockerTag;

      // Start server
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const logger = createLogger();
      const adapter = new FastifyAdapter({
        frameworkErrors: frameworkErrors(logger),
      });
      app =
        moduleFixture.createNestApplication<NestFastifyApplication>(adapter);

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const domain = configService.get<string>("domain");
      const localOrigin = configService.get<string>("localOrigin") || domain;

      // Mock dependencies
      const authorisationApiV2Url = `${configService.get<string>(
        "authorisationApiV2Url",
      )}`.replace(domain, localOrigin);

      mockServer.use(
        http.get(authorisationApiV2Url, () => HttpResponse.json({})),
      );

      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      server = app.getHttpServer();
    });

    afterAll(async () => {
      await app.close();
    });

    describe("GET /", () => {
      it("should return 'ok'", async () => {
        expect.assertions(2);

        const response = await request(server).get("/");

        expect(response.text).toBe("ok");
        expect(response.status).toBe(200);
      });
    });

    describe("GET /unknown-route", () => {
      it("should return an error", async () => {
        expect.assertions(2);

        const response = await request(server).get("/unknown-route").send();

        expect(response.body).toStrictEqual({
          detail: "Cannot GET /unknown-route",
          status: 404,
          title: "Not Found",
          type: "about:blank",
        });
        expect(response.status).toBe(404);
      });

      it("should provide EBSI image version/tag in headers", async () => {
        expect.assertions(2);
        const response = await request(server).get("/heal").send();
        const headers = response.header as ResponseHeaders;
        expect(headers).toHaveProperty("ebsi-image-tag");
        expect(headers["ebsi-image-tag"]).toBe(dockerTag);
      });

      it("should not display the framework in the error message", async () => {
        expect.assertions(2);
        const response = await request(server).get("/%91").send();
        expect(response.body).toStrictEqual({
          title: "Bad Request",
          detail: "/%91 is not a valid url component",
          status: 400,
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });
    });

    describe("GET /health", () => {
      it("should provide EBSI image version/tag in headers", async () => {
        expect.assertions(2);

        const localOrigin =
          configService.get<string>("localOrigin") ||
          configService.get<string>("domain");

        // All the dependencies return a 200
        const dependencies = Object.keys(
          DEPENDENCIES,
        ) as (keyof typeof DEPENDENCIES)[];

        mockServer.use(
          ...dependencies.map((dependency) =>
            http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
              HttpResponse.json({}),
            ),
          ),
        );

        const response = await request(server).get("/health").send();
        const headers = response.header as ResponseHeaders;
        expect(headers).toHaveProperty("ebsi-image-tag");
        expect(headers["ebsi-image-tag"]).toBe(dockerTag);
      });
    });
  });
});
