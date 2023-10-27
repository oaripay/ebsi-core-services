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
import { HttpService } from "@nestjs/axios";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { of } from "rxjs";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import type { ApiConfig } from "./config/configuration.js";

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

      const url = `${configService.get<string>("ledgerApiUrl")}/health`;

      mockServer.use(
        http.get(url, () => HttpResponse.text("Not Found", { status: 404 })),
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

      const ledgerApiUrl = `${configService.get<string>(
        "ledgerApiUrl",
      )}/health`;
      const authorisationApiUrl = `${configService.get<string>(
        "authorisationApiUrl",
      )}/health`;

      // Ledger API first responds 15 times with a 404 (because it's starting)
      let reqCounter = 0;
      mockServer.use(
        http.get(ledgerApiUrl, () => {
          reqCounter += 1;

          // Ledger API first responds 15 times with a 404 (because it's starting)
          if (reqCounter <= 15) {
            return HttpResponse.text("Not Found", { status: 404 });
          }

          // Then, it responds with a 200
          return HttpResponse.json({});
        }),
        http.get(authorisationApiUrl, () => HttpResponse.json({})),
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
    let app: NestFastifyApplication;
    let server: RawServerDefault;
    let httpService: HttpService;
    let configService: ConfigService<ApiConfig, true>;
    const dockerTag = "version";

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
      const authorisationApiUrl = `${configService.get<string>(
        "authorisationApiUrl",
      )}/health`;

      mockServer.use(
        http.get(ledgerApiUrl, () => HttpResponse.json({})),
        http.get(authorisationApiUrl, () => HttpResponse.json({})),
      );

      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      server = app.getHttpServer();
      httpService = await moduleFixture.resolve<HttpService>(HttpService);
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

        vi.spyOn(httpService, "request")
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          .mockImplementation(() => of({}));

        const response = await request(server).get("/health").send();
        const headers = response.header as ResponseHeaders;
        expect(headers).toHaveProperty("ebsi-image-tag");
        expect(headers["ebsi-image-tag"]).toBe(dockerTag);
      });
    });
  });
});
