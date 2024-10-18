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
import { fastifyAccepts } from "@fastify/accepts";
import { ethers } from "ethers";
import { Timestamp, Timestamp__factory } from "@ebsiint-sc/timestamp-v2";
import {
  methodNotAllowed,
  multibase,
  multihashEncode,
} from "@ebsiint-api/shared";
import { TimestampsModule } from "./timestamps.module.js";
import { TimestampLink } from "./timestamps.interface.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv, insertHash } from "../../../tests/utils/timestamp.js";
import { LedgerService } from "../ledger/ledger.service.js";

const HASHES_TOTAL = 3;

describe("Timestamps Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let timestampContract: Timestamp;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      recordsTotal: 0,
      hashesTotal: HASHES_TOTAL,
    });
    timestampContract = testEnv.timestampContract;

    // Mock Timestamp contract
    vi.spyOn(Timestamp__factory, "connect").mockImplementation(
      () => timestampContract,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TimestampsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();
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

  describe("GET /timestamps", () => {
    it("should return a paginated collection of timestamps", async () => {
      expect.assertions(3);

      const response = await request(server).get("/timestamps");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        total: HASHES_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/timestamps?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/timestamps?page[after]=1&page[size]=2"),
        items: expect.arrayContaining([]),
        total: HASHES_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2",
          ),
          next: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
          last: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/timestamps?page[after]=2&page[size]=2",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/timestamps?page[after]=2&page[size]=2"),
        items: expect.arrayContaining([]),
        total: HASHES_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2",
          ),
          next: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
          last: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/timestamps?page[after]=100&page[size]=2",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=100&page[size]=2",
        ),
        items: expect.arrayContaining([]),
        total: HASHES_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
          next: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
          last: expect.stringContaining(
            "/timestamps?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/timestamps?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        total: HASHES_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
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
        "/timestamps?page[after]=abc",
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

    it("should reject a non whitelisted query", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/timestamps?invalid-query=abc",
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["property invalid-query should not exist"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /timestamps/{timestampId}", () => {
    it("should return a specific timestamp (1)", async () => {
      // Test when we already know some info about the timestamp
      expect.assertions(2);

      const { hashes, hashAlgorithms } = testEnv;
      const hash = hashes[0]!;
      const hashValue = hash.hashValues[0]!;
      const timestampId = multibase.base64url.encode(
        multihashEncode(
          ethers.utils.sha256(hashValue).replace(/^0x/, ""),
          "sha2-256",
          32,
        ),
      );

      const response = await request(server).get(`/timestamps/${timestampId}`);

      // multi-hash (base64 multi-encoded)
      const multihashEncodedHash = multibase.base64.encode(
        multihashEncode(
          hashValue,
          hashAlgorithms[0]!.multihash,
          hashAlgorithms[0]!.outputLength / 8,
        ),
      );

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number),
        timestamp: expect.any(String),
        data: hash.timestampData[0],
        hash: multihashEncodedHash,
        timestampedBy: expect.stringContaining("0x"),
        transactionHash: expect.stringContaining("0x"),
      });
      expect(response.status).toBe(200);
    });

    it("should return a specific timestamp (2)", async () => {
      // Test when we don't know the timestamp (will just check the first one)
      expect.assertions(2);

      const respTimestamps = await request(server).get("/timestamps");

      const { timestampId } = (
        respTimestamps.body as {
          items: TimestampLink[];
        }
      ).items[0]!;

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number),
        timestamp: expect.any(String),
        data: expect.stringContaining("0x"),
        hash: expect.any(String),
        timestampedBy: expect.stringContaining("0x"),
        transactionHash: expect.stringContaining("0x"),
      });
      expect(response.status).toBe(200);
    });

    it("should return a specific timestamp when there are many transactions in the same block", async () => {
      expect.assertions(5);

      // Disable auto mine
      await testEnv.provider.send("evm_setAutomine", [false]);

      // Send multiple tx
      const hash1 = await insertHash(
        testEnv.timestampContract,
        testEnv.hashAlgorithms[0]!,
      );
      const hash2 = await insertHash(
        testEnv.timestampContract,
        testEnv.hashAlgorithms[0]!,
      );
      const hash3 = await insertHash(
        testEnv.timestampContract,
        testEnv.hashAlgorithms[0]!,
      );

      // Mine block
      await testEnv.provider.send("evm_mine", []);
      await testEnv.provider.send("evm_setAutomine", [true]);

      // Get block numbers
      const { blockNumber: blockNumberTx1 } =
        await testEnv.provider.getTransaction(hash1.tx.hash);
      const { blockNumber: blockNumberTx2 } =
        await testEnv.provider.getTransaction(hash2.tx.hash);
      const { blockNumber: blockNumberTx3 } =
        await testEnv.provider.getTransaction(hash3.tx.hash);

      // Make sure all the transactions are in the same block
      expect(blockNumberTx1).not.toBeNull();
      expect(blockNumberTx1).toStrictEqual(blockNumberTx2);
      expect(blockNumberTx2).toStrictEqual(blockNumberTx3);

      // Get second hash data
      const timestampId = multibase.base64url.encode(
        multihashEncode(
          ethers.utils.sha256(hash2.hashValues[0]!).replace(/^0x/, ""),
          "sha2-256",
          32,
        ),
      );

      const response = await request(server).get(`/timestamps/${timestampId}`);

      // Verify response (especially "transactionHash")
      expect(response.body).toStrictEqual({
        blockNumber: blockNumberTx1,
        timestamp: expect.any(String),
        data: hash2.timestampData[0],
        hash: multibase.base64.encode(
          multihashEncode(
            hash2.hashValues[0]!,
            testEnv.hashAlgorithms[0]!.multihash,
          ),
        ),
        timestampedBy: await testEnv.timestampContract.signer.getAddress(),
        transactionHash: hash2.tx.hash,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the timestamp ID is not a valid multibase64url value", async () => {
      expect.assertions(2);

      const timestampId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        detail: '["timestampId must be multihash encoded in multi-base64url"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the timestamp is not found", async () => {
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
