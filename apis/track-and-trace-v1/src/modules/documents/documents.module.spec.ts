import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace";
import { DocumentsModule } from "./documents.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trackAndTrace.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import type { Document } from "../../../tests/utils/data.js";

const DOCUMENTS = 3;

describe("Documents Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let configService: ConfigService<ApiConfig, true>;
  let documents: Document[];

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      documentsTotal: DOCUMENTS,
    });
    const { trackAndTraceContract } = testEnv;
    documents = testEnv.documents;

    // Mock TSR contract
    vi.spyOn(TrackAndTrace__factory, "connect").mockImplementation(
      () => trackAndTraceContract,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DocumentsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(trackAndTraceContract),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /documents", () => {
    it("should return a paginated collection of documents", async () => {
      expect.assertions(3);

      const response = await request(server).get("/documents");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=10"),
        items: expect.arrayContaining(
          documents.map((document) => ({
            documentId: document.documentHash,
            href: expect.stringContaining(
              `/documents/${document.documentHash}`,
            ),
          })),
        ),
        total: DOCUMENTS,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        DOCUMENTS,
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/documents?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=2"),
        items: expect.arrayContaining([]),
        total: DOCUMENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/documents?page[after]=2&page[size]=2",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=2&page[size]=2"),
        items: expect.arrayContaining([]),
        total: DOCUMENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/documents?page[after]=100&page[size]=2",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/documents?page[after]=100&page[size]=2",
        ),
        items: expect.arrayContaining([]),
        total: DOCUMENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/documents?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: DOCUMENTS,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/documents?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/documents?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/documents?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/documents?page[after]=abc");
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
});
