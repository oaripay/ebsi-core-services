import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer, Logger } from "@nestjs/common";
import { HealthIndicatorResult } from "@nestjs/terminus";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { of } from "rxjs";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { ApiConfig } from "../../config/configuration";
import { HealthModule } from "./health.module";

describe("Health module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
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

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  describe("check", () => {
    it("should return 'ok'", async () => {
      expect.assertions(3);

      const status = { "ebsi-apis": { status: "up" } } as HealthIndicatorResult;

      const spy = jest
        .spyOn(httpService, "request")
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        .mockImplementation(() => of({}));

      const response = await request(server).get("/health").send();

      expect(spy).toHaveBeenCalledWith({
        url: configService.get<string>("externalEbsiApiHealthCheck"),
      });
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
