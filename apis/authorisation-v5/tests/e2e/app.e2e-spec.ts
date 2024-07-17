import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { AppModule } from "../../src/app.module.js";
import {
  DEPENDENCIES,
  type ApiConfig,
} from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";
import { configureApp } from "../utils/app.js";

describe("Authorisation API v5 - Generic tests (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let apiUrlPrefix = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture);

    // Turn off logger
    Logger.overrideLogger(false);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    const testEnv = configService.get("testEnv", { infer: true });

    if (testEnv === "remote") {
      apiUrlPrefix = configService.get("apiUrlPrefix", { infer: true });
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

  describe("GET /health", () => {
    it("should return 200 with status up", async () => {
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
