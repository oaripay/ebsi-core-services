import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { HealthIndicatorResult } from "@nestjs/terminus";
import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { HttpService } from "@nestjs/axios";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { graphql, http, HttpResponse } from "msw";
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

import type { ApiConfig } from "../../config/configuration.ts";

import { RUNTIME_DEPENDENCIES } from "../../config/configuration.ts";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.ts";
import { HealthModule } from "./health.module.ts";

describe("Health Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig, true>;
  let localOrigin: string | undefined;
  const dependencies = Object.keys(
    RUNTIME_DEPENDENCIES,
  ) as (keyof typeof RUNTIME_DEPENDENCIES)[];
  let subgraphTimestamp: number | undefined;
  const mockServer = setupServer(
    graphql.query("GetBlockTimestamp", () => {
      const timestamp = subgraphTimestamp ?? Math.floor(Date.now() / 1000);
      return HttpResponse.json({ data: { _meta: { block: { timestamp } } } });
    }),
  );

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.error();
      },
    });

    const moduleFixture = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    Logger.overrideLogger(false);
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();
    server = app.getHttpServer();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);

    localOrigin =
      configService.get("localOrigin", { infer: true }) ??
      configService.get("domain", { infer: true });
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("GET /health", () => {
    it("should return 'ok' if all the runtime dependencies return a 20x", async () => {
      expect.assertions(3 + dependencies.length);

      // All the runtime dependencies return a 200
      mockServer.use(
        ...dependencies.map((dependency) =>
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

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every runtime dependency
      for (const dependency of dependencies) {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
        });
      }

      expect(spy).toHaveBeenCalledWith({
        url: configService.get("besuReadinessEndpoint", { infer: true }),
      });

      // Expect all the runtime dependencies to be up
      const expectedStatuses = {
        ...dependencies
          .map((dependency) => ({
            [`${dependency}@${RUNTIME_DEPENDENCIES[dependency]}`]: {
              status: "up",
            },
          }))
          .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {}),
        Besu: { status: "up" },
        "TSR Subgraph": { status: "up" },
      };

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {},
        info: expectedStatuses,
        status: "ok",
      });
      expect(response.status).toBe(200);
    });

    it("should return 'error' if some runtime dependencies do not return a 20x", async () => {
      expect.assertions(3 + dependencies.length);

      // All the runtime dependencies return a 200 except Authorisation API v5
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(
            `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
            () =>
              dependency === "authorisation"
                ? HttpResponse.json({}, { status: 500 })
                : HttpResponse.json({}),
          ),
        ),
        http.get(
          configService.get("besuReadinessEndpoint", { infer: true }),
          () => HttpResponse.json({}),
        ),
      );

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every runtime dependency
      for (const dependency of dependencies) {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
        });
      }

      expect(spy).toHaveBeenCalledWith({
        url: configService.get("besuReadinessEndpoint", { infer: true }),
      });

      // Expect all the runtime dependencies to be up except Authorisation API v5
      const expectedStatuses: HealthIndicatorResult = {
        ...dependencies
          .map(
            (dependency) =>
              ({
                [`${dependency}@${RUNTIME_DEPENDENCIES[dependency]}`]:
                  dependency === "authorisation"
                    ? ({
                        message: "Request failed with status code 500",
                        status: "down",
                        statusCode: 500,
                        statusText: "Internal Server Error",
                      } as const)
                    : ({ status: "up" } as const),
              }) satisfies HealthIndicatorResult,
          )
          .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {}),
        Besu: { status: "up" },
        "TSR Subgraph": { status: "up" },
      };

      const { "authorisation@v5": errorStatus, ...otherStatuses } =
        expectedStatuses;

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {
          "authorisation@v5": errorStatus,
        },
        info: otherStatuses,
        status: "error",
      });
      expect(response.status).toBe(503);
    });

    it("should return 'error' if Besu readiness endpoint returns 503", async () => {
      expect.assertions(3 + dependencies.length);

      // All the runtime dependencies return a 200 except Besu readiness (503)
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(
            `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
            () => HttpResponse.json({}),
          ),
        ),
        http.get(
          configService.get("besuReadinessEndpoint", { infer: true }),
          () => HttpResponse.json({}, { status: 503 }),
        ),
      );

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every runtime dependency
      for (const dependency of dependencies) {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
        });
      }

      expect(spy).toHaveBeenCalledWith({
        url: configService.get("besuReadinessEndpoint", { infer: true }),
      });

      // Expect all the runtime dependencies to be up except Besu
      const expectedStatuses = {
        ...dependencies
          .map(
            (dependency) =>
              ({
                [`${dependency}@${RUNTIME_DEPENDENCIES[dependency]}`]: {
                  status: "up",
                } as const,
              }) satisfies HealthIndicatorResult,
          )
          .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {}),
        Besu: {
          message: "Request failed with status code 503",
          status: "down",
          statusCode: 503,
          statusText: "Service Unavailable",
        },
        "TSR Subgraph": { status: "up" },
      } as const satisfies HealthIndicatorResult;

      const { Besu: errorStatus, ...otherStatuses } = expectedStatuses;

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {
          Besu: errorStatus,
        },
        info: otherStatuses,
        status: "error",
      });
      expect(response.status).toBe(503);
    });

    it("should return 'error' if the Subgraph is not synced", async () => {
      expect.assertions(2 + dependencies.length);

      // Old timestamp in the subgraph
      subgraphTimestamp = Math.floor(Date.now() / 1000 - 3600);

      // All the runtime dependencies return a 200 except Besu readiness (503)
      mockServer.use(
        ...dependencies.map((dependency) =>
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

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every runtime dependency
      for (const dependency of dependencies) {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}/${dependency}/${RUNTIME_DEPENDENCIES[dependency]}`,
        });
      }

      // Expect all the runtime dependencies to be up except TSR Subgraph
      const expectedStatuses = {
        ...dependencies
          .map((dependency) => ({
            [`${dependency}@${RUNTIME_DEPENDENCIES[dependency]}`]: {
              status: "up",
            },
          }))
          .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {}),
        Besu: { status: "up" },
        "TSR Subgraph": {
          message: "Not synchronized",
          status: "down",
        },
      };

      const { "TSR Subgraph": errorStatus, ...otherStatuses } =
        expectedStatuses;

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {
          "TSR Subgraph": errorStatus,
        },
        info: otherStatuses,
        status: "error",
      });
      expect(response.status).toBe(503);
    });
  });
});
