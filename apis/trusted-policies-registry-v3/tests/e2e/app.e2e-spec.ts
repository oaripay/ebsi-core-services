import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { RawServerDefault } from "fastify";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import {
  DEPENDENCIES,
  type ApiConfig,
} from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";

describe("TPR API v3 - Generic tests (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let apiUrlPrefix = "";
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    if (process.env.TEST_ENV === "remote") {
      apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /", () => {
    it("should return 'ok'", async () => {
      expect.assertions(2);
      const response = await request(server).get("");
      expect(response.text).toBe("ok");
      expect(response.status).toBe(200);
    });
  });

  it("GET /health", async () => {
    expect.assertions(2);
    const response = await request(server).get("/health");

    // Expect all the dependencies to be up
    const dependencies = Object.keys(
      DEPENDENCIES,
    ) as (keyof typeof DEPENDENCIES)[];
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

  describe("GET /unknown-route", () => {
    it("should return an error", async () => {
      expect.assertions(2);

      const response = await request(server).get("/unknown-route").send();

      expect(response.body).toStrictEqual({
        detail: `Cannot GET ${apiUrlPrefix}/unknown-route`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
