import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { of } from "rxjs";
import { HttpService } from "@nestjs/axios";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { JWTPayload, Session as OAuth2Session } from "@cef-ebsi/oauth2-auth";
import { AppModule } from "../app.module";
import { AllExceptionsFilter } from "../filters/http-exception.filter";
import { createFakeToken } from "../../tests/utils/authorisation";
import { FabricService } from "../modules/fabric/fabric.service";
import { ApiConfig } from "../config/configuration";

jest.setTimeout(120000);

describe("Logging interceptor", () => {
  let app: INestApplication;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig>;

  const mockedLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeAll(async () => {
    // Don't load the actual config files
    jest
      .spyOn(FabricService, "importIdentityWallet")
      .mockImplementation(() => ({
        type: "X.509",
        credentials: {
          certificate: "",
          privateKey: "",
        },
        mspId: "",
      }));
    jest
      .spyOn(FabricService, "importConnectionProfile")
      .mockImplementation(() => ({
        channels: {},
        client: {
          adminCredential: {},
        },
        organizations: {
          betaxiossdrpoc: {
            adminPrivateKey: {},
          },
        },
      }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    configService = app.get<ConfigService<ApiConfig>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
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

  describe("POST /blockchains/besu with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      jest
        .spyOn(OAuth2Session.prototype, "verifyAccessToken")
        .mockImplementation(
          async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
        );

      const tokenOAuth2 = await createFakeToken("oauth2");

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
            host: expect.stringContaining("127.0.0.1:") as string,
          },
          message: "Incoming request - POST - /blockchains/besu",
          method: "POST",
        },
        "LoggingInterceptor - POST - /blockchains/besu",
        "LoggingInterceptor"
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
          error: expect.any(Error) as Error,
          message: "Outgoing response - 400 - POST - /blockchains/besu",
          method: "POST",
          url: "/blockchains/besu",
        },
        "LoggingInterceptor - 400 - POST - /blockchains/besu",
        "LoggingInterceptor"
      );
    });
  });
});
