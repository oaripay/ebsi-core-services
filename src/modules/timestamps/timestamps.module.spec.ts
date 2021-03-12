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
import multihash from "multihashes";
import { ethers } from "ethers";
import { TimestampsModule } from "./timestamps.module";
import { TimestampLink } from "./timestamps.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar } from "../../contracts/trusted-apps-registry/Tar";
import { Tar__factory } from "../../contracts/trusted-apps-registry/factories/Tar__factory";
import { Timestamp, Timestamp__factory } from "../../contracts/timestamp";
import { setupTestEnv } from "../../../tests/utils/timestamp";
import { setupTestEnvTar } from "../../../tests/utils/tar";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { multibase64Encode, multihashEncode } from "../../shared/utils";

const HASHES_TOTAL = 3;

describe("Timestamps Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let timestampContract: Timestamp;
  let tarContract: Tar;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let testEnvTar: AsyncReturnType<typeof setupTestEnvTar>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      recordsTotal: 0,
      hashesTotal: HASHES_TOTAL,
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
      imports: [TimestampsModule],
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

  describe("GET /timestamps", () => {
    it("should return a paginated collection of timestamps", async () => {
      expect.assertions(3);

      const response = await request(server).get("/timestamps");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASHES_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/timestamps?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASHES_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/timestamps?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASHES_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/timestamps?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASHES_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/timestamps?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASHES_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/timestamps?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/timestamps?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/timestamps?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/timestamps?page[after]=abc"
      );
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

  describe("GET /timestamps/{timestampId}", () => {
    it("should return a specific timestamp (1)", async () => {
      // Test when we already know some info about the timestamp
      expect.assertions(2);

      const { hashes, hashAlgorithms } = testEnv;
      const hash = hashes[0];
      const hashValue = hash.hashValues[0];
      const timestampId = ethers.utils.sha256(hash.hashValues[0]);
      const encodedHash = multibase64Encode(timestampId);

      const response = await request(server).get(`/timestamps/${encodedHash}`);

      // multi-hash (base64 multi-encoded)
      const multihashEncodedHash = multihashEncode(
        hashValue,
        hashAlgorithms[0].ianaName as multihash.HashName
      );

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number) as number,
        data: hash.timestampData[0],
        hash: multihashEncodedHash,
        timestampedBy: expect.stringContaining("0x") as string,
        transactionHash: expect.stringContaining("0x") as string,
      });
      expect(response.status).toBe(200);
    });

    it("should return a specific timestamp (2)", async () => {
      // Test when we don't know the timestamp (will just check the first one)
      expect.assertions(2);

      const respTimestamps = await request(server).get("/timestamps");

      const { timestampId } = (respTimestamps.body as {
        items: TimestampLink[];
      }).items[0];

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number) as number,
        data: expect.stringContaining("0x") as string,
        hash: expect.any(String) as string,
        timestampedBy: expect.stringContaining("0x") as string,
        transactionHash: expect.stringContaining("0x") as string,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the timestamp ID is not a valid multibase64url value", async () => {
      expect.assertions(2);

      const timestampId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        detail: '["timestampId must be multi-base64url encoded"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the timestamp is not found", async () => {
      expect.assertions(2);

      const timestampId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const encodedHash = multibase64Encode(timestampId);

      const response = await request(server).get(`/timestamps/${encodedHash}`);

      expect(response.body).toStrictEqual({
        title: "Timestamp Not Found",
        status: 404,
        detail: `Timestamp ${encodedHash} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
