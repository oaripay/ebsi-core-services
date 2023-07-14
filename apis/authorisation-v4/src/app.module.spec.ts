import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { ApiConfig } from "./config/configuration";
import { configureApp } from "../tests/utils/app";

interface ResponseHeaders {
  "ebsi-image-tag": string;
  [key: string]: string;
}

describe("App Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig, true>;
  const dockerTag = "version";

  beforeAll(async () => {
    process.env.DOCKER_TAG = dockerTag;

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture, configService);

    // Turn off logger
    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
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
