import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { HttpService } from "@nestjs/axios";
import { DidMethodsModule } from "./did-methods.module";
import { DidMethodResponseObject } from "./did-methods.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { DidRegistry__factory } from "../../contracts/did-registry";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerService } from "../ledger/ledger.service";

jest.setTimeout(120000);

const DID_METHODS_TOTAL = 3;

describe("DidMethods Module", () => {
  let app: INestApplication;
  let server: HttpService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let ledgerService: LedgerService;

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didMethodsTotal: DID_METHODS_TOTAL,
    });
    const { didRegistryContract } = testEnv;

    // Mock TSR contract
    jest
      .spyOn(DidRegistry__factory, "connect")
      .mockImplementation(() => didRegistryContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DidMethodsModule],
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
    server = app.getHttpServer() as HttpService;

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(didRegistryContract));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /did-methods", () => {
    it("should return a paginated collection of  DID methods", async () => {
      expect.assertions(3);

      const { didMethods } = testEnv;

      const response = await request(server).get("/did-methods");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-methods?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining(
          didMethods.map((method) => ({
            name: method.methodName,
            href: expect.stringContaining(
              `/did-methods/${method.methodName}`
            ) as string,
          }))
        ) as Array<string>,
        total: DID_METHODS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        DID_METHODS_TOTAL
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/did-methods?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-methods?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: DID_METHODS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/did-methods?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-methods?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: DID_METHODS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/did-methods?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-methods?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: DID_METHODS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/did-methods?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/did-methods?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-methods?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: DID_METHODS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/did-methods?page[size]=100"
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/did-methods?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/did-methods?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/did-methods?page[after]=abc"
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

  describe("GET /did-methods/{did}", () => {
    it("should return a specific DID Method", async () => {
      expect.assertions(2);

      const { didMethods } = testEnv;
      const {
        methodName,
        ledgerName,
        methodSpec,
        methodSpecHash,
        notBefore,
        notAfter,
        status,
      } = didMethods[0];

      const response = await request(server).get(`/did-methods/${methodName}`);

      expect(response.body).toStrictEqual({
        methodName,
        ledgerName,
        methodSpec,
        methodSpecHash,
        notBefore,
        notAfter,
        status,
      } as DidMethodResponseObject);
      expect(response.status).toBe(200);
    });

    it("should throw an error if the DID Method is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/did-methods/no-did-method");

      expect(response.body).toStrictEqual({
        title: "DID Method Not Found",
        status: 404,
        detail: "DID Method no-did-method not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
