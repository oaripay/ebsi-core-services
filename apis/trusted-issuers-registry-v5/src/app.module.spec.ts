import {
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  afterEach,
  jest,
} from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import nock from "nock";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { ApiConfig } from "./config/configuration";

interface ResponseHeaders {
  "ebsi-image-tag": string;
  [key: string]: string;
}

describe("App Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig, true>;
  const dockerTag = "version";

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Disable external requests
    nock.disableNetConnect();
    // Allow localhost connections so we can test local routes and mock servers.
    nock.enableNetConnect("127.0.0.1");
  });

  afterAll(() => {
    nock.restore();
  });

  describe("onApplicationBootstrap hook", () => {
    afterEach(() => {
      nock.cleanAll();
    });

    it("should prevent the app from starting if the url of a dependency is not mocked with nock", async () => {
      expect.assertions(1);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter()
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const url = new URL(
        `${configService.get<string>("ledgerApiUrl")}/health`
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url.href}, shutting down...`
      );
    });

    it("should prevent the app from starting if one of the dependencies still responds with a 404 after all the attempts", async () => {
      expect.assertions(2);

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter()
      );

      const mockedLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const url = new URL(
        `${configService.get<string>("ledgerApiUrl")}/health`
      );

      nock(url.origin).get(url.pathname).reply(404, "Not Found").persist();

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${url.href}, shutting down...`
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
        new FastifyAdapter()
      );

      const mockedLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const ledgerApiUrl = new URL(
        `${configService.get<string>("ledgerApiUrl")}/health`
      );
      const authorisationApiUrl = new URL(
        `${configService.get<string>("authorisationApiUrl")}/health`
      );

      // Ledger API first responds 15 times with a 404 (because it's starting)
      nock(ledgerApiUrl.origin)
        .get(ledgerApiUrl.pathname)
        .times(15)
        .reply(404, "Not Found");
      // Then, it responds with a 200
      nock(ledgerApiUrl.origin).get(ledgerApiUrl.pathname).reply(200).persist();
      nock(authorisationApiUrl.origin)
        .get(authorisationApiUrl.pathname)
        .reply(200)
        .persist();

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
        new FastifyAdapter()
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      // Mock dependencies
      const ledgerApiUrl = new URL(
        `${configService.get<string>("ledgerApiUrl")}/health`
      );
      const authorisationApiUrl = new URL(
        `${configService.get<string>("authorisationApiUrl")}/health`
      );

      nock(ledgerApiUrl.origin).get(ledgerApiUrl.pathname).reply(200).persist();
      nock(authorisationApiUrl.origin)
        .get(authorisationApiUrl.pathname)
        .reply(200)
        .persist();

      await app.init();
      await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
      server = app.getHttpServer() as HttpServer;
    });

    afterAll(async () => {
      // Avoid jest open handle error
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
