import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { HealthIndicatorResult } from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import axios from "axios";
import { HealthModule } from "./health.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import type { ApiConfig } from "../../config/configuration.js";

describe("Health Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("should return status ok", async () => {
      expect.assertions(3);

      const status = { "ebsi-apis": { status: "up" } } as HealthIndicatorResult;

      const spy = vi.spyOn(axios, "get").mockImplementation(() => {
        return Promise.resolve(status);
      });

      const response = await request(server).get("/health").send();

      expect(spy).toHaveBeenCalledWith(
        configService.get("externalEbsiApiHealthCheck"),
        { timeout: expect.any(Number) },
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
