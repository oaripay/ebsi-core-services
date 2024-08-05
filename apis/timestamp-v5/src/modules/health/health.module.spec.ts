import {
  vi,
  describe,
  beforeAll,
  it,
  expect,
  afterEach,
  afterAll,
} from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { HealthIndicatorResult } from "@nestjs/terminus";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { DEPENDENCIES, type ApiConfig } from "../../config/configuration.js";
import { HealthModule } from "./health.module.js";

describe("Health Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig, true>;
  let localOrigin: string;
  const dependencies = Object.keys(
    DEPENDENCIES,
  ) as (keyof typeof DEPENDENCIES)[];
  const mockServer = setupServer();

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
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);

    localOrigin =
      configService.get<string>("localOrigin") ||
      configService.get<string>("domain");
  });

  afterEach(() => {
    mockServer.resetHandlers();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("GET /health", () => {
    it("should return 'ok' if all the dependencies return a 20x", async () => {
      expect.assertions(3 + dependencies.length);

      // All the dependencies return a 200
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
            HttpResponse.json({}),
          ),
        ),
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}),
        ),
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}),
        ),
      );

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every dependency
      dependencies.forEach((dependency) => {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}${DEPENDENCIES[dependency]}`,
        });
      });
      expect(spy).toHaveBeenCalledWith({
        url: configService.get<string>("besuReadinessEndpoint"),
      });

      // Expect all the dependencies to be up
      const expectedStatuses = ([...dependencies, "Besu"] as const)
        .map((dependency) => ({
          [`${dependency}`]: { status: "up" },
        }))
        .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {});

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {},
        info: expectedStatuses,
        status: "ok",
      });
      expect(response.status).toBe(200);
    });

    it("should return 'error' if some dependencies do not return a 20x", async () => {
      expect.assertions(3 + dependencies.length);

      // All the dependencies return a 200 except Authorisation API v5
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
            dependency === "Authorisation API v5"
              ? HttpResponse.json({}, { status: 500 })
              : HttpResponse.json({}),
          ),
        ),
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}),
        ),
      );

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every dependency
      dependencies.forEach((dependency) => {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}${DEPENDENCIES[dependency]}`,
        });
      });
      expect(spy).toHaveBeenCalledWith({
        url: configService.get<string>("besuReadinessEndpoint"),
      });

      // Expect all the dependencies to be up except Authorisation API v5
      const expectedStatuses = ([...dependencies, "Besu"] as const)
        .map(
          (dependency) =>
            ({
              [`${dependency}`]:
                dependency === "Authorisation API v5"
                  ? ({
                      message: "Request failed with status code 500",
                      status: "down",
                      statusCode: 500,
                      statusText: "Internal Server Error",
                    } as const)
                  : ({ status: "up" } as const),
            }) satisfies HealthIndicatorResult,
        )
        .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {});

      const { "Authorisation API v5": errorStatus, ...otherStatuses } =
        expectedStatuses;

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {
          "Authorisation API v5": errorStatus,
        },
        info: otherStatuses,
        status: "error",
      });
      expect(response.status).toBe(503);
    });

    it("should return 'error' if Besu readiness endpoint returns 503", async () => {
      expect.assertions(3 + dependencies.length);

      // All the dependencies return a 200 except Besu readiness (503)
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
            HttpResponse.json({}),
          ),
        ),
        http.get(configService.get<string>("besuReadinessEndpoint"), () =>
          HttpResponse.json({}, { status: 503 }),
        ),
      );

      const spy = vi.spyOn(httpService, "request");

      const response = await request(server).get("/health").send();

      // Expect httpService.request to have been called for every dependency
      dependencies.forEach((dependency) => {
        expect(spy).toHaveBeenCalledWith({
          url: `${localOrigin}${DEPENDENCIES[dependency]}`,
        });
      });
      expect(spy).toHaveBeenCalledWith({
        url: configService.get<string>("besuReadinessEndpoint"),
      });

      // Expect all the dependencies to be up except Besu
      const expectedStatuses = ([...dependencies, "Besu"] as const)
        .map(
          (dependency) =>
            ({
              [`${dependency}`]:
                dependency === "Besu"
                  ? ({
                      message: "Request failed with status code 503",
                      status: "down",
                      statusCode: 503,
                      statusText: "Service Unavailable",
                    } as const)
                  : ({ status: "up" } as const),
            }) satisfies HealthIndicatorResult,
        )
        .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {});

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
  });
});
