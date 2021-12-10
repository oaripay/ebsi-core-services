import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  HttpServer,
  ValidationPipe,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { FastifyInstance } from "fastify";
import { AdministratorsModule } from "./administrators.module";
import { AttributeObject } from "./administrators.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar__factory } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/tar";
import { AsyncReturnType } from "../../shared/types/async-return-type";

jest.setTimeout(60000);

const ADMINISTRATORS_TOTAL = 3;

describe("Administrators Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  const randomDid = EbsiWallet.createDid();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: ADMINISTRATORS_TOTAL,
    });
    const { tarContract } = testEnv;

    // Mock TAR contract
    jest
      .spyOn(ethers.providers, "WebSocketProvider")
      .mockImplementation(
        () =>
          new ethers.providers.BaseProvider(
            "any"
          ) as ethers.providers.WebSocketProvider
      );
    jest.spyOn(Tar__factory, "connect").mockImplementation(() => tarContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AdministratorsModule],
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
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /administrators", () => {
    it("should return a paginated collection of administrators", async () => {
      expect.assertions(3);

      const response = await request(server).get("/administrators");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        "/administrators?page[size]=2"
      );

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/administrators?page[after]=2&page[size]=2"
      );

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/administrators?page[after]=100&page[size]=2"
      );

      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        "/administrators?page[after]=1"
      );

      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/administrators?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: ADMINISTRATORS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/administrators?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/administrators?page[size]=100"
      );

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        "/administrators?page[size]=0"
      );

      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        "/administrators?page[after]=0"
      );

      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/administrators?page[after]=abc"
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

  describe("GET /administrators/{did}", () => {
    it("should return a specific administrator", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did;
      const adminAttribute = administrators[0].attribute;

      const response = await request(server).get(`/administrators/${adminDid}`);

      const data = Buffer.from(JSON.stringify(adminAttribute));
      const dataBase64 = data.toString("base64");
      const dataHash = ethers.utils.sha256(data);

      expect(response.body).toStrictEqual({
        did: adminDid,
        attributes: [
          {
            body: dataBase64,
            hash: dataHash.slice(2),
          },
        ],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get("/administrators/not-a-did");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/administrators/did:ebsi:z1234"
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/${randomDid}`
      );

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes", () => {
    it("should return the attributes of a specific administrator", async () => {
      expect.assertions(2);

      const { administrators } = testEnv;
      const adminDid = administrators[0].did;
      const adminAttribute = administrators[0].attribute;

      const response = await request(server).get(
        `/administrators/${adminDid}/attributes`
      );

      const data = Buffer.from(JSON.stringify(adminAttribute));
      const dataHash = ethers.utils.sha256(data).slice(2);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/administrators/${adminDid}/attributes`
        ) as string,
        items: [
          {
            href: expect.stringContaining(
              `/administrators/${adminDid}/attributes/${dataHash}`
            ) as string,
            id: dataHash,
          },
        ],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/administrators/${adminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/administrators/not-a-did/attributes"
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/administrators/did:ebsi:z1234/attributes"
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/${randomDid}/attributes`
      );

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes/{attributeId}", () => {
    let adminDid: string;
    let dataBase64: string;
    let dataHash: string;

    beforeAll(() => {
      const { administrators } = testEnv;
      adminDid = administrators[0].did;
      const data = Buffer.from(JSON.stringify(administrators[0].attribute));
      dataBase64 = data.toString("base64");
      dataHash = ethers.utils.sha256(data).slice(2);
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const url = `/administrators/${adminDid}/attributes/${dataHash}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        did: adminDid,
        attribute: {
          body: dataBase64,
          hash: dataHash,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/not-a-did/attributes/${dataHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/did:ebsi:z1234/attributes/${dataHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/${randomDid}/attributes/${dataHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when the attribute is not found", async () => {
      expect.assertions(4);

      const { administrators } = testEnv;
      const url = `/administrators/${adminDid}/attributes`;

      // Consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response1 = await request(server).get(`${url}/${attributeId}`);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a different did
      const data2 = Buffer.from(JSON.stringify(administrators[1].attribute));
      const attributeId4 = ethers.utils.sha256(data2);
      const response2 = await request(server).get(`${url}/${attributeId4}`);

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId4} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  describe("GET /administrators/{did}/attributes/{attributeId}/revisions", () => {
    let adminDid: string;
    let dataHash: string;

    beforeAll(() => {
      const { administrators } = testEnv;
      adminDid = administrators[0].did;
      const data = Buffer.from(JSON.stringify(administrators[0].attribute));
      dataHash = ethers.utils.sha256(data).slice(2);
    });

    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

      const url = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

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
      expect.assertions(6);

      const url = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

      const response1 = await request(server).get(`${url}?page[size]=3`);

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(url) as string,
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
        self: expect.stringContaining(url) as string,
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
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/not-a-did/attributes/${dataHash}/revisions`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/did:ebsi:z1234/attributes/${dataHash}/revisions`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/${randomDid}/attributes/${dataHash}/revisions`
      );

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the attribute is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/administrators/${adminDid}/attributes/wrong-hash/revisions`
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

      const url = `/administrators/${adminDid}/attributes/${dataHash}/revisions`;

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
