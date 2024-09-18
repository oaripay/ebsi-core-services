import { randomBytes } from "node:crypto";
import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace";
import { DocumentsModule } from "./documents.module.js";
import type {
  Document,
  DocumentAccesses,
  Event,
} from "./documents.interface.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trackAndTrace.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { TestDocument } from "../../../tests/utils/data.js";

const DOCUMENTS_WITH_BLOCK_SOURCE = 3;
const DOCUMENTS_WITH_EXTERNAL_SOURCE = 3;
const DOCUMENT_EVENTS = 3;

describe("Documents Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let documentsWithBlockSource: TestDocument[];
  let documentsWithExternalSource: TestDocument[];

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      documentsWithBlockSourceTotal: DOCUMENTS_WITH_BLOCK_SOURCE,
      documentsWithExternalSourceTotal: DOCUMENTS_WITH_EXTERNAL_SOURCE,
      documentEventsTotal: DOCUMENT_EVENTS,
    });
    const { trackAndTraceContract } = testEnv;
    documentsWithBlockSource = testEnv.documentsWithBlockSource;
    documentsWithExternalSource = testEnv.documentsWithExternalSource;

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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
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
        items: [
          ...documentsWithBlockSource.map((document) => ({
            documentId: document.documentHash,
            href: expect.stringContaining(
              `/documents/${document.documentHash}`,
            ),
          })),
          ...documentsWithExternalSource.map((document) => ({
            documentId: document.documentHash,
            href: expect.stringContaining(
              `/documents/${document.documentHash}`,
            ),
          })),
        ],
        total: DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
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
        DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const allDocs = [
        ...documentsWithBlockSource.map((document) => ({
          documentId: document.documentHash,
          href: expect.stringContaining(`/documents/${document.documentHash}`),
        })),
        ...documentsWithExternalSource.map((document) => ({
          documentId: document.documentHash,
          href: expect.stringContaining(`/documents/${document.documentHash}`),
        })),
      ];

      const response1 = await request(server).get("/documents?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=2"),
        items: allDocs.slice(0, 2),
        total: DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
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
            "/documents?page[after]=3&page[size]=2",
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
        items: allDocs.slice(2, 4),
        total: DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=3&page[size]=2",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=3&page[size]=2",
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(2);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/documents?page[after]=100&page[size]=2",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/documents?page[after]=100&page[size]=2",
        ),
        items: [],
        total: DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=2",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=3&page[size]=2",
          ),
          next: expect.stringContaining(
            "/documents?page[after]=3&page[size]=2",
          ),
          last: expect.stringContaining(
            "/documents?page[after]=3&page[size]=2",
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/documents?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=10"),
        items: allDocs,
        total: DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
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
      expect((response4.body as { items: string }).items).toHaveLength(
        DOCUMENTS_WITH_BLOCK_SOURCE + DOCUMENTS_WITH_EXTERNAL_SOURCE,
      );
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

    it("should reject a non whitelisted query", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/documents?invalid-query=abc",
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

  describe("GET /documents/{documentId}", () => {
    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get("/documents/no-document");

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get("/documents/0xnothexadecimal");

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/${randomBytes(32).toString("hex")}`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/0x${randomBytes(24).toString("hex")}`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the document is not found", async () => {
      expect.assertions(3);

      const documentId = `0x${randomBytes(32).toString("hex")}`;
      const response = await request(server).get(`/documents/${documentId}`);

      expect(response.body).toStrictEqual({
        title: "Document Not Found",
        status: 404,
        detail: `Document ${documentId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific document with block source identified by its document ID", async () => {
      expect.assertions(3);

      const document = testEnv.documentsWithBlockSource[0]!;

      const response = await request(server).get(
        `/documents/${document.documentHash}`,
      );

      expect(response.body).toStrictEqual({
        metadata: document.documentMetadata,
        timestamp: {
          datetime: document.timestamp.datetime,
          source: "block",
          proof: document.timestamp.proof,
        },
        events: document.events.map((event) => event.eventHash),
        creator: document.didEbsiCreator,
      } satisfies Document);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should return a specific document with external source identified by its document ID", async () => {
      expect.assertions(3);

      const document = testEnv.documentsWithExternalSource[0]!;

      const response = await request(server).get(
        `/documents/${document.documentHash}`,
      );

      expect(response.body).toStrictEqual({
        metadata: document.documentMetadata,
        timestamp: {
          datetime: expect.stringMatching(/^0x/),
          source: "external",
          proof: document.timestamp?.proof,
        },
        events: [],
        creator: document.didEbsiCreator,
      } satisfies Document);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/json"));
    });
  });

  describe("GET /documents/{documentId}/events", () => {
    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get("/documents/no-document/events");

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        "/documents/0xnothexadecimal/events",
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/${randomBytes(32).toString("hex")}/events`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/0x${randomBytes(24).toString("hex")}/events`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the document is not found", async () => {
      expect.assertions(3);

      const documentId = `0x${randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/documents/${documentId}/events`,
      );

      expect(response.body).toStrictEqual({
        title: "Document Not Found",
        status: 404,
        detail: `Document ${documentId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a paginated collection of events", async () => {
      expect.assertions(3);

      const document = testEnv.documentsWithBlockSource[0]!;

      const response = await request(server).get(
        `/documents/${document.documentHash}/events`,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
        ),
        items: document.events.map((event) => ({
          eventId: event.eventHash,
          href: expect.stringContaining(
            `/documents/${document.documentHash}/events/${event.eventHash}`,
          ),
        })),
        total: DOCUMENT_EVENTS,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        DOCUMENT_EVENTS,
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const document = testEnv.documentsWithBlockSource[0]!;

      const response1 = await request(server).get(
        `/documents/${document.documentHash}/events?page[size]=2`,
      );

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/events?page[after]=1&page[size]=2`,
        ),
        items: document.events.slice(0, 2).map((event) => ({
          eventId: event.eventHash,
          href: expect.stringContaining(
            `/documents/${document.documentHash}/events/${event.eventHash}`,
          ),
        })),
        total: DOCUMENT_EVENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(
        Math.min(DOCUMENT_EVENTS, 2),
      );
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
        ),
        items: document.events.slice(2, 4).map((event) => ({
          eventId: event.eventHash,
          href: expect.stringContaining(
            `/documents/${document.documentHash}/events/${event.eventHash}`,
          ),
        })),
        total: DOCUMENT_EVENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(
        document.events.slice(2, 4).length,
      );
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/documents/${document.documentHash}/events?page[after]=100&page[size]=2`,
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/events?page[after]=100&page[size]=2`,
        ),
        items: [],
        total: DOCUMENT_EVENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=2&page[size]=2`,
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/documents/${document.documentHash}/events?page[after]=1`,
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
        ),
        items: document.events.map((event) => ({
          eventId: event.eventHash,
          href: expect.stringContaining(
            `/documents/${document.documentHash}/events/${event.eventHash}`,
          ),
        })),
        total: DOCUMENT_EVENTS,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/events?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(
        DOCUMENT_EVENTS,
      );
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const document = testEnv.documentsWithBlockSource[0]!;

      const response1 = await request(server).get(
        `/documents/${document.documentHash}/events?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/documents/${document.documentHash}/events?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/documents/${document.documentHash}/events?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/documents/${document.documentHash}/events?page[after]=abc`,
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

  describe("GET /documents/{documentId}/events/{eventId}", () => {
    it("should throw an error 400 if the document ID or event ID are not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get(
        "/documents/no-document/events/no-event",
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
          "eventId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        "/documents/0xnothexadecimal/events/0xnothexadecimal",
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
          "eventId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/${randomBytes(32).toString("hex")}/events/${randomBytes(32).toString("hex")}`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
          "eventId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/0x${randomBytes(24).toString("hex")}/events/0x${randomBytes(24).toString("hex")}`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
          "eventId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the document is not found", async () => {
      expect.assertions(3);

      const document = testEnv.documentsWithBlockSource[0]!;
      const wrongDocumentId = `0x${randomBytes(32).toString("hex")}`;
      const event = document.events[0]!;
      const response = await request(server).get(
        `/documents/${wrongDocumentId}/events/${event.eventHash}`,
      );

      expect(response.body).toStrictEqual({
        title: "Document Not Found",
        status: 404,
        detail: `Document ${wrongDocumentId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the event is not found", async () => {
      expect.assertions(3);

      const document = testEnv.documentsWithBlockSource[0]!;
      const wrongEventId = `0x${randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/documents/${document.documentHash}/events/${wrongEventId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Event Not Found",
        status: 404,
        detail: `Event ${wrongEventId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific event identified by its document ID and event ID", async () => {
      expect.assertions(3);

      const document = testEnv.documentsWithBlockSource[0]!;
      const event = document.events[0]!;

      const response = await request(server).get(
        `/documents/${document.documentHash}/events/${event.eventHash}`,
      );

      expect(response.body).toStrictEqual({
        metadata: event.metadata,
        timestamp: {
          datetime: event.timestamp.datetime,
          source: "block",
          proof: event.timestamp.proof,
        },
        externalHash: event.externalHash,
        hash: expect.stringMatching(/^0x/),
        origin: event.origin,
        sender: event.sender,
      } satisfies Event);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/json"));
    });
  });

  describe("GET /documents/{documentId}/accesses", () => {
    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get(
        "/documents/no-document/accesses",
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        "/documents/0xnothexadecimal/accesses",
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/${randomBytes(32).toString("hex")}/accesses`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      response = await request(server).get(
        `/documents/0x${randomBytes(24).toString("hex")}/accesses`,
      );

      expect(response.body).toStrictEqual({
        detail: JSON.stringify([
          "documentId must be 32 bytes encoded in hexadecimal and start with 0x",
        ]),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the document is not found", async () => {
      expect.assertions(3);

      const documentId = `0x${randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/documents/${documentId}/accesses`,
      );

      expect(response.body).toStrictEqual({
        title: "Document Not Found",
        status: 404,
        detail: `Document ${documentId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a paginated collection of accesses", async () => {
      expect.assertions(3);

      const { grantedDidEbsiAccount, grantedDidKeyAccount } = testEnv;
      const document = testEnv.documentsWithBlockSource[0]!;

      const response = await request(server).get(
        `/documents/${document.documentHash}/accesses`,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
        ),
        items: [
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "creator",
            subject: document.didEbsiCreator,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "delegate",
            subject: grantedDidEbsiAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "write",
            subject: grantedDidEbsiAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "delegate",
            subject: grantedDidKeyAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "write",
            subject: grantedDidKeyAccount,
          },
        ] satisfies DocumentAccesses,
        total: 5,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(5);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const { grantedDidEbsiAccount, grantedDidKeyAccount } = testEnv;
      const document = testEnv.documentsWithBlockSource[0]!;

      const response1 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[size]=2`,
      );

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=2`,
        ),
        items: [
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "creator",
            subject: document.didEbsiCreator,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "delegate",
            subject: grantedDidEbsiAccount,
          },
        ] satisfies DocumentAccesses,
        total: 5,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=2&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=3&page[size]=2`,
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[after]=2&page[size]=2`,
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/accesses?page[after]=2&page[size]=2`,
        ),
        items: [
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "write",
            subject: grantedDidEbsiAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "delegate",
            subject: grantedDidKeyAccount,
          },
        ] satisfies DocumentAccesses,
        total: 5,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=3&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=3&page[size]=2`,
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(2);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[after]=100&page[size]=2`,
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/accesses?page[after]=100&page[size]=2`,
        ),
        items: [],
        total: 5,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=2`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=3&page[size]=2`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=3&page[size]=2`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=3&page[size]=2`,
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[after]=1`,
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
        ),
        items: [
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "creator",
            subject: document.didEbsiCreator,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "delegate",
            subject: grantedDidEbsiAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "write",
            subject: grantedDidEbsiAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "delegate",
            subject: grantedDidKeyAccount,
          },
          {
            grantedBy: document.didEbsiCreator,
            documentId: document.documentHash,
            permission: "write",
            subject: grantedDidKeyAccount,
          },
        ] satisfies DocumentAccesses,
        total: 5,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/documents/${document.documentHash}/accesses?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(5);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const document = testEnv.documentsWithBlockSource[0]!;

      const response1 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/documents/${document.documentHash}/accesses?page[after]=abc`,
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
});
