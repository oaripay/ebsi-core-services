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
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AppModule } from "../app.module.js";
import { AllExceptionsFilter } from "../filters/http-exception.filter.js";
import { DEPENDENCIES, type ApiConfig } from "../config/configuration.js";

describe("Logging interceptor", () => {
  let app: NestFastifyApplication;
  let configService: ConfigService<ApiConfig, true>;
  const mockServer = setupServer();

  const mockedLogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

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

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(mockedLogger);

    // Mock dependencies
    const domain = configService.get<string>("domain");
    const localOrigin = configService.get<string>("localOrigin") || domain;

    const ledgerApiUrl = `${configService.get<string>(
      "ledgerApiUrl",
    )}/health`.replace(domain, localOrigin);
    const authorisationApiUrl = `${configService.get<string>(
      "authorisationApiUrl",
    )}/health`.replace(domain, localOrigin);

    mockServer.use(
      http.get(ledgerApiUrl, () => HttpResponse.json({})),
      http.get(authorisationApiUrl, () => HttpResponse.json({})),
    );

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
        },
        "LoggingInterceptor - 200 - GET - /health",
        "LoggingInterceptor",
      );
    });
  });

  describe("POST /jsonrpc with bad payload", () => {
    it("should log the request and response", async () => {
      expect.assertions(2);

      // Mock Auth API
      const authApiKeyPair = await generateKeyPair("ES256");
      const authorisationApiUrl = configService.get<string>(
        "authorisationApiUrl",
      );
      const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
      const kid = await calculateJwkThumbprint(publicKeyJwk);

      mockServer.use(
        // Mock Auth API v3 /.well-known/openid-configuration endpoint
        http.get(
          `${authorisationApiUrl}/.well-known/openid-configuration`,
          () => HttpResponse.json({ jwks_uri: `${authorisationApiUrl}/jwks` }),
        ),
        // Mock Auth API v3 /jwks endpoint
        http.get(`${authorisationApiUrl}/jwks`, () =>
          HttpResponse.json({
            keys: [{ ...publicKeyJwk, kid }],
          }),
        ),
      );

      const controllerDid = EbsiWallet.createDid();
      const userAccessToken = await new SignJWT({
        sub: controllerDid,
        scp: "openid tir_invite",
      })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid,
        })
        .sign(authApiKeyPair.privateKey);

      await request(app.getHttpServer())
        .post("/jsonrpc")
        .auth(userAccessToken, { type: "bearer" })
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
            authorization: `Bearer ${userAccessToken}`,
            connection: "close",
            "content-length": "12",
            "content-type": "application/x-www-form-urlencoded",
            host: expect.stringContaining("127.0.0.1:"),
          },
          message: "Incoming request - POST - /jsonrpc",
          method: "POST",
        },
        "LoggingInterceptor - POST - /jsonrpc",
        "LoggingInterceptor",
      );

      // It should have logged the response
      expect(mockedLogger.warn).toHaveBeenNthCalledWith(
        warnCalls,
        {
          body: {
            "invalid body": "",
          },
          error: expect.any(Error),
          message: "Outgoing response - 400 - POST - /jsonrpc",
          method: "POST",
          url: "/jsonrpc",
        },
        "LoggingInterceptor - 400 - POST - /jsonrpc",
        "LoggingInterceptor",
      );
    });
  });
});
