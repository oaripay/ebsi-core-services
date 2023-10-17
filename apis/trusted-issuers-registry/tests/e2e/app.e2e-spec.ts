import { describe, beforeAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import { useContainer } from "class-validator";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";

describe("App Module (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let apiUrlPrefix = "";
  let trustedAppsRegistryUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    if (process.env.TEST_ENV === "remote") {
      apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    }

    trustedAppsRegistryUrl = `${configService.get<string>(
      "trustedAppsRegistryApiUrl",
    )}`;

    // Use TEST_LB_DOMAIN if defined
    if (configService.get<string>("testLoadBalancerDomain")) {
      trustedAppsRegistryUrl = trustedAppsRegistryUrl.replace(
        configService.get<string>("domain"),
        configService.get<string>("testLoadBalancerDomain"),
      );
    }
  });

  it(`(GET) /health`, async () => {
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

  describeWriteOps()("POST /jsonrpc", () => {
    it("should reject a POST without JWT", async () => {
      expect.assertions(3);

      const response = await request(server).post("/jsonrpc").send();

      expect(response.body).toStrictEqual({
        detail: "Invalid or missing JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid token", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/jsonrpc")
        .auth(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJpc3MiOiJhbnkifQ.eiwf-6rtNV0oWpFidRTlcY6oLBpV0l2tEkCs5FNoIxY",
          { type: "bearer" },
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
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
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
});
