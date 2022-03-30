import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { fastifyAdapterConfig } from "../../src/config/server.config";

jest.setTimeout(60000);

describe("/storage/v3 (generic tests)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig)
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  describe("GET /health", () => {
    it("should return ok", async () => {
      expect.assertions(2);
      const response = await request(app.getHttpServer()).get(`/health`);

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
      const response = await request(app.getHttpServer()).get("/bad-method");

      expect(response.body).toStrictEqual({
        title: "Not Found",
        status: 404,
        detail: "Cannot GET /bad-method",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
