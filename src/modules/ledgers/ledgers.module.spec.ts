import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { LedgersModule } from "./ledgers.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { LedgerSCRegistry } from "../../contracts/trusted-ledgers-sc";
import { setupTestEnv } from "../../../tests/utils/ledgerScRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { ContractService } from "../../shared/services/contract.service";

jest.setTimeout(60000);

const LEDGERS_TOTAL = 3;
const REVISIONS_TOTAL = 3;

describe("Ledgers Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ledgerScRegistryContract: LedgerSCRegistry;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let contractService: ContractService;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      ledgersTotal: LEDGERS_TOTAL,
      ledgersRevisionsTotal: REVISIONS_TOTAL,
    });

    ledgerScRegistryContract = testEnv.ledgerScRegistryContract;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LedgersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    contractService = moduleFixture.get<ContractService>(ContractService);

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    // Mock TLSCR contract
    jest
      .spyOn(contractService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(ledgerScRegistryContract)
      );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /ledgers", () => {
    it("should return a paginated collection of ledgers", async () => {
      expect.assertions(3);

      const response = await request(server).get("/ledgers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: LEDGERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/ledgers?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: LEDGERS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/ledgers?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: LEDGERS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/ledgers?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: LEDGERS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/ledgers?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: LEDGERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/ledgers?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);
      expect(
        (response1.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response2 = await request(server).get("/ledgers?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
      expect(
        (response2.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response3 = await request(server).get("/ledgers?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);
      expect(
        (response3.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response4 = await request(server).get("/ledgers?page[after]=abc");
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
      expect(
        (response4.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return the ledgers corresponding to a specific name", async () => {
      expect.assertions(4);

      // If we give a wrong name
      const response = await request(server).get("/ledgers?name=wrong-name");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
        ) as string,
        items: [],
        total: 0,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
        },
      });
      expect(response.status).toBe(200);

      const { ledgers } = testEnv;

      // If we pass an existing name
      const response2 = await request(server).get(
        `/ledgers?name=${ledgers[0].ledgerName}`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10"
        ) as string,
        items: [
          {
            ledgerInfoId: ledgers[0].ledgerInfoId,
            href: expect.stringContaining(
              `/ledgers/${ledgers[0].ledgerInfoId}`
            ) as string,
          },
        ],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect(response2.status).toBe(200);
    });
  });

  describe("GET /ledgers/{ledgerInfoId}", () => {
    it("should throw an error if the ledger ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get("/ledgers/no-ledger");

      expect(response.body).toStrictEqual({
        detail: '["ledgerInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the ledger is not found", async () => {
      expect.assertions(3);

      const ledgerInfoId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(`/ledgers/${ledgerInfoId}`);

      expect(response.body).toStrictEqual({
        title: "Ledger Not Found",
        status: 404,
        detail: `Ledger ${ledgerInfoId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific ledger", async () => {
      expect.assertions(3);

      const ledger = testEnv.ledgers[0];

      // We expect it to return the last revision
      const revision = testEnv.ledgersRevisions[REVISIONS_TOTAL - 2]; // -2 because it's 0-based AND because ledgersRevisions contains only the updates

      const response = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}`
      );

      expect(response.body).toStrictEqual(revision.ledgerInfo);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });

  describe("GET /ledgers/{ledgerInfoId}/revisions", () => {
    it("should throw an error if the ledger info ID is not hexadecimal", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/ledgers/no-ledger/revisions"
      );

      expect(response.body).toStrictEqual({
        detail: '["ledgerInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the ledger info is not found", async () => {
      expect.assertions(2);

      const ledgerInfoId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/ledgers/${ledgerInfoId}/revisions`
      );

      expect(response.body).toStrictEqual({
        title: "Ledger Not Found",
        status: 404,
        detail: `Ledger ${ledgerInfoId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return a paginated collection of ledgers", async () => {
      expect.assertions(3);

      const ledger = testEnv.ledgers[0];

      const response = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const ledger = testEnv.ledgers[0];

      const response1 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[size]=2`
      );

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
      );

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=100&page[size]=2`
      );

      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1`
      );

      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const ledger = testEnv.ledgers[0];
      const response1 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[size]=100`
      );

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[size]=0`
      );

      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=0`
      );

      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions?page[after]=abc`
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

  describe("GET /ledgers/{ledgerInfoId}/revisions/{revisionHash}", () => {
    it("should throw an error if the ledger info ID is not hexadecimal", async () => {
      expect.assertions(2);

      const revision = testEnv.ledgersRevisions[0];

      const response = await request(server).get(
        `/ledgers/no-ledger/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["ledgerInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the ledger info is not found", async () => {
      expect.assertions(2);

      const ledgerInfoId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const revision = testEnv.ledgersRevisions[0];

      const response = await request(server).get(
        `/ledgers/${ledgerInfoId}/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Ledger Not Found",
        status: 404,
        detail: `Ledger ${ledgerInfoId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the revision hash is not hexadecimal", async () => {
      expect.assertions(2);

      const ledger = testEnv.ledgers[0];

      const response = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions/not-hexadecimal`
      );

      expect(response.body).toStrictEqual({
        detail: '["revisionHash must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the revision is not found", async () => {
      expect.assertions(2);

      const ledger = testEnv.ledgers[0];
      const revisionHash = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions/${revisionHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${revisionHash} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the expected revision", async () => {
      expect.assertions(3);

      const ledger = testEnv.ledgers[0];
      const revision = testEnv.ledgersRevisions[0];

      const response = await request(server).get(
        `/ledgers/${ledger.ledgerInfoId}/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual(revision.ledgerInfo);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });
});
