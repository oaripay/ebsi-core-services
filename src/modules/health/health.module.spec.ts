import request from "supertest";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Logger } from "@nestjs/common";
import { HttpHealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { HttpService } from "@nestjs/axios";
import { HealthModule } from "./health.module";
import { EbsiValidationPipe } from "../../pipes/ebsi-validation.pipe";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { ApiConfig } from "../../config/configuration";

describe("Health module", () => {
  let app: INestApplication;
  let server: HttpService;
  let httpHealthIndicator: HttpHealthIndicator;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpService;

    httpHealthIndicator =
      moduleFixture.get<HttpHealthIndicator>(HttpHealthIndicator);
    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /health", () => {
    it("should be fine", async () => {
      expect.assertions(3);

      const status = { "ebsi-apis": { status: "up" } } as HealthIndicatorResult;

      const spy = jest
        .spyOn(httpHealthIndicator, "pingCheck")
        .mockImplementation(() => {
          return Promise.resolve(status);
        });

      const response = await request(server).get("/health");

      expect(spy).toHaveBeenCalledWith(
        "ebsi-apis",
        configService.get("externalEbsiApiHealthCheck")
      );
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
