import { Test, TestingModule } from "@nestjs/testing";
import { Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { EbsiValidationPipe } from "../../src/pipes/ebsi-validation.pipe";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";

jest.setTimeout(10000);

describe("AppController (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let apiUrlPrefix = "";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());

    // Turn off logger
    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

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

  describe("GET /health", () => {
    it("should return 200 with status up", async () => {
      expect.assertions(2);
      const response = await request(server).get("/health");
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
