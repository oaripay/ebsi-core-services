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
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import type { ApiConfig } from "./config/configuration.js";

interface ResponseHeaders {
  "ebsi-image-tag": string;
  [key: string]: string;
}

describe("App Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let configService: ConfigService<ApiConfig, true>;
  const dockerTag = "version";
  const mockServer = setupServer();

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (url.hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url.href}`);
      },
    });
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

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const url = new URL(
        `${configService.get<string>("ledgerApiUrl")}/health`,
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url.href}, shutting down...`,
      );
    });

    it("should prevent the app from starting if one of the dependencies still responds with a 404 after all the attempts", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const url = `${configService.get<string>("ledgerApiUrl")}/health`;

      mockServer.use(
        rest.get(url, (_req, res, ctx) =>
          res(ctx.status(404), ctx.text("Not Found")),
        ),
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url}, shutting down...`,
      );

      // Retry 30 times -> log 30 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(30);
    });

    it("should start if all the dependencies are up and running", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const ledgerApiUrl = `${configService.get<string>(
        "ledgerApiUrl",
      )}/health`;
      const authorisationApiV2Url = `${configService.get<string>(
        "authorisationApiV2Url",
      )}/health`;

      // Ledger API first responds 15 times with a 404 (because it's starting)
      let reqCounter = 0;
      mockServer.use(
        rest.get(ledgerApiUrl, (_req, res, ctx) => {
          reqCounter += 1;

          // Ledger API first responds 15 times with a 404 (because it's starting)
          if (reqCounter <= 15) {
            return res(ctx.status(404), ctx.text("Not Found"));
          }

          // Then, it responds with a 200
          return res(ctx.status(200), ctx.json({}));
        }),
        rest.get(authorisationApiV2Url, (_req, res, ctx) => res(ctx.json({}))),
      );

      await expect(app.init()).resolves.not.toThrow();

      // Retry 15 times -> log 15 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(15);

      // Close the app
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500);
      });
      await app.close();
    });
  });

  describe("Generic tests", () => {
    beforeAll(async () => {
      process.env.DOCKER_TAG = dockerTag;

      // Start server
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      // Mock dependencies
      const ledgerApiUrl = `${configService.get<string>(
        "ledgerApiUrl",
      )}/health`;
      const authorisationApiV2Url = `${configService.get<string>(
        "authorisationApiV2Url",
      )}/health`;

      mockServer.use(
        rest.get(ledgerApiUrl, (_req, res, ctx) => res(ctx.json({}))),
        rest.get(authorisationApiV2Url, (_req, res, ctx) => res(ctx.json({}))),
      );

      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      server = app.getHttpServer();
    });

    afterAll(async () => {
      // Avoid vi open handle error
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500);
      });
      await app.close();
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
    });

    describe("GET /health", () => {
      it("should provide EBSI image version/tag in headers", async () => {
        expect.assertions(2);
        const response = await request(server).get("/health").send();
        const headers = response.header as ResponseHeaders;
        expect(headers).toHaveProperty("ebsi-image-tag");
        expect(headers["ebsi-image-tag"]).toBe(dockerTag);
      });
    });
  });
});
