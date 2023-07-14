import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import type { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";

describe("App Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let apiUrlPrefix = "";
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    if (process.env.TEST_ENV === "remote") {
      apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    }
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
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
