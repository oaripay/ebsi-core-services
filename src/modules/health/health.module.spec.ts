import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer, Logger } from "@nestjs/common";
import { HealthIndicatorResult, HttpHealthIndicator } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { HealthModule } from "./health.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { ApiConfig } from "../../config/configuration";

describe("Health Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let httpHealthIndicator: HttpHealthIndicator;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    httpHealthIndicator = moduleFixture.get<HttpHealthIndicator>(
      HttpHealthIndicator
    );

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /health", () => {
    it("should return status ok", async () => {
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
