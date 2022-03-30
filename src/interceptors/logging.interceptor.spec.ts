import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import { of } from "rxjs";
import { HttpService } from "@nestjs/axios";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import type { JWTVerifyResult } from "jose";
import { AppModule } from "../app.module";
import { AllExceptionsFilter } from "../filters/http-exception.filter";

jest.setTimeout(120000);

jest.mock("@cef-ebsi/siop-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/siop-auth");

  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: async () =>
      Promise.resolve({ payload: {} } as JWTVerifyResult),
  };
});

describe("Logging interceptor", () => {
  let app: INestApplication;
  let httpService: HttpService;

  const mockedLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(mockedLogger);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      jest
        .spyOn(httpService, "request")
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .mockImplementation(() => of({}));

      await request(app.getHttpServer()).get("/health");

      const calls = mockedLogger.log.mock.calls.length;

      // It should have logged the request
      expect(mockedLogger.log).toHaveBeenNthCalledWith(
        calls - 1,
        {
          body: null,
          headers: {
            "accept-encoding": "gzip, deflate",
            connection: "close",
            host: expect.stringContaining("127.0.0.1:") as string,
          },
          message: "Incoming request - GET - /health",
          method: "GET",
        },
        "LoggingInterceptor - GET - /health",
        "LoggingInterceptor"
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
        "LoggingInterceptor"
      );
    });
  });

  describe("POST /attributes with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      await request(app.getHttpServer())
        .post("/attributes")
        .auth("token", { type: "bearer" })
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
            authorization: "Bearer token",
            connection: "close",
            "content-length": "12",
            "content-type": "application/x-www-form-urlencoded",
            host: expect.stringContaining("127.0.0.1:") as string,
          },
          message: "Incoming request - POST - /attributes",
          method: "POST",
        },
        "LoggingInterceptor - POST - /attributes",
        "LoggingInterceptor"
      );

      // It should have logged the response
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        warnCalls,
        {
          body: {
            "invalid body": "",
          },
          error: expect.any(Error) as Error,
          message: "Outgoing response - 400 - POST - /attributes",
          method: "POST",
          url: "/attributes",
        },
        "LoggingInterceptor - 400 - POST - /attributes",
        "LoggingInterceptor"
      );
    });
  });
});
