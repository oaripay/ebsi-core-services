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

describe("Track and Trace API v1 (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let lastDocuments: {
    documentId: string;
    href: string;
  }[] = [];

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

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    // Get last documents
    const getAllDocuments = await request(server).get(
      "/documents?page[size]=50",
    );
    const { total } = getAllDocuments.body as {
      total: number;
    };

    if (total > 50) {
      const getDocumentsLastPage = await request(server).get(
        `/documents?page[after]=${Math.ceil(total / 10)}&page[size]=10`,
      );
      const { items: documents } = getDocumentsLastPage.body as {
        items: {
          documentId: string;
          href: string;
        }[];
      };
      lastDocuments = documents;
    } else if (total > 0) {
      const { items: documents } = getAllDocuments.body as {
        items: {
          documentId: string;
          href: string;
        }[];
      };
      lastDocuments = documents;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /documents", () => {
    it("should return a paginated collection of documents", async () => {
      expect.assertions(2);

      const response = await request(server).get("/documents");

      const total =
        ((response.body as Record<string, unknown>)?.["total"] as number) ?? 0;

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/documents?page[after]=1&page[size]=10"),
        items:
          total > 0
            ? expect.arrayContaining([
                {
                  documentId: expect.stringContaining("0x"),
                  href: expect.stringContaining("/documents/"),
                },
              ])
            : [],
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/documents?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            `/documents?page[after]=${total > 10 ? 2 : 1}&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/documents?page[after]=${Math.max(Math.ceil(total / 10), 1)}&page[size]=10`,
          ),
        },
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
      if (lastDocuments.length === 0) {
        // eslint-disable-next-line no-console
        console.warn(
          "Test 'GET /documents/{documentId} should return a specific document' skipped",
        );
        return;
      }

      expect.assertions(4);

      const response = await request(server).get(
        `/documents/${lastDocuments[0]!.documentId}`,
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("documentId:"),
          controller: expect.arrayContaining([]),
          verificationMethod: expect.arrayContaining([]),
        }),
      );
      expect(
        response.body as { "@context": string | string[] }["@context"],
      ).toBeDefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(
        expect.stringContaining("application/documentId+ld+json"),
      );
    });

    it("should throw an error 400 if the document ID is not valid", async () => {
      expect.assertions(12);

      let response = await request(server).get("/documents/no-document");

      expect(response.body).toStrictEqual({
        detail:
          '["documentId must be a valid document ID (32 bytes encoded in hexadecimal and starting with 0x)"]',
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
          '["documentId must be a valid document ID (32 bytes encoded in hexadecimal and starting with 0x)"]',
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
          '["documentId must be a valid document ID (32 bytes encoded in hexadecimal and starting with 0x)"]',
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
          '["documentId must be a valid document ID (32 bytes encoded in hexadecimal and starting with 0x)"]',
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
});
