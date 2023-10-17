import { describe, beforeAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";

describe("/authorisation/v2 (generic tests)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let apiUrlPrefix = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    if (process.env.TEST_ENV === "remote") {
      apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    }
  });

  describe("GET /health", () => {
    it("should return ok", async () => {
      expect.assertions(2);
      const response = await request(server).get(`/health`);

      expect(response.body).toStrictEqual({
        details: { "ebsi-apis": { status: "up" } },
        error: {},
        info: { "ebsi-apis": { status: "up" } },
        status: "ok",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /bad-method", () => {
    it("should return error 404", async () => {
      expect.assertions(2);
      const response = await request(server).get("/bad-method");

      expect(response.body).toStrictEqual({
        title: "Not Found",
        status: 404,
        detail: `Cannot GET ${apiUrlPrefix}/bad-method`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
