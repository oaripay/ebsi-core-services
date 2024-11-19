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
import type { JSONSchema } from "@apidevtools/json-schema-ref-parser/dist/lib/types";
import { computeId, methodNotAllowed } from "@ebsiint-api/shared";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { createVerifiableAuthorisationSchema } from "../utils/data.js";
import { getServer } from "../utils/getServer.js";

describe("TSR API v2 - Schemas (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  let rawSchema: JSONSchema;
  let schemaId: string;

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

    rawSchema = createVerifiableAuthorisationSchema(
      configService.get<string>("testVaSchemaUrl"),
    );

    schemaId = `0x${(await computeId(rawSchema)).toString("hex")}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /schemas", () => {
    it("should return a paginated collection of schemas", async () => {
      expect.assertions(2);

      const response = await request(server).get("/schemas");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/schemas?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining("/schemas?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/schemas?page[after]="),
          last: expect.stringContaining("/schemas?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /schemas/{schemaId}", () => {
    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(16).toString("hex")}`;

      const response = await request(server).get(`/schemas/${fakeId}`);

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        "/schemas/no-schema/revisions",
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/schemas/${fakeId}/revisions`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if valid-at query parameter is not valid", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions?valid-at=yesterday`,
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["valid-at must be a valid ISO 8601 date string"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);
      expect(
        (response1.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response2 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
      expect(
        (response2.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response3 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);
      expect(
        (response3.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response4 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=abc`,
      );
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
      expect(
        (response4.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision`,
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}/metadata`,
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}/metadata`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision/metadata`,
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata/{metadataId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;
      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision/metadata/${fakeSchemaMetadataId}`,
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });
});
