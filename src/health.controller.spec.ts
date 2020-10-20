import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import {
  NestFastifyApplication,
  FastifyAdapter,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import AppModule from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";

describe("HealthController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    Logger.overrideLogger(false);
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  describe("check", () => {
    it("should return 'ok'", async () => {
      expect.assertions(2);
      const url = `/health`;
      const response = await request(app.getHttpServer()).get(url);
      expect(response.body).toStrictEqual({
        details: { "ebsi-apis": { status: "up" } },
        error: {},
        info: { "ebsi-apis": { status: "up" } },
        status: "ok",
      });

      expect(response.status).toBe(200);
    });
  });
});
