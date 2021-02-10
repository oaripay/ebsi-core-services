import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import crypto from "crypto";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { RecordsModule } from "./records.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar } from "../../contracts/trusted-apps-registry/Tar";
import { Tar__factory } from "../../contracts/trusted-apps-registry/factories/Tar__factory";
import { Timestamp, Timestamp__factory } from "../../contracts/timestamp";
import { setupTestEnv } from "../../../tests/utils/timestamp";
import { setupTestEnvTar } from "../../../tests/utils/tar";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { InfoObject, RecordLink } from "./records.interface";
import { multibase64Encode } from "../../shared/utils";

jest.setTimeout(90000);

const RECORDS_TOTAL = 3;

describe("Records Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let timestampContract: Timestamp;
  let tarContract: Tar;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let testEnvTar: AsyncReturnType<typeof setupTestEnvTar>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      recordsTotal: RECORDS_TOTAL,
    });
    testEnvTar = await setupTestEnvTar({ administratorsTotal: 1 });
    timestampContract = testEnv.timestampContract;
    tarContract = testEnvTar.tarContract;

    // Mock Timestamp and TAR contract
    jest
      .spyOn(Timestamp__factory, "connect")
      .mockImplementation(() => timestampContract);
    jest.spyOn(Tar__factory, "connect").mockImplementation(() => tarContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RecordsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /records", () => {
    it("should return a paginated collection of records", async () => {
      expect.assertions(3);

      const response = await request(server).get("/records");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/records?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: RECORDS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/records?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/records?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: RECORDS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/records?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/records?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/records?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: RECORDS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/records?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/records?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/records?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: RECORDS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/records?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/records?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/records?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: RECORDS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
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

      const { recordId } = (respRecords.body as {
        items: RecordLink[];
      }).items[0];

      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        ownerIds: expect.arrayContaining([]) as string[],
        revokedOwnerIds: expect.arrayContaining([]) as string[],
        firstVersionTimestamps: expect.arrayContaining([]) as string[],
        lastVersionTimestamps: expect.arrayContaining([]) as string[],
        totalVersions: 1,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const recordIdDecoded = `0x${crypto.randomBytes(32).toString("hex")}`;
      const recordId = multibase64Encode(recordIdDecoded);

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
      const { recordId } = (respRecords.body as {
        items: RecordLink[];
      }).items[0];
      return recordId;
    };

    it("should return a paginated collection of versions", async () => {
      expect.assertions(3);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string[] }).items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const recordId = await getFirstRecordId();

      const response1 = await request(server).get(
        `/records/${recordId}/versions?page[size]=2`
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 1,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(1);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/records/${recordId}/versions?page[after]=2&page[size]=2`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 1,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/records/${recordId}/versions?page[after]=100&page[size]=2`
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 1,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/records/${recordId}/versions?page[after]=1`
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(1);
      expect(response4.status).toBe(200);
    });
  });

  describe("GET /records/{recordId}/versions/{versionId}", () => {
    const getFirstRecordId = async () => {
      const respRecords = await request(server).get("/records");
      const { recordId } = (respRecords.body as {
        items: RecordLink[];
      }).items[0];
      return recordId;
    };

    it("should return a specific version", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions/0`
      );

      expect(response.body).toStrictEqual({
        hashes: expect.arrayContaining([]) as string[],
        info: expect.arrayContaining([]) as InfoObject[],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the version is not found", async () => {
      expect.assertions(4);

      const recordId = await getFirstRecordId();
      const versionId = 800;

      let response = await request(server).get(
        `/records/${recordId}/versions/${versionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Version Not Found",
        status: 404,
        detail: `Version ${versionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      const randomRecordId = multibase64Encode(
        `0x${crypto.randomBytes(32).toString("hex")}`
      );

      response = await request(server).get(
        `/records/${randomRecordId}/versions/${versionId}`
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
