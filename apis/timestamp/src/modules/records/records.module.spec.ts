import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import crypto from "node:crypto";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { Timestamp, Timestamp__factory } from "@ebsiint-sc/timestamp";
import { multibase } from "@ebsiint-api/shared";
import { RecordsModule } from "./records.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/timestamp.js";
import { RecordLink } from "./records.interface.js";
import { LedgerService } from "../ledger/ledger.service.js";

const RECORDS_TOTAL = 3;

describe("Records Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let timestampContract: Timestamp;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let sender: string;

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      recordsTotal: RECORDS_TOTAL,
    });
    timestampContract = testEnv.timestampContract;
    sender = testEnv.sender;

    // Mock Timestamp contract
    vi.spyOn(Timestamp__factory, "connect").mockImplementation(
      () => timestampContract,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RecordsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => timestampContract,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /records", () => {
    describe.each([
      () => "/records",
      () => `/records?owner=${sender}`,
      () => `/records?owner=${sender.toUpperCase()}`,
    ])("GET %s", (url: () => string) => {
      it("should return a paginated collection of records", async () => {
        expect.assertions(3);

        const response = await request(server).get(url());
        expect(response.body).toStrictEqual({
          self: expect.stringContaining("/records?page[after]=1&page[size]=10"),
          items: expect.arrayContaining([]),
          total: RECORDS_TOTAL,
          pageSize: 10,
          links: {
            first: expect.stringContaining(
              "/records?page[after]=1&page[size]=10",
            ),
            prev: expect.stringContaining(
              "/records?page[after]=1&page[size]=10",
            ),
            next: expect.stringContaining(
              "/records?page[after]=1&page[size]=10",
            ),
            last: expect.stringContaining(
              "/records?page[after]=1&page[size]=10",
            ),
          },
        });
        expect((response.body as { items: string }).items).toHaveLength(
          RECORDS_TOTAL,
        );
        expect(response.status).toBe(200);
      });
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/records?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/records?page[after]=1&page[size]=2"),
        items: expect.arrayContaining([]),
        total: RECORDS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining("/records?page[after]=1&page[size]=2"),
          prev: expect.stringContaining("/records?page[after]=1&page[size]=2"),
          next: expect.stringContaining("/records?page[after]=2&page[size]=2"),
          last: expect.stringContaining("/records?page[after]=2&page[size]=2"),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/records?page[after]=2&page[size]=2",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/records?page[after]=2&page[size]=2"),
        items: expect.arrayContaining([]),
        total: RECORDS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining("/records?page[after]=1&page[size]=2"),
          prev: expect.stringContaining("/records?page[after]=1&page[size]=2"),
          next: expect.stringContaining("/records?page[after]=2&page[size]=2"),
          last: expect.stringContaining("/records?page[after]=2&page[size]=2"),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/records?page[after]=100&page[size]=2",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining("/records?page[after]=100&page[size]=2"),
        items: expect.arrayContaining([]),
        total: RECORDS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining("/records?page[after]=1&page[size]=2"),
          prev: expect.stringContaining("/records?page[after]=2&page[size]=2"),
          next: expect.stringContaining("/records?page[after]=2&page[size]=2"),
          last: expect.stringContaining("/records?page[after]=2&page[size]=2"),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/records?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/records?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: RECORDS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining("/records?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/records?page[after]=1&page[size]=10"),
          last: expect.stringContaining("/records?page[after]=1&page[size]=10"),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/records?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/records?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/records?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/records?page[after]=abc");
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
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
        ownerIds: expect.arrayContaining([]),
        revokedOwnerIds: expect.arrayContaining([]),
        firstVersionTimestamps: expect.arrayContaining([]),
        lastVersionTimestamps: expect.arrayContaining([]),
        totalVersions: 1,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const recordId = multibase.base64url.encode(crypto.randomBytes(32));

      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        title: "Record Not Found",
        status: 404,
        detail: `Record ${recordId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the record id is not a valid multibase64url value", async () => {
      expect.assertions(2);

      const recordId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["recordId must be multi-base64url encoded"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /records/{recordId}/versions", () => {
    const getFirstRecordId = async () => {
      const respRecords = await request(server).get("/records");
      const { recordId } = (
        respRecords.body as {
          items: RecordLink[];
        }
      ).items[0]!;
      return recordId;
    };

    it("should return a paginated collection of versions", async () => {
      expect.assertions(3);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect((response.body as { items: string[] }).items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const recordId = await getFirstRecordId();

      const response1 = await request(server).get(
        `/records/${recordId}/versions?page[size]=2`,
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=2`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(1);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/records/${recordId}/versions?page[after]=2&page[size]=2`,
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=2&page[size]=2`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/records/${recordId}/versions?page[after]=100&page[size]=2`,
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=100&page[size]=2`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`,
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/records/${recordId}/versions?page[after]=1`,
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(1);
      expect(response4.status).toBe(200);
    });
  });

  describe("GET /records/{recordId}/versions/{versionId}", () => {
    const getFirstRecordId = async () => {
      const respRecords = await request(server).get("/records");
      const { recordId } = (
        respRecords.body as {
          items: RecordLink[];
        }
      ).items[0]!;
      return recordId;
    };

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

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const randomRecordId = multibase.base64url.encode(crypto.randomBytes(32));
      const versionId = 800;

      const response = await request(server).get(
        `/records/${randomRecordId}/versions/${versionId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Record Not Found",
        status: 404,
        detail: `Record ${randomRecordId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the version is not found", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();
      const versionId = 800;

      const response = await request(server).get(
        `/records/${recordId}/versions/${versionId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Version Not Found",
        status: 404,
        detail: `Version ${versionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
