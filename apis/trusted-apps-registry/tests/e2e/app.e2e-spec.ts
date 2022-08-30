import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

describe("TAR API (generic tests)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let apiUrlPrefix = "";
  let trustedAppsRegistryUrl: string;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);
    trustedAppsRegistryUrl = `${configService.get<string>(
      "domain"
    )}${configService.get<string>("apiUrlPrefix")}`;

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    if (process.env.TEST_ENV === "remote") {
      apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    }
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /health", () => {
    it("should return ok", async () => {
      expect.assertions(2);
      const response = await request(server).get("/health");

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
      const response = await request(server).get("/bad-method");

      expect(response.body).toStrictEqual({
        title: "Not Found",
        status: 404,
        detail: `Cannot GET ${apiUrlPrefix}/bad-method`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describeWriteOps()("POST /jsonrpc", () => {
    it("should reject a POST without JWT", async () => {
      expect.assertions(3);

      const response = await request(app.getHttpServer())
        .post("/jsonrpc")
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid or missing JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid token", async () => {
      expect.assertions(3);

      const response = await request(app.getHttpServer())
        .post("/jsonrpc")
        .auth(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJpc3MiOiJhbnkifQ.eiwf-6rtNV0oWpFidRTlcY6oLBpV0l2tEkCs5FNoIxY",
          { type: "bearer" }
        )
        .send();

      expect(response.body).toStrictEqual({
        detail: `Invalid JWT: JWT with invalid kid. It should be hosted at ${trustedAppsRegistryUrl}/apps`,
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });
});
