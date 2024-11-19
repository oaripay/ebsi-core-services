import { describe, beforeAll, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { methodNotAllowed } from "@ebsiint-api/shared";
import { SchemaSCRegistry__factory } from "@ebsiint-sc/trusted-schemas-registry-v2";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import {
  DEPENDENCIES,
  type ApiConfig,
} from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";

describe("TSR API v3 - Generic tests (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let apiUrlPrefix = "";

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    Logger.overrideLogger(false);

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = getServer(app, configService);

    if (process.env.TEST_ENV === "remote") {
      apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /", () => {
    it("should return 'ok'", async () => {
      expect.assertions(4);

      const response = await request(server).get("");

      expect(response.text).toBe("ok");
      expect(response.status).toBe(200);

      // Check headers
      expect(response.headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers["x-frame-options"]).toStrictEqual("DENY");
    });

    it("should return an error 405 if called with a method different from GET", async () => {
      expect.assertions(16);

      // POST
      let response = await request(server).post("/");

      expect(response.body).toStrictEqual({
        detail: "Cannot POST /. Allowed HTTP methods: GET",
        status: 405,
        title: "Method Not Allowed",
        type: "about:blank",
      });
      expect(response.headers["allow"]).toStrictEqual("GET");
      expect(response.headers["content-type"]).toStrictEqual(
        "application/problem+json; charset=utf-8",
      );
      expect(response.status).toBe(405);

      // HEAD
      response = await request(server).head("/");

      expect(response.body).toStrictEqual({}); // HEAD response body is empty
      expect(response.headers["allow"]).toStrictEqual("GET");
      expect(response.headers["content-type"]).toStrictEqual(
        "application/problem+json; charset=utf-8",
      );
      expect(response.status).toBe(405);

      // PUT
      response = await request(server).put("/");

      expect(response.body).toStrictEqual({
        detail: "Cannot PUT /. Allowed HTTP methods: GET",
        status: 405,
        title: "Method Not Allowed",
        type: "about:blank",
      });
      expect(response.headers["allow"]).toStrictEqual("GET");
      expect(response.headers["content-type"]).toStrictEqual(
        "application/problem+json; charset=utf-8",
      );
      expect(response.status).toBe(405);

      // PATCH
      response = await request(server).patch("/");

      expect(response.body).toStrictEqual({
        detail: "Cannot PATCH /. Allowed HTTP methods: GET",
        status: 405,
        title: "Method Not Allowed",
        type: "about:blank",
      });
      expect(response.headers["allow"]).toStrictEqual("GET");
      expect(response.headers["content-type"]).toStrictEqual(
        "application/problem+json; charset=utf-8",
      );
      expect(response.status).toBe(405);
    });

    it("should return an error 406 if called with an unsupported 'Accept' header", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get("/")
        .set("Accept", "application/xml");

      expect(response.body).toStrictEqual({
        detail: "Only 'text/plain' content types supported",
        status: 406,
        title: "Not Acceptable",
        type: "about:blank",
      });
      expect(response.headers["content-type"]).toStrictEqual(
        "application/problem+json; charset=utf-8",
      );
      expect(response.status).toBe(406);
    });
  });

  describe("GET /abi", () => {
    it("should return the ABI", async () => {
      expect.assertions(4);

      const response = await request(server).get("/abi");

      expect(response.body).toStrictEqual(SchemaSCRegistry__factory.abi);
      expect(response.status).toBe(200);

      // Check headers
      expect(response.headers["content-security-policy"]).toContain(
        "frame-ancestors 'none'",
      );
      expect(response.headers["x-frame-options"]).toStrictEqual("DENY");
    });
  });

  it("GET /health", async () => {
    expect.assertions(2);
    const response = await request(server).get("/health");

    // Expect all the dependencies to be up
    const dependencies = Object.keys(
      DEPENDENCIES,
    ) as (keyof typeof DEPENDENCIES)[];
    const expectedStatuses = ([...dependencies, "Besu"] as const)
      .map((dependency) => ({
        [`${dependency}`]: { status: "up" },
      }))
      .reduce((acc, currentVal) => ({ ...acc, ...currentVal }), {});

    expect(response.body).toStrictEqual({
      details: expectedStatuses,
      error: {},
      info: expectedStatuses,
      status: "ok",
    });
    expect(response.status).toBe(200);
  });

  describe("GET /unknown-route", () => {
    it("should return an error", async () => {
      expect.assertions(2);

      const response = await request(server).get("/unknown-route").send();

      expect(response.body).toStrictEqual({
        detail: `Cannot GET ${apiUrlPrefix}/unknown-route`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
