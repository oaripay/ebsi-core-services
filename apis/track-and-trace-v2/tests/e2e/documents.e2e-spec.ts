import { randomBytes } from "node:crypto";
import { describe, beforeAll, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import { useContainer } from "class-validator";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";

describe("Track and Trace API v2 - Documents (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let firstPageLastDocumentEvents: {
    eventId: string;
    href: string;
  }[] = [];
  let documentWithEvents: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    documentWithEvents = configService.get("testDocWithEvents", {
      infer: true,
    });

    // Get events of the last document of the first page (50 items)
    const getAllEvents = await request(server).get(
      `/documents/${documentWithEvents}/events?page[size]=50`,
    );

    const { items: events } = getAllEvents.body as {
      items: {
        eventId: string;
        href: string;
      }[];
    };
    firstPageLastDocumentEvents = events;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /documents", () => {
    it("should return a paginated collection of documents", async () => {
      expect.assertions(2);

      const response = await request(server).get("/documents");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([
          {
            documentId: expect.stringContaining("0x"),
            href: expect.stringContaining("/documents/"),
          },
        ]),
        pageSize: 10,
        links: expect.objectContaining({
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(`/documents?page[after]=`),
        }),
      });
      expect(response.status).toBe(200);
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

  describe("GET /documents/{documentId}", () => {
    it("should return a specific document", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/documents/${documentWithEvents}`,
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          metadata: expect.any(String),
          timestamp: {
            datetime: expect.any(String),
            source: expect.stringMatching(/^(block|external)$/),
            proof: expect.any(String),
          },
          events: expect.arrayContaining([]),
          creator: expect.any(String),
        }),
      );
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get("/documents/no-document");

      expect(response.body).toStrictEqual({
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
  });

  describe("GET /documents/{documentId}/events", () => {
    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get("/documents/no-document/events");

      expect(response.body).toStrictEqual({
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
      expect.assertions(2);

      const response = await request(server).get(
        `/documents/${documentWithEvents}/events`,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${documentWithEvents}/events?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([
          {
            eventId: expect.stringContaining("0x"),
            href: expect.stringContaining(
              `/documents/${documentWithEvents}/events/`,
            ),
          },
        ]),
        pageSize: 10,
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/documents/${documentWithEvents}/events?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/documents/${documentWithEvents}/events?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${documentWithEvents}/events?page[after]=`,
          ),
        }),
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const documentId = `0x${randomBytes(32).toString("hex")}`;

      const response1 = await request(server).get(
        `/documents/${documentId}/events?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/documents/${documentId}/events?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/documents/${documentId}/events?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/documents/${documentId}/events?page[after]=abc`,
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
    it("should return a specific event", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/documents/${documentWithEvents}/events/${firstPageLastDocumentEvents[0]!.eventId}`,
      );

      expect(response.body).toStrictEqual({
        metadata: expect.any(String),
        timestamp: {
          datetime: expect.any(String),
          source: expect.stringMatching(/^(block|external)$/),
          proof: expect.any(String),
        },
        externalHash: expect.any(String),
        hash: expect.stringMatching(/^0x/),
        origin: expect.any(String),
        sender: expect.stringMatching(/^did:/),
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

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

      const wrongDocumentId = `0x${randomBytes(32).toString("hex")}`;
      const wrongEventId = `0x${randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/documents/${wrongDocumentId}/events/${wrongEventId}`,
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

      const wrongEventId = `0x${randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/documents/${documentWithEvents}/events/${wrongEventId}`,
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
  });

  describe("GET /documents/{documentId}/accesses", () => {
    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get(
        "/documents/no-document/accesses",
      );

      expect(response.body).toStrictEqual({
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
        detail:
          '["documentId must be 32 bytes encoded in hexadecimal and start with 0x"]',
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
      expect.assertions(2);

      const response = await request(server).get(
        `/documents/${documentWithEvents}/accesses`,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/documents/${documentWithEvents}/accesses?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([
          {
            grantedBy: expect.stringMatching(/^did:/),
            permission: expect.stringMatching(/^(write|delegate|creator)$/),
            subject: expect.stringMatching(/^did:/),
            documentId: documentWithEvents,
          },
        ]),
        pageSize: 10,
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/documents/${documentWithEvents}/accesses?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/documents/${documentWithEvents}/accesses?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${documentWithEvents}/accesses?page[after]=`,
          ),
        }),
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const documentId = `0x${randomBytes(32).toString("hex")}`;

      const response1 = await request(server).get(
        `/documents/${documentId}/accesses?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/documents/${documentId}/accesses?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/documents/${documentId}/accesses?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/documents/${documentId}/accesses?page[after]=abc`,
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
