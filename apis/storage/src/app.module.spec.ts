import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/http-exception.filter.js";
import type { ApiConfig } from "./config/configuration.js";

interface ResponseHeaders {
  "ebsi-image-tag"?: string;
  [key: string]: string;
}

describe("App Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let configService: ConfigService<ApiConfig, true>;
  const dockerTag = "version";

  beforeAll(async () => {
    process.env.DOCKER_TAG = dockerTag;

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  describe("GET /unknown-route", () => {
    it("should return an error", async () => {
      expect.assertions(2);

      const response = await request(server).get("/unknown-route").send();

      expect(response.body).toStrictEqual({
        detail: "Cannot GET /unknown-route",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should provide EBSI image version/tag in headers", async () => {
      expect.assertions(2);
      const response = await request(server).get("/heal").send();
      const headers = response.header as ResponseHeaders;
      expect(headers).toHaveProperty("ebsi-image-tag");
      expect(headers["ebsi-image-tag"]).toBe(dockerTag);
    });
  });

  describe("GET /health", () => {
    it("should provide EBSI image version/tag in headers", async () => {
      expect.assertions(2);
      const response = await request(server).get("/health").send();
      const headers = response.header as ResponseHeaders;
      expect(headers).toHaveProperty("ebsi-image-tag");
      expect(headers["ebsi-image-tag"]).toBe(dockerTag);
    });
  });
});
