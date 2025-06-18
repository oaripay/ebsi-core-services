import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { multibase } from "@ebsiint-api/shared";
import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";
import type {
  RecordLink,
  VersionLink,
} from "../../src/modules/records/records.interface.ts";

import { AppModule } from "../../src/app.module.ts";
import { getNestFastifyApplication } from "../utils/app.ts";
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
    app = await getNestFastifyApplication({
      imports: [AppModule],
    });

    if (process.env.TEST_ENV !== "remote") {
      await app.init();
      const fastifyInstance = app.getHttpAdapter().getInstance();
      await fastifyInstance.ready();
    }

    const configService =
      app.get<ConfigService<ApiConfig, true>>(ConfigService);

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
