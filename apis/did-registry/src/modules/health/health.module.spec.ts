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

describe("HealthController", () => {
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
      expect.assertions(2 + dependencies.length);

      // All the dependencies return a 200
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
            HttpResponse.json({}),
          ),
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

      // Expect all the dependencies to be up
      const expectedStatuses = dependencies
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
      expect.assertions(2 + dependencies.length);

      // All the dependencies return a 200 except Authorisation API v2
      mockServer.use(
        ...dependencies.map((dependency) =>
          http.get(`${localOrigin}${DEPENDENCIES[dependency]}`, () =>
            dependency === "Authorisation API v2"
              ? HttpResponse.json({}, { status: 500 })
              : HttpResponse.json({}),
          ),
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

      // Expect all the dependencies to be up except Authorisation API v2
      const expectedStatuses = dependencies
        .map(
          (dependency) =>
            ({
              [`${dependency}`]:
                dependency === "Authorisation API v2"
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

      const { "Authorisation API v2": errorStatus, ...otherStatuses } =
        expectedStatuses;

      expect(response.body).toStrictEqual({
        details: expectedStatuses,
        error: {
          "Authorisation API v2": errorStatus,
        },
        info: otherStatuses,
        status: "error",
      });
      expect(response.status).toBe(503);
    });
  });
});
