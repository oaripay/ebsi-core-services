import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { Timestamp, Timestamp__factory } from "@ebsiint-sc/timestamp";
import { AsyncReturnType } from "@ebsiint-api/shared";
import { HashAlgorithmsModule } from "./hash-algorithms.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/timestamp";
import { LedgerService } from "../ledger/ledger.service";
import { ApiConfig } from "../../config/configuration";

const HASH_ALGORITHMS_TOTAL = 3;

describe("HashAlgorithms Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let timestampContract: Timestamp;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let ledgerService: LedgerService;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      hashAlgorithmsTotal: HASH_ALGORITHMS_TOTAL,
    });
    timestampContract = testEnv.timestampContract;

    // Mock Timestamp contract
    jest
      .spyOn(Timestamp__factory, "connect")
      .mockImplementation(() => timestampContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [HashAlgorithmsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(timestampContract));
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /hash-algorithms", () => {
    it("should return a paginated collection of hash-algorithms", async () => {
      expect.assertions(3);

      const response = await request(server).get("/hash-algorithms");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASH_ALGORITHMS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        "/hash-algorithms?page[size]=2"
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASH_ALGORITHMS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/hash-algorithms?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASH_ALGORITHMS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/hash-algorithms?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASH_ALGORITHMS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/hash-algorithms?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        "/hash-algorithms?page[after]=1"
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: HASH_ALGORITHMS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/hash-algorithms?page[size]=100"
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        "/hash-algorithms?page[size]=0"
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        "/hash-algorithms?page[after]=0"
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/hash-algorithms?page[after]=abc"
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

  describe("GET /hash-algorithms/{hashAlgorithmId}", () => {
    it("should return a specific hash algorithm", async () => {
      expect.assertions(2);

      const response = await request(server).get("/hash-algorithms/0");

      const firstHashAlgorithm = testEnv.hashAlgorithms[0];

      expect(response.body).toStrictEqual({
        ianaName: firstHashAlgorithm.ianaName,
        oid: firstHashAlgorithm.oid,
        outputLengthBits: firstHashAlgorithm.outputLength,
        status: "active",
        multihash: firstHashAlgorithm.multihash,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the hash algorithm is not found", async () => {
      expect.assertions(2);

      const hashAlgorithmId = "1234567890";

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`
      );

      expect(response.body).toStrictEqual({
        title: "Hash algorithm Not Found",
        status: 404,
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
