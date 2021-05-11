import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer, Logger } from "@nestjs/common";
import { HealthIndicatorResult, HttpHealthIndicator } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { ApiConfig } from "./config/configuration";

describe("HealthController", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let httpHealthIndicator: HttpHealthIndicator;
  let configService: ConfigService<ApiConfig>;

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
    server = app.getHttpServer() as HttpServer;

    httpHealthIndicator =
      moduleFixture.get<HttpHealthIndicator>(HttpHealthIndicator);

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });

  describe("check", () => {
    it("should return 'ok'", async () => {
      expect.assertions(3);

      const status = { "ebsi-apis": { status: "up" } } as HealthIndicatorResult;

      const spy = jest
        .spyOn(httpHealthIndicator, "pingCheck")
        .mockImplementation(() => {
          return Promise.resolve(status);
        });

      const response = await request(server).get("/health").send();

      expect(spy).toHaveBeenCalledWith(
        "ebsi-apis",
        configService.get("externalEbsiApiHealthCheck")
      );
      expect(response.body).toStrictEqual({
        details: status,
        error: {},
        info: status,
        status: "ok",
      });
      expect(response.status).toBe(200);
    });
  });
});
