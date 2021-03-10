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
import { SchemasModule } from "./schemas.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  SchemaSCRegistry,
  SchemaSCRegistry__factory,
} from "../../contracts/trusted-schemas";
import { setupTestEnv } from "../../../tests/utils/schemaRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

jest.setTimeout(60000);

const SCHEMAS_TOTAL = 3;

describe("Schemas Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let schemasRegistryContract: SchemaSCRegistry;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      schemasTotal: SCHEMAS_TOTAL,
    });

    schemasRegistryContract = testEnv.schemasRegistryContract;

    // Mock Timestamp and TAR contract
    jest
      .spyOn(SchemaSCRegistry__factory, "connect")
      .mockImplementation(() => schemasRegistryContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SchemasModule],
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

  describe("GET /schemas", () => {
    it("should return a paginated collection of schemas", async () => {
      expect.assertions(3);

      const response = await request(server).get("/schemas");
      expect(response.body).toStrictEqual({
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
      expect((response.body as { items: string }).items).toHaveLength(3);
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
      expect((response4.body as { items: string }).items).toHaveLength(3);
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
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get("/schemas/no-schema");

      expect(response.body).toStrictEqual({
        detail:
          '["schemaId must be a hexadecimal number","schemaId must match /^0x/ regular expression"]',
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

    it("should return a specific schema", async () => {
      expect.assertions(3);

      const schema = testEnv.schemas[0];

      const response = await request(server).get(`/schemas/${schema.schemaId}`);

      expect(response.body).toStrictEqual(schema.schema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });
  });
});
