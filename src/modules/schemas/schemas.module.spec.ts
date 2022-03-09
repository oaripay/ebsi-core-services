import crypto from "crypto";
import request from "supertest";
import { ethers } from "ethers";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { SchemasModule } from "./schemas.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/schemaRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { ItemsList } from "./schemas.interface";
import { ContractService } from "../../shared/services/contract.service";
import { hexToMultibaseBase58Btc } from "./schemas.utils";

const SCHEMAS_TOTAL = 3;
const SCHEMA_REVISIONS_TOTAL = 3;
const SCHEMA_METADATA_TOTAL = 3;

describe("Schemas Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let contractService: ContractService;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      schemasTotal: SCHEMAS_TOTAL,
      schemaRevisionsTotal: SCHEMA_REVISIONS_TOTAL,
      schemaMetadataTotal: SCHEMA_METADATA_TOTAL,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SchemasModule],
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

    // Mock TSR contract
    jest
      .spyOn(contractService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(testEnv.schemasRegistryContract)
      );
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /schemas", () => {
    it("should return a paginated collection of schemas", async () => {
      expect.assertions(3);

      const response = await request(server).get("/schemas");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/schemas?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining(
          testEnv.schemas.map((schema) => {
            const schemaId = hexToMultibaseBase58Btc(schema.schemaId);
            return {
              schemaId,
              href: expect.stringContaining(`/schemas/${schemaId}`) as string,
            };
          })
        ) as Array<string>,
        total: SCHEMAS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        SCHEMAS_TOTAL
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/schemas?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/schemas?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMAS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/schemas?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/schemas?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMAS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/schemas?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/schemas?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMAS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/schemas?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/schemas?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/schemas?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMAS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(
        SCHEMAS_TOTAL
      );
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/schemas?page[size]=100");
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

      const response2 = await request(server).get("/schemas?page[size]=0");
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

      const response3 = await request(server).get("/schemas?page[after]=0");
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

      const response4 = await request(server).get("/schemas?page[after]=abc");
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
  });

  describe("GET /schemas/{schemaId}", () => {
    it("should throw an error if the schema ID is not hexadecimal or multibase base58btc", async () => {
      expect.assertions(3);

      const response = await request(server).get("/schemas/no-schema");

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the multibase base58btc schema ID is not 32 bytes long", async () => {
      expect.assertions(3);

      const schemaId = hexToMultibaseBase58Btc(
        crypto.randomBytes(24).toString("hex")
      );

      const response = await request(server).get(`/schemas/${schemaId}`);

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(`/schemas/${schemaId}`);

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${schemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found (multibase base58btc)", async () => {
      expect.assertions(3);

      const schemaId = hexToMultibaseBase58Btc(
        crypto.randomBytes(32).toString("hex")
      );
      const response = await request(server).get(`/schemas/${schemaId}`);

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${schemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific schema identified by an hexadecimal schema ID", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];

      const response = await request(server).get(`/schemas/${schema.schemaId}`);

      // Expect to receive the last revision
      const revision = testEnv.schemaRevisions[SCHEMA_REVISIONS_TOTAL - 2];

      expect(response.body).toStrictEqual(revision.schema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should return a specific schema identified by a multibase base58btc schema ID", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const schemaId = hexToMultibaseBase58Btc(schema.schemaId);

      const response = await request(server).get(`/schemas/${schemaId}`);

      // Expect to receive the last revision
      const revision = testEnv.schemaRevisions[SCHEMA_REVISIONS_TOTAL - 2];

      expect(response.body).toStrictEqual(revision.schema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        "/schemas/no-schema/revisions"
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/schemas/${schemaId}/revisions`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${schemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;

      const response1 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=100`
      );
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

      const response2 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=0`
      );
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

      const response3 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=0`
      );
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

      const response4 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=abc`
      );
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

    it("should throw an error if valid-at query parameter is not valid", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];

      const response = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?valid-at=abc`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["valid-at must be a valid ISO 8601 date string"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return the revisions of the specified schema", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaRevisions } = testEnv;

      const response = await request(server).get(
        `/schemas/${schema.schemaId}/revisions`
      );

      const revisionId1 = ethers.utils.sha256(schema.serializedSchema);
      const revisionId2 = ethers.utils.sha256(
        schemaRevisions[0].serializedSchema
      );
      const revisionId3 = ethers.utils.sha256(
        schemaRevisions[1].serializedSchema
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId1}`
            ) as string,
            schemaRevisionId: revisionId1,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId2}`
            ) as string,
            schemaRevisionId: revisionId2,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId3}`
            ) as string,
            schemaRevisionId: revisionId3,
          },
        ]) as ItemsList[],
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        total: SCHEMA_REVISIONS_TOTAL,
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should return the revisions valid at a specific date", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaRevisions } = testEnv;
      const validAt = new Date().toISOString();

      const response = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?valid-at=${validAt}`
      );

      const revisionId1 = ethers.utils.sha256(schema.serializedSchema);
      const revisionId2 = ethers.utils.sha256(
        schemaRevisions[0].serializedSchema
      );
      const revisionId3 = ethers.utils.sha256(
        schemaRevisions[1].serializedSchema
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId1}`
            ) as string,
            schemaRevisionId: revisionId1,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId2}`
            ) as string,
            schemaRevisionId: revisionId2,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId3}`
            ) as string,
            schemaRevisionId: revisionId3,
          },
        ]) as ItemsList[],
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        total: SCHEMA_REVISIONS_TOTAL,
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const schema = testEnv.schemas[0];

      const response1 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[size]=2`
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[after]=100&page[size]=2`
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[after]=1`
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(
        SCHEMA_REVISIONS_TOTAL
      );
      expect(response4.status).toBe(200);
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${schemaRevisionId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${schemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/no-revision`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision is not found", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${schemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific schema revision", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = ethers.utils.sha256(schema.serializedSchema);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}`
      );

      expect(response.body).toStrictEqual(schema.schema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const schema = testEnv.schemas[0];

      const response1 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[size]=2`
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[after]=100&page[size]=2`
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions?page[after]=1`
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(
        SCHEMA_REVISIONS_TOTAL
      );
      expect(response4.status).toBe(200);
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${schemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${schemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/no-revision/metadata`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision is not found", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${schemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return the metadata of the specified schema revision", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const revisionId = ethers.utils.sha256(schema.serializedSchema);
      const metadataId = ethers.utils.sha256(schema.serializedMetadata);
      const { schemaMetadata } = testEnv;
      const metadataId2 = ethers.utils.sha256(
        schemaMetadata[0].serializedMetadata
      );
      const metadataId3 = ethers.utils.sha256(
        schemaMetadata[1].serializedMetadata
      );

      const response = await request(server).get(
        `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata/${metadataId}`
            ) as string,
            metadataId,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata/${metadataId2}`
            ) as string,
            metadataId: metadataId2,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata/${metadataId3}`
            ) as string,
            metadataId: metadataId3,
          },
        ]) as ItemsList[],
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
        ) as string,
        total: SCHEMA_METADATA_TOTAL,
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const schema = testEnv.schemas[0];
      const revisionId = ethers.utils.sha256(schema.serializedSchema);

      const response1 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[size]=2`
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=100&page[size]=2`
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1`
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SCHEMA_REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schema.schemaId}/revisions/${revisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(
        SCHEMA_REVISIONS_TOTAL
      );
      expect(response4.status).toBe(200);
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata/{metadataId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const metadataId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${schemaRevisionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const metadataId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${schemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const metadataId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/no-revision/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision is not found", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const metadataId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${schemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the metadata ID is not hexadecimal", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = ethers.utils.sha256(schema.serializedSchema);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/no-metadata`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["metadataId must be a hexadecimal number","metadataId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision metadata is not found", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const metadataId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${schemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return the expected metadata", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];
      const { schemaId } = schema;
      const schemaRevisionId = ethers.utils.sha256(schema.serializedSchema);
      const metadataId = ethers.utils.sha256(schema.serializedMetadata);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual(schema.metadata);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });
});
