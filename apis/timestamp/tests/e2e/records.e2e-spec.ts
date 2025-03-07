import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { methodNotAllowed, multibase } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";
import type {
  RecordLink,
  VersionLink,
} from "../../src/modules/records/records.interface.ts";

import { AppModule } from "../../src/app.module.ts";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.ts";
import { getServer } from "../utils/getServer.ts";

describe("Timestamp API v3 - Records (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  const getFirstRecordId = async () => {
    const respRecords = await request(server).get("/records");
    const { recordId } = (respRecords.body as { items: RecordLink[] })
      .items[0]!;
    return recordId;
  };

  const getRecordVersions = async (recordId: string) => {
    const respRecords = await request(server).get(
      `/records/${recordId}/versions`,
    );
    const { items, total } = respRecords.body as {
      items: VersionLink[];
      total: number;
    };
    return { items, total };
  };

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

  describe("GET /records", () => {
    it("should return a paginated collection of records", async () => {
      expect.assertions(2);

      const response = await request(server).get("/records");
      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining("/records?page[after]="),
          next: expect.stringContaining("/records?page[after]="),
          prev: expect.stringContaining("/records?page[after]=1&page[size]=10"),
        },
        pageSize: 10,
        self: expect.stringContaining("/records?page[after]=1&page[size]=10"),
        total: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /records/{recordId}", () => {
    it("should return a specific record", async () => {
      expect.assertions(2);

      const respRecords = await request(server).get("/records");
      const { recordId } = (
        respRecords.body as {
          items: RecordLink[];
        }
      ).items[0]!;
      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        firstVersionTimestamps: expect.arrayContaining([]),
        lastVersionTimestamps: expect.arrayContaining([]),
        ownerIds: expect.arrayContaining([]),
        revokedOwnerIds: expect.arrayContaining([]),
        totalVersions: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const recordId = multibase.base64url.encode(crypto.randomBytes(32));

      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        detail: `Record ${recordId} not found`,
        status: 404,
        title: "Record Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /records/{recordId}/versions", () => {
    it("should return a paginated collection of versions", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions`,
      );
      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`,
        ),
        total: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /records/{recordId}/versions/{versionId}", () => {
    it("should return a specific version", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions/0`,
      );

      expect(response.body).toStrictEqual({
        hashes: expect.arrayContaining([]),
        info: expect.arrayContaining([]),
      });
      expect(response.status).toBe(200);
    });

    it("should return an error when the record doesn't exist", async () => {
      expect.assertions(2);

      const randomRecordId = multibase.base64url.encode(crypto.randomBytes(32));

      const response = await request(server).get(
        `/records/${randomRecordId}/versions/0`,
      );

      expect(response.body).toStrictEqual({
        detail: `Record ${randomRecordId} not found`,
        status: 404,
        title: "Record Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return an error when the version doesn't exist", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();
      const versions = await getRecordVersions(recordId);
      const versionId = versions.total;

      const response = await request(server).get(
        `/records/${recordId}/versions/${versionId}`,
      );

      expect(response.body).toStrictEqual({
        detail: `Version ${versionId} not found`,
        status: 404,
        title: "Version Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
