import { describe, beforeAll, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import {
  methodNotAllowed,
  multibase,
  multihashEncode,
} from "@ebsiint-api/shared";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";

describe("Timestamp API v3 - Timestamp (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /timestamps", () => {
    it("should return a paginated collection of timestamps", async () => {
      expect.assertions(2);

      const response = await request(server).get("/timestamps");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining("/timestamps?page[after]="),
          last: expect.stringContaining("/timestamps?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /timestamps/{timestampId}", () => {
    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const timestampId = multibase.base64url.encode(
        multihashEncode(crypto.randomBytes(32).toString("hex"), "sha2-256", 32),
      );

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        title: "Timestamp Not Found",
        status: 404,
        detail: `Timestamp ${timestampId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
