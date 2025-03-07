import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { useContainer } from "class-validator";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";

import { AppModule } from "../../src/app.module.ts";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.ts";
import { getServer } from "../utils/getServer.ts";

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
    const moduleFixture = await Test.createTestingModule({
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

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

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
        items: expect.arrayContaining([
          {
            documentId: expect.stringContaining("0x"),
            href: expect.stringContaining("/documents/"),
          },
        ]),
        links: expect.objectContaining({
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(`/documents?page[after]=`),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
        }),
        pageSize: 10,
        self: expect.stringContaining("/documents?page[after]=1&page[size]=10"),
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/documents?page[size]=100");
      expect(response1.body).toStrictEqual({
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/documents?page[size]=0");
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/documents?page[after]=0");
      expect(response3.body).toStrictEqual({
        detail: '["page[after] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/documents?page[after]=abc");
      expect(response4.body).toStrictEqual({
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        status: 400,
        title: "Bad Request",
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
          creator: expect.any(String),
          events: expect.arrayContaining([]),
          metadata: expect.any(String),
          timestamp: {
            datetime: expect.any(String),
            proof: expect.any(String),
            source: expect.stringMatching(/^(block|external)$/),
          },
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
        detail: `Document ${documentId} not found`,
        status: 404,
        title: "Document Not Found",
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
        detail: `Document ${documentId} not found`,
        status: 404,
        title: "Document Not Found",
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
        items: expect.arrayContaining([
          {
            eventId: expect.stringContaining("0x"),
            href: expect.stringContaining(
              `/documents/${documentWithEvents}/events/`,
            ),
          },
        ]),
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/documents/${documentWithEvents}/events?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${documentWithEvents}/events?page[after]=`,
          ),
          prev: expect.stringContaining(
            `/documents/${documentWithEvents}/events?page[after]=1&page[size]=10`,
          ),
        }),
        pageSize: 10,
        self: expect.stringContaining(
          `/documents/${documentWithEvents}/events?page[after]=1&page[size]=10`,
        ),
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
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/documents/${documentId}/events?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/documents/${documentId}/events?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        detail: '["page[after] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/documents/${documentId}/events?page[after]=abc`,
      );
      expect(response4.body).toStrictEqual({
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        status: 400,
        title: "Bad Request",
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
        externalHash: expect.any(String),
        hash: expect.stringMatching(/^0x/),
        metadata: expect.any(String),
        origin: expect.any(String),
        sender: expect.stringMatching(/^did:/),
        timestamp: {
          datetime: expect.any(String),
          proof: expect.any(String),
          source: expect.stringMatching(/^(block|external)$/),
        },
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
        detail: `Document ${wrongDocumentId} not found`,
        status: 404,
        title: "Document Not Found",
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
        detail: `Event ${wrongEventId} not found`,
        status: 404,
        title: "Event Not Found",
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
        detail: `Document ${documentId} not found`,
        status: 404,
        title: "Document Not Found",
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
        items: expect.arrayContaining([
          {
            documentId: documentWithEvents,
            grantedBy: expect.stringMatching(/^did:/),
            permission: expect.stringMatching(/^(write|delegate|creator)$/),
            subject: expect.stringMatching(/^did:/),
          },
        ]),
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/documents/${documentWithEvents}/accesses?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/documents/${documentWithEvents}/accesses?page[after]=`,
          ),
          prev: expect.stringContaining(
            `/documents/${documentWithEvents}/accesses?page[after]=1&page[size]=10`,
          ),
        }),
        pageSize: 10,
        self: expect.stringContaining(
          `/documents/${documentWithEvents}/accesses?page[after]=1&page[size]=10`,
        ),
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
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/documents/${documentId}/accesses?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/documents/${documentId}/accesses?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        detail: '["page[after] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/documents/${documentId}/accesses?page[after]=abc`,
      );
      expect(response4.body).toStrictEqual({
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });
});
