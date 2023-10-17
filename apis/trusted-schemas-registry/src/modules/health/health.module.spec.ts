import { vi, describe, beforeAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { HealthIndicatorResult } from "@nestjs/terminus";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { of } from "rxjs";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import type { ApiConfig } from "../../config/configuration.js";
import { HealthModule } from "./health.module.js";

describe("Health Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let httpService: HttpService;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    Logger.overrideLogger(false);

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = app.getHttpServer();

    httpService = await moduleFixture.resolve<HttpService>(HttpService);
  });

  describe("check", () => {
    it("should return 'ok'", async () => {
      expect.assertions(3);

      const status = { "ebsi-apis": { status: "up" } } as HealthIndicatorResult;

      const spy = vi
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
