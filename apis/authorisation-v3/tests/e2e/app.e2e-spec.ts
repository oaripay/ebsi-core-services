import { jest, describe, beforeAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { AppModule } from "../../src/app.module";
import { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";
import { configureApp } from "../utils/app";

jest.setTimeout(60000);

describe("/authorisation/v3 (generic tests)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let apiUrlPrefix = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture, configService);

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    const testEnv = configService.get<string>("testEnv");
    if (testEnv === "remote") {
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
