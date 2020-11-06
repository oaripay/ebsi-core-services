import request from "supertest";
import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import IssuersModule from "./issuers.module";
import { AttributeObject } from "./issuers.interface";
import AllExceptionsFilter from "../../filters/http-exception.filter";
import {
  mockTirContract,
  dummyData,
  jsonlds,
} from "../../../tests/utils/mockTirContract";
import { ledgerWorking } from "../../../tests/utils/mockAxios";

jest.setTimeout(20000);
jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("Issuers Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
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
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
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
        total: 20,
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
        total: 20,
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
            `/issuers?page[after]=7&page[size]=3`
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
        total: 20,
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
            `/issuers?page[after]=7&page[size]=3`
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
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `/issuers?page[after]=7&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `/issuers?page[after]=7&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `/issuers?page[after]=7&page[size]=3`
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
        total: 20,
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

      const response = await request(server).get("/issuers/did:ebsi:0x00");
      const data = Buffer.from(JSON.stringify(jsonlds[0]));
      const dataBase64 = data.toString("base64");
      const dataHash = ethers.utils.sha256(data);

      expect(response.body).toStrictEqual({
        did: "did:ebsi:0x00",
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

      const response = await request(server).get(
        "/issuers/did:ebsi:0x00/attributes"
      );
      const data = Buffer.from(JSON.stringify(jsonlds[0]));
      const dataHash = ethers.utils.sha256(data).slice(2);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/issuers/did:ebsi:0x00/attributes"
        ) as string,
        items: [
          {
            href: expect.stringContaining(
              `/issuers/did:ebsi:0x00/attributes/${dataHash}`
            ) as string,
            id: dataHash,
          },
        ],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            "/issuers/did:ebsi:0x00/attributes?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/issuers/did:ebsi:0x00/attributes?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/issuers/did:ebsi:0x00/attributes?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/issuers/did:ebsi:0x00/attributes?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /issuers/{did}/attributes/{attributeId}", () => {
    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const data = Buffer.from(JSON.stringify(jsonlds[1]));
      const dataBase64 = data.toString("base64");
      const dataHash = ethers.utils.sha256(data);
      const response = await request(server).get(
        `/issuers/did:ebsi:0x01/attributes/${dataHash}`
      );
      expect(response.body).toStrictEqual({
        did: "did:ebsi:0x01",
        attribute: {
          body: dataBase64,
          hash: dataHash.slice(2),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error when the attribute is not found", async () => {
      expect.assertions(6);

      // Consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response1 = await request(server).get(
        `/issuers/did:ebsi:0x01/attributes/${attributeId}`
      );

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a random did
      const response2 = await request(server).get(
        `/issuers/did:ebsi:unknown/attributes/${attributeId}`
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
      const data = Buffer.from(JSON.stringify(jsonlds[4]));
      const attributeId4 = ethers.utils.sha256(data);
      const response3 = await request(server).get(
        `/issuers/did:ebsi:0x02/attributes/${attributeId4}`
      );

      expect(response3.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId4} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response3.status).toBe(404);
    });
  });

  describe("GET /issuers/{did}/attributes/{attributeId}/revisions", () => {
    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

      const did = "did:ebsi:0x12";
      const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
      const dataHash = ethers.utils.sha256(data);
      const urlPath = `/issuers/${did}/attributes/${dataHash}/revisions`;

      const response = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `${urlPath}?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 20,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=2&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=2&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const did = "did:ebsi:0x12";
      const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
      const dataHash = ethers.utils.sha256(data);
      const urlPath = `/issuers/${did}/attributes/${dataHash}/revisions`;

      const response1 = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions?page[size]=3`
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `${urlPath}?page[after]=1&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=2&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=7&page[size]=3`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions?page[after]=2&page[size]=3`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `${urlPath}?page[after]=2&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=3&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=7&page[size]=3`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions?page[after]=100&page[size]=3`
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `${urlPath}?page[after]=100&page[size]=3`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 20,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=3`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=7&page[size]=3`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=7&page[size]=3`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=7&page[size]=3`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions?page[after]=1`
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `${urlPath}?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: 20,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `${urlPath}?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `${urlPath}?page[after]=2&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `${urlPath}?page[after]=2&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const did = "did:ebsi:0x12";
      const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
      const dataHash = ethers.utils.sha256(data);

      const response = await request(server).get(
        `/issuers/unknown-issuer/attributes/${dataHash}/revisions`
      );

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

      const did = "did:ebsi:0x12";

      const response = await request(server).get(
        `/issuers/${did}/attributes/wrong-hash/revisions`
      );

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

      const did = "did:ebsi:0x12";
      const data = Buffer.from(JSON.stringify(dummyData[did][0].attribute));
      const dataHash = ethers.utils.sha256(data);

      const response1 = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions?page[size]=100`
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/issuers/${did}/attributes/${dataHash}/revisions?page[size]=0`
      );
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
