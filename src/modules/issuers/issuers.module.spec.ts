import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { IssuersModule } from "./issuers.module";
import { AttributeObject } from "./issuers.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/tir";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerService } from "../../shared/services/ledger.service";

jest.setTimeout(90000);

const ADMINISTRATORS_TOTAL = 1;
const ISSUERS_TOTAL = 12;

describe("Issuers Module", () => {
  let app: INestApplication;
  let server: HttpService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: ADMINISTRATORS_TOTAL,
      issuersTotal: ISSUERS_TOTAL,
    });
    const { tirContract } = testEnv;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IssuersModule],
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

    // Mock TIR contract
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(tirContract));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /issuers", () => {
    it("should return a paginated collection of issuers", async () => {
      expect.assertions(3);

      const response = await request(server).get("/issuers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/issuers?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ISSUERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/issuers?page[after]=2&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/issuers?page[after]=2&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/issuers?page[size]=3");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/issuers?page[after]=1&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ISSUERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `/issuers?page[after]=2&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `/issuers?page[after]=4&page[size]=3`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/issuers?page[after]=2&page[size]=3"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/issuers?page[after]=2&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ISSUERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `/issuers?page[after]=3&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `/issuers?page[after]=4&page[size]=3`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/issuers?page[after]=100&page[size]=3"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/issuers?page[after]=100&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ISSUERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `/issuers?page[after]=4&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `/issuers?page[after]=4&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `/issuers?page[after]=4&page[size]=3`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/issuers?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/issuers?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ISSUERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/issuers?page[after]=2&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/issuers?page[after]=2&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/issuers?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/issuers?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/issuers?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/issuers?page[after]=abc");
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

  describe("GET /issuers/{did}", () => {
    it("should return a specific issuer", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;
      const issuerAttribute = issuers[0].attributeData;

      const response = await request(server).get(`/issuers/${issuerDid}`);
      const dataBase64 = issuerAttribute.toString("base64");
      const dataHash = ethers.utils.sha256(issuerAttribute);

      expect(response.body).toStrictEqual({
        did: issuerDid,
        attributes: [
          {
            body: dataBase64,
            hash: dataHash.slice(2),
          },
        ],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/no-issuer");

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: "Issuer no-issuer not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /issuers/{did}/attributes", () => {
    it("should return the attributes from a specific issuer", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;

      const url = `/issuers/${issuerDid}/attributes`;

      const response = await request(server).get(url);

      const issuerAttribute = issuers[0].attributeData;
      const dataHash = ethers.utils.sha256(issuerAttribute).slice(2);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(url) as string,
        items: [
          {
            href: expect.stringContaining(`${url}/${dataHash}`) as string,
            id: dataHash,
          },
        ],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /issuers/{did}/attributes/{attributeId}", () => {
    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;
      const issuerAttribute = issuers[0].attributeData;
      const dataBase64 = issuerAttribute.toString("base64");
      const dataHash = ethers.utils.sha256(issuerAttribute).slice(2);
      const url = `/issuers/${issuerDid}/attributes/${dataHash}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        did: issuerDid,
        attribute: {
          body: dataBase64,
          hash: dataHash,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error when the attribute is not found", async () => {
      expect.assertions(6);

      const { issuers } = testEnv;
      const issuer1Did = issuers[0].did;

      // Consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer1Did}/attributes/${attributeId}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult a valid attribute from a random issuer
      const issuer1Attribute = issuers[0].attributeData;
      const dataHash = ethers.utils.sha256(issuer1Attribute).slice(2);

      const response2 = await request(server).get(
        `/issuers/did:ebsi:unknown/attributes/${dataHash}`
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Issuer did:ebsi:unknown not found`
        ) as string,
        status: 404,
        title: "Issuer Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);

      // Consult an attribute from a different did
      const issuer2Attribute = issuers[1].attributeData;
      const dataHash2 = ethers.utils.sha256(issuer2Attribute).slice(2);

      const response3 = await request(server).get(
        `/issuers/${issuer1Did}/attributes/${dataHash2}`
      );

      expect(response3.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${dataHash2} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response3.status).toBe(404);
    });
  });

  // TODO: for better tests, add more attributes revisions (currently: 1)
  describe("GET /issuers/{did}/attributes/{attributeId}/revisions", () => {
    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;

      const issuerAttribute = issuers[0].attributeData;
      const dataHash = ethers.utils.sha256(issuerAttribute).slice(2);
      const url = `/issuers/${issuerDid}/attributes/${dataHash}/revisions`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `${url}?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
        },
      });

      expect((response.body as { items: string }).items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(9);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;

      const issuerAttribute = issuers[0].attributeData;
      const dataHash = ethers.utils.sha256(issuerAttribute).slice(2);
      const url = `/issuers/${issuerDid}/attributes/${dataHash}/revisions`;

      const response1 = await request(server).get(`${url}?page[size]=3`);

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `${url}?page[after]=1&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(1);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `${url}?page[after]=2&page[size]=3`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `${url}?page[after]=2&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=3`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get(`${url}?page[after]=1`);
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `${url}?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${url}?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(1);
      expect(response4.status).toBe(200);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = "unknown-issuer";
      const issuerAttribute = issuers[0].attributeData;
      const dataHash = ethers.utils.sha256(issuerAttribute).slice(2);
      const url = `/issuers/${issuerDid}/attributes/${dataHash}/revisions`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: "Issuer unknown-issuer not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the attribute is not found", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;
      const dataHash = "wrong-hash";
      const url = `/issuers/${issuerDid}/attributes/${dataHash}/revisions`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        detail: "Attribute wrong-hash not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw Bad Request for bad pagination parameters", async () => {
      expect.assertions(4);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;
      const issuerAttribute = issuers[0].attributeData;
      const dataHash = ethers.utils.sha256(issuerAttribute).slice(2);
      const url = `/issuers/${issuerDid}/attributes/${dataHash}/revisions`;

      const response1 = await request(server).get(`${url}?page[size]=100`);

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(`${url}?page[size]=0`);
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
    });
  });
});
