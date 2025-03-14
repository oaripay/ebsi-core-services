import type { PaginatedList } from "@ebsiint-api/shared";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";

import {
  frameworkErrors,
  methodNotAllowed,
  multibase,
} from "@ebsiint-api/shared";
import { Timestamp__factory } from "@ebsiint-sc/timestamp-v2";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ethers } from "ethers";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ApiConfig } from "./config/configuration.ts";
import type { AppendRecordVersionHashesSchema } from "./modules/jsonrpc/validators/RequestAppendRecordVersionHashes.ts";
import type { TimestampRecordHashesSchema } from "./modules/jsonrpc/validators/RequestTimestampRecordHashes.ts";
import type { TimestampRecordVersionHashesSchema } from "./modules/jsonrpc/validators/RequestTimestampRecordVersionHashes.ts";
import type { UnsignedTransactionSchema } from "./modules/jsonrpc/validators/UnsignedTransaction.ts";
import type { RecordLink } from "./modules/records/records.interface.ts";

import { createHash, setupTestEnv } from "../tests/utils/timestamp.ts";
import { AppModule } from "./app.module.ts";
import {
  BOOTSTRAP_DEPENDENCIES,
  RUNTIME_DEPENDENCIES,
} from "./config/configuration.ts";
import { AllExceptionsFilter } from "./filters/http-exception.filter.ts";
import { createLogger } from "./logger/logger.ts";
import { formatEthersUnsignedTransaction } from "./modules/jsonrpc/jsonrpc.utils.ts";
import { LedgerService } from "./modules/ledger/ledger.service.ts";

describe("App Module", () => {
  const mockServer = setupServer();
  const bootstrapDependencies = Object.keys(
    BOOTSTRAP_DEPENDENCIES,
  ) as (keyof typeof BOOTSTRAP_DEPENDENCIES)[];
  const runtimeDependencies = Object.keys(
    RUNTIME_DEPENDENCIES,
  ) as (keyof typeof RUNTIME_DEPENDENCIES)[];

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.error();
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

    it("should prevent the app from starting if a bootstrap dependency triggers a network error", async () => {
      expect.assertions(1);

      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      // Parse "Accept" request header
      await app.register(fastifyAccepts);

      app.useGlobalFilters(new AllExceptionsFilter());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const fastifyInstance = app.getHttpAdapter().getInstance();
      fastifyInstance.addHook("onRequest", methodNotAllowed);

      const domain = configService.get("domain", { infer: true });
      const localOrigin =
        configService.get("localOrigin", { infer: true }) ?? domain;

      // All the dependencies return a 200 except Authorisation API
      mockServer.use(
        ...bootstrapDependencies.map((dependency) => {
          return http.get(
            `${localOrigin}/${dependency}/${BOOTSTRAP_DEPENDENCIES[dependency]}`,
            () =>
              dependency === "authorisation"
                ? HttpResponse.error()
                : HttpResponse.json({}),
          );
        }),
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${localOrigin}/authorisation/${BOOTSTRAP_DEPENDENCIES.authorisation}, shutting down...`,
      );

      await app.close();
    });

    it("should prevent the app from starting if one of the bootstrap dependencies still responds with a 404 after all the attempts", async () => {
      expect.assertions(2);

      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        error: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      // Parse "Accept" request header
      await app.register(fastifyAccepts);

      app.useGlobalFilters(new AllExceptionsFilter());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const fastifyInstance = app.getHttpAdapter().getInstance();
      fastifyInstance.addHook("onRequest", methodNotAllowed);

      const domain = configService.get("domain", { infer: true });
      const localOrigin =
        configService.get("localOrigin", { infer: true }) ?? domain;

      mockServer.use(
        ...bootstrapDependencies.map((dependency) => {
          return http.get(
            `${localOrigin}/${dependency}/${BOOTSTRAP_DEPENDENCIES[dependency]}`,
            () =>
              dependency === "authorisation"
                ? HttpResponse.text("Not Found", { status: 404 })
                : HttpResponse.json({}),
          );
        }),
      );

      await expect(() => app.init()).rejects.toThrow(
        `Unable to get ${localOrigin}/authorisation/${BOOTSTRAP_DEPENDENCIES.authorisation}, shutting down...`,
      );

      // Retry 30 times -> log 30 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(30);

      await app.close();
    });

    it("should start if all the bootstrap dependencies are up and running", async () => {
      expect.assertions(2);

      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      const mockedLogger = {
        error: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
      };
      Logger.overrideLogger(mockedLogger);

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

      // Parse "Accept" request header
      await app.register(fastifyAccepts);

      app.useGlobalFilters(new AllExceptionsFilter());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      const fastifyInstance = app.getHttpAdapter().getInstance();
      fastifyInstance.addHook("onRequest", methodNotAllowed);

      const domain = configService.get("domain", { infer: true });
      const localOrigin =
        configService.get("localOrigin", { infer: true }) ?? domain;

      let reqCounter = 0;

      mockServer.use(
        ...bootstrapDependencies.map((dependency) => {
          return http.get(
            `${localOrigin}/${dependency}/${BOOTSTRAP_DEPENDENCIES[dependency]}`,
            () => {
              if (dependency === "authorisation") {
                reqCounter += 1;

                // Authorisation API first responds 15 times with a 404 (because it's starting)
                if (reqCounter <= 15) {
                  return HttpResponse.text("Not Found", { status: 404 });
                }

                // Then, it responds with a 200
                return HttpResponse.json({});
              }

              // All other dependencies respond with a 200
              return HttpResponse.json({});
            },
          );
        }),
      );

      await expect(app.init()).resolves.not.toThrow();

      // Retry 15 times -> log 15 errors
      expect(mockedLogger.error).toHaveBeenCalledTimes(15);

      await app.close();
    });
  });

  describe("Generic tests", () => {
    const mockedLogger = {
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };

    async function startApp() {
      // Start server
      const moduleFixture = await Test.createTestingModule({
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

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

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

      const domain = configService.get("domain", { infer: true });
      const localOrigin =
        configService.get("localOrigin", { infer: true }) ?? domain;

      // Mock dependencies
      const authorisationApiUrl =
        `${configService.get("authorisationApiUrl", { infer: true })}`.replace(
          domain,
          localOrigin,
        );

      mockServer.use(
        http.get(authorisationApiUrl, () => HttpResponse.json({})),
      );

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

        const response = await request(server).get("");

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
          detail: "/%91 is not a valid url component",
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        await app.close();
      });

      it("should return an error 405 if called with a method different from GET", async () => {
        expect.assertions(16);

        const app = await startApp();
        const server = app.getHttpServer();

        // POST
        let response = await request(server).post("");

        expect(response.body).toStrictEqual({
          detail: "Cannot POST /. Allowed HTTP methods: GET, HEAD",
          status: 405,
          title: "Method Not Allowed",
          type: "about:blank",
        });
        expect(response.headers["allow"]).toStrictEqual("GET, HEAD");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // HEAD
        response = await request(server).head("");

        expect(response.body).toStrictEqual({}); // HEAD response body is empty
        expect(response.headers["content-type"]).toStrictEqual(
          "text/plain; charset=utf-8",
        );
        expect(response.status).toBe(200);

        // PUT
        response = await request(server).put("");

        expect(response.body).toStrictEqual({
          detail: "Cannot PUT /. Allowed HTTP methods: GET, HEAD",
          status: 405,
          title: "Method Not Allowed",
          type: "about:blank",
        });
        expect(response.headers["allow"]).toStrictEqual("GET, HEAD");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // PATCH
        response = await request(server).patch("");

        expect(response.body).toStrictEqual({
          detail: "Cannot PATCH /. Allowed HTTP methods: GET, HEAD",
          status: 405,
          title: "Method Not Allowed",
          type: "about:blank",
        });
        expect(response.headers["allow"]).toStrictEqual("GET, HEAD");
        expect(response.headers["content-type"]).toStrictEqual(
          "application/problem+json; charset=utf-8",
        );
        expect(response.status).toBe(405);

        // Check logs
        expect(mockedLogger.error.mock.calls).toStrictEqual([
          [
            "Cannot POST /. Allowed HTTP methods: GET, HEAD",
            expect.stringContaining(
              "MethodNotAllowedError: Method Not Allowed",
            ),
            "AllExceptionsFilter",
          ],
          [
            "Cannot PUT /. Allowed HTTP methods: GET, HEAD",
            expect.stringContaining(
              "MethodNotAllowedError: Method Not Allowed",
            ),
            "AllExceptionsFilter",
          ],
          [
            "Cannot PATCH /. Allowed HTTP methods: GET, HEAD",
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

    describe("GET /abi", () => {
      it("should not log the request and return the ABI", async () => {
        expect.assertions(5);

        vi.stubEnv("LOG_LEVEL", "debug");

        const app = await startApp();
        const server = app.getHttpServer();

        const response = await request(server).get("/abi");

        expect(response.body).toStrictEqual(Timestamp__factory.abi);
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

        const localOrigin =
          configService.get("localOrigin", { infer: true }) ??
          configService.get("domain", { infer: true });

        // All the dependencies return a 200
        mockServer.use(
          ...runtimeDependencies.map((dependency) =>
            http.get(
              `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
              () => HttpResponse.json({}),
            ),
          ),
          http.get(
            configService.get("besuReadinessEndpoint", { infer: true }),
            () => HttpResponse.json({}),
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

        const localOrigin =
          configService.get("localOrigin", { infer: true }) ??
          configService.get("domain", { infer: true });

        // All the dependencies return a 200
        mockServer.use(
          ...runtimeDependencies.map((dependency) =>
            http.get(
              `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
              () => HttpResponse.json({}),
            ),
          ),
          http.get(
            configService.get("besuReadinessEndpoint", { infer: true }),
            () => HttpResponse.json({}),
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

        const localOrigin =
          configService.get("localOrigin", { infer: true }) ??
          configService.get("domain", { infer: true });

        // All the dependencies return a 200
        mockServer.use(
          ...runtimeDependencies.map((dependency) =>
            http.get(
              `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
              () => HttpResponse.json({}),
            ),
          ),
          http.get(
            configService.get("besuReadinessEndpoint", { infer: true }),
            () => HttpResponse.json({}),
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
        const expectedStatuses = {
          ...runtimeDependencies
            .map((dependency) => ({
              [`${dependency}@${RUNTIME_DEPENDENCIES[dependency]}`]: {
                status: "up",
              },
            }))
            .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {}),
          Besu: { status: "up" },
        };

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

  describe("Version with multiple hashes", () => {
    const mockedLogger = {
      error: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };

    const testUser = {
      did: "did:ebsi:user",
      token: "",
      wallet: ethers.Wallet.createRandom(),
    };

    async function startApp() {
      // Start server
      const moduleFixture = await Test.createTestingModule({
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

      const configService =
        app.get<ConfigService<ApiConfig, true>>(ConfigService);

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

      const domain = configService.get("domain", { infer: true });
      const localOrigin =
        configService.get("localOrigin", { infer: true }) ?? domain;

      // Generate key pair for Authorisation API v4 and create access token
      const authApiKeyPair = await generateKeyPair("ES256");
      const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
      const authApiKid = await calculateJwkThumbprint(publicKeyJwk);

      // Mock dependencies
      const authorisationApiUrl1 = `${configService.get("authorisationApiUrl", { infer: true })}`;
      const authorisationApiUrl2 =
        `${configService.get("authorisationApiUrl", { infer: true })}`.replace(
          domain,
          localOrigin,
        );
      const didRegistryApiUrl = configService.get("didRegistryApiUrl", {
        infer: true,
      });

      mockServer.use(
        http.get(authorisationApiUrl1, () => HttpResponse.json({})),
        // Mock Auth API /.well-known/openid-configuration endpoint
        http.get(
          `${authorisationApiUrl1}/.well-known/openid-configuration`,
          () => HttpResponse.json({ jwks_uri: `${authorisationApiUrl1}/jwks` }),
        ),
        // Mock Auth API /jwks endpoint
        http.get(`${authorisationApiUrl1}/jwks`, () =>
          HttpResponse.json({ keys: [{ ...publicKeyJwk, kid: authApiKid }] }),
        ),
        http.get(authorisationApiUrl2, () => HttpResponse.json({})),
        // Mock Auth API /.well-known/openid-configuration endpoint
        http.get(
          `${authorisationApiUrl2}/.well-known/openid-configuration`,
          () => HttpResponse.json({ jwks_uri: `${authorisationApiUrl2}/jwks` }),
        ),
        // Mock Auth API /jwks endpoint
        http.get(`${authorisationApiUrl2}/jwks`, () =>
          HttpResponse.json({ keys: [{ ...publicKeyJwk, kid: authApiKid }] }),
        ),
        // Mock DIDR API /identifiers/:did/actions endpoint
        http.post(`${didRegistryApiUrl}/identifiers/:did/actions`, () => {
          return HttpResponse.json({ jsonrpc: "2.0", result: true });
        }),
      );

      const newUserTimestampWriteAccessToken = await new SignJWT({
        scp: "openid timestamp_write",
        sub: testUser.did,
      })
        .setProtectedHeader({
          alg: "ES256",
          kid: authApiKid,
          typ: "JWT",
        })
        .sign(authApiKeyPair.privateKey);

      testUser.token = newUserTimestampWriteAccessToken;

      await app.init();
      await fastifyInstance.ready();
      return app;
    }

    afterEach(() => {
      vi.clearAllMocks();
      vi.unstubAllEnvs();
      mockServer.resetHandlers();
    });

    it("should test the case where a version has multiple hashes", async () => {
      expect.assertions(31);

      // Spin up test blockchain (hardhat)
      const testEnv = await setupTestEnv({ hashAlgorithmsTotal: 11 });
      const timestampContract = testEnv.timestampContract;
      const provider = testEnv.provider;

      const timestampContractAddress = await timestampContract.getAddress();

      vi.stubEnv("CONTRACT_ADDR", timestampContractAddress);

      // Mock Timestamp contract
      vi.spyOn(Timestamp__factory, "connect").mockImplementation(() =>
        // Create new instance without runner (provider)
        timestampContract.connect(),
      );

      // Mock LedgerService
      vi.spyOn(LedgerService.prototype, "getProvider").mockImplementation(
        // @ts-expect-error Error due to a mismatch between ESM and CommonJS modules
        () => provider,
      );

      const app = await startApp();
      const server = app.getHttpServer();

      async function sendTransaction(
        method: string,
        param:
          | AppendRecordVersionHashesSchema
          | TimestampRecordHashesSchema
          | TimestampRecordVersionHashesSchema,
      ): Promise<void> {
        const responseBuild = await request(server)
          .post("/jsonrpc")
          .auth(testUser.token, { type: "bearer" })
          .send({
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param],
          });

        expect(responseBuild.body).toStrictEqual({
          id: 231,
          jsonrpc: "2.0",
          result: {
            chainId: expect.any(String),
            data: expect.any(String),
            from: param.from,
            gasLimit: expect.any(String),
            gasPrice: expect.any(String),
            nonce: expect.any(String),
            to: expect.any(String),
            value: "0x0",
          },
        });

        const { result: unsignedTransaction } = responseBuild.body as {
          result: UnsignedTransactionSchema;
        };
        const uTx = formatEthersUnsignedTransaction(unsignedTransaction);

        const sgnTx = await testUser.wallet.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        await request(server)
          .post("/jsonrpc")
          .auth(testUser.token, { type: "bearer" })
          .send({
            id: "45",
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                r,
                s,
                signedRawTransaction: sgnTx,
                unsignedTransaction,
                v: `0x${v.toString(16)}`,
              },
            ],
          });
      }

      const hashesFirstVersion = testEnv.hashAlgorithms.map((h) => {
        return createHash(h.ianaName);
      });

      // register a new record with 1 version.
      // this version contains 3 hashes
      let hashValues = hashesFirstVersion.slice(0, 3);
      await sendTransaction("timestampRecordHashes", {
        from: testUser.wallet.address,
        hashAlgorithmIds: [0, 1, 2],
        hashValues,
        timestampData: hashValues.map(
          (h) =>
            `0x${Buffer.from(JSON.stringify({ test: h })).toString("hex")}`,
        ),
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ test: 54 }),
          "utf8",
        ).toString("hex")}`,
      } satisfies TimestampRecordHashesSchema);

      const resultRecords = await request(server).get(
        `/records?owner=${testUser.wallet.address}`,
      );
      const [itemRecord] = (resultRecords.body as PaginatedList<RecordLink>)
        .items;
      const { recordId: recordIdEncoded } = itemRecord!;
      const recordId = `0x${Buffer.from(
        multibase.base64url.decode(recordIdEncoded),
      ).toString("hex")}`;

      // get the hashes of the record
      let record = await request(server).get(`/records/${recordIdEncoded}`);
      expect(record.body).toStrictEqual({
        firstVersionTimestamps: hashesFirstVersion.slice(0, 3),
        lastVersionTimestamps: hashesFirstVersion.slice(0, 3),
        ownerIds: [testUser.wallet.address.toLowerCase()],
        revokedOwnerIds: [],
        totalVersions: 1,
      });

      // append more hashes to the version
      hashValues = hashesFirstVersion.slice(3, 6);
      await sendTransaction("appendRecordVersionHashes", {
        from: testUser.wallet.address,
        hashAlgorithmIds: [3, 4, 5],
        hashValues,
        recordId,
        timestampData: hashValues.map(
          (h) =>
            `0x${Buffer.from(JSON.stringify({ test: h })).toString("hex")}`,
        ),
        versionId: 0,
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ test: 55 }),
          "utf8",
        ).toString("hex")}`,
      } satisfies AppendRecordVersionHashesSchema);

      // get the updates of the record
      record = await request(server).get(`/records/${recordIdEncoded}`);
      expect(record.body).toStrictEqual({
        firstVersionTimestamps: hashesFirstVersion.slice(0, 6),
        lastVersionTimestamps: hashesFirstVersion.slice(0, 6),
        ownerIds: [testUser.wallet.address.toLowerCase()],
        revokedOwnerIds: [],
        totalVersions: 1,
      });

      // append more hashes to the version
      hashValues = hashesFirstVersion.slice(6, 9);
      await sendTransaction("appendRecordVersionHashes", {
        from: testUser.wallet.address,
        hashAlgorithmIds: [6, 7, 8],
        hashValues,
        recordId,
        timestampData: hashValues.map(
          (h) =>
            `0x${Buffer.from(JSON.stringify({ test: h })).toString("hex")}`,
        ),
        versionId: 0,
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ test: 56 }),
          "utf8",
        ).toString("hex")}`,
      } satisfies AppendRecordVersionHashesSchema);

      // get the updates of the record
      record = await request(server).get(`/records/${recordIdEncoded}`);
      expect(record.body).toStrictEqual({
        firstVersionTimestamps: hashesFirstVersion.slice(0, 9),
        lastVersionTimestamps: hashesFirstVersion.slice(0, 9),
        ownerIds: [testUser.wallet.address.toLowerCase()],
        revokedOwnerIds: [],
        totalVersions: 1,
      });

      // append more hashes to the version.
      // this time the it will reach the limit of hashes
      hashValues = hashesFirstVersion.slice(9, 11);
      await sendTransaction("appendRecordVersionHashes", {
        from: testUser.wallet.address,
        hashAlgorithmIds: [9, 10],
        hashValues,
        recordId,
        timestampData: hashValues.map(
          (h) =>
            `0x${Buffer.from(JSON.stringify({ test: h })).toString("hex")}`,
        ),
        versionId: 0,
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ test: 56 }),
          "utf8",
        ).toString("hex")}`,
      } satisfies AppendRecordVersionHashesSchema);

      // get the updates of the record.
      // the new updates are not there because the transaction was rejected
      record = await request(server).get(`/records/${recordIdEncoded}`);
      expect(record.body).toStrictEqual({
        firstVersionTimestamps: hashesFirstVersion.slice(0, 9),
        lastVersionTimestamps: hashesFirstVersion.slice(0, 9),
        ownerIds: [testUser.wallet.address.toLowerCase()],
        revokedOwnerIds: [],
        totalVersions: 1,
      });

      // append 1 hash to reach the limit of 10 hashes
      hashValues = hashesFirstVersion.slice(9, 10);
      await sendTransaction("appendRecordVersionHashes", {
        from: testUser.wallet.address,
        hashAlgorithmIds: [9],
        hashValues,
        recordId,
        timestampData: hashValues.map(
          (h) =>
            `0x${Buffer.from(JSON.stringify({ test: h })).toString("hex")}`,
        ),
        versionId: 0,
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ test: 56 }),
          "utf8",
        ).toString("hex")}`,
      } satisfies AppendRecordVersionHashesSchema);

      // get the updates of the record.
      // the result contains 10 hashes which is the maximum per version
      record = await request(server).get(`/records/${recordIdEncoded}`);
      expect(record.body).toStrictEqual({
        firstVersionTimestamps: hashesFirstVersion.slice(0, 10),
        lastVersionTimestamps: hashesFirstVersion.slice(0, 10),
        ownerIds: [testUser.wallet.address.toLowerCase()],
        revokedOwnerIds: [],
        totalVersions: 1,
      });

      // register 20 more versions
      let hashesLastVersion: string[] = [];
      for (let i = 0; i < 20; i += 1) {
        const hashValues = testEnv.hashAlgorithms.slice(0, 3).map((h) => {
          return createHash(h.ianaName);
        });
        await sendTransaction("timestampRecordVersionHashes", {
          from: testUser.wallet.address,
          hashAlgorithmIds: [0, 1, 2],
          hashValues,
          recordId,
          timestampData: hashValues.map(
            (h) =>
              `0x${Buffer.from(JSON.stringify({ test: h })).toString("hex")}`,
          ),
          versionInfo: `0x${Buffer.from(
            JSON.stringify({ test: 1 }),
            "utf8",
          ).toString("hex")}`,
        } satisfies TimestampRecordVersionHashesSchema);
        // update last hashes
        hashesLastVersion = hashValues;
      }

      // get the updates of the record.
      // now it contains 21 versions: The first version has 10 hashes
      // and the last one has 3 hashes
      record = await request(server).get(`/records/${recordIdEncoded}`);
      expect(record.body).toStrictEqual({
        firstVersionTimestamps: hashesFirstVersion.slice(0, 10),
        lastVersionTimestamps: hashesLastVersion,
        ownerIds: [testUser.wallet.address.toLowerCase()],
        revokedOwnerIds: [],
        totalVersions: 21,
      });

      await app.close();
    });
  });
});
