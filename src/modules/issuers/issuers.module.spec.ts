import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import axios, { AxiosError, AxiosResponse } from "axios";
import * as vcLib from "@cef-ebsi/verifiable-credential";
import { IssuersModule } from "./issuers.module";
import { AttributeObject } from "./issuers.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { IssuerProxyObject, setupTestEnv } from "../../../tests/utils/tir";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerService } from "../../shared/services/ledger.service";
import { ApiConfig } from "../../config/configuration";

jest.setTimeout(90000);

const ISSUERS_TOTAL = 12;

describe("Issuers Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let configService: ConfigService<ApiConfig, true>;
  const randomDid = EbsiWallet.createDid();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
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

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = app.getHttpServer() as HttpServer;

    // Mock TIR contract
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(tirContract));
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
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

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/not-a-did");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/did:ebsi:z1234");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(`/issuers/${randomDid}`);

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
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

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/not-a-did/attributes"
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/did:ebsi:z1234/attributes"
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/attributes`
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /issuers/{did}/attributes/{attributeId}", () => {
    let attributeId: string;

    beforeAll(() => {
      const { issuers } = testEnv;
      const issuerAttribute = issuers[0].attributeData;
      attributeId = ethers.utils.sha256(issuerAttribute).slice(2);
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;
      const issuerAttribute = issuers[0].attributeData;
      const dataBase64 = issuerAttribute.toString("base64");
      const url = `/issuers/${issuerDid}/attributes/${attributeId}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        did: issuerDid,
        attribute: {
          body: dataBase64,
          hash: attributeId,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${attributeId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/attributes/${attributeId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/attributes/${attributeId}`
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when the attribute is not found", async () => {
      expect.assertions(4);

      const { issuers } = testEnv;
      const issuer1Did = issuers[0].did;

      // Consult a random attribute
      const wrongAttributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer1Did}/attributes/${wrongAttributeId}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${wrongAttributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a different did
      const issuer2Attribute = issuers[1].attributeData;
      const dataHash2 = ethers.utils.sha256(issuer2Attribute).slice(2);

      const response2 = await request(server).get(
        `/issuers/${issuer1Did}/attributes/${dataHash2}`
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${dataHash2} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  // TODO: for better tests, add more attributes revisions (currently: 1)
  describe("GET /issuers/{did}/attributes/{attributeId}/revisions", () => {
    let issuerDid: string;
    let issuerAttribute: Buffer;
    let dataHash: string;

    beforeAll(() => {
      const { issuers } = testEnv;
      issuerDid = issuers[0].did;
      issuerAttribute = issuers[0].attributeData;
      dataHash = ethers.utils.sha256(issuerAttribute).slice(2);
    });

    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

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

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${dataHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/attributes/${dataHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/attributes/${dataHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the attribute is not found", async () => {
      expect.assertions(2);

      const wrongDataHash = "wrong-hash";
      const url = `/issuers/${issuerDid}/attributes/${wrongDataHash}/revisions`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        detail: `Attribute ${wrongDataHash} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw Bad Request for bad pagination parameters", async () => {
      expect.assertions(4);

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

  describe("GET /issuers/{did}/proxies", () => {
    it("should return the proxies of a specific issuer", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuerDid = issuers[0].did;

      const url = `/issuers/${issuerDid}/proxies`;

      const response = await request(server).get(url);

      const issuer1ProxyData = issuers[0].rawProxyData;
      const issuer1ProxyId = ethers.utils.sha256(
        Buffer.from(JSON.stringify(issuer1ProxyData))
      );

      expect(response.body).toStrictEqual({
        items: [
          {
            href: expect.stringContaining(`${url}/${issuer1ProxyId}`) as string,
            proxyId: issuer1ProxyId,
          },
        ],
        total: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/not-a-did/proxies");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/did:ebsi:z1234/proxies"
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/proxies`
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /issuers/{did}/proxies/{proxyId}", () => {
    let issuer1ProxyId: string;
    let issuer1ProxyData: IssuerProxyObject;

    beforeAll(() => {
      const { issuers } = testEnv;
      issuer1ProxyData = issuers[0].rawProxyData;
      issuer1ProxyId = ethers.utils.sha256(
        Buffer.from(JSON.stringify(issuer1ProxyData))
      );
    });

    it("should return a specific proxy", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuer1Did = issuers[0].did;
      const url = `/issuers/${issuer1Did}/proxies/${issuer1ProxyId}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual(issuer1ProxyData);
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/proxies/${issuer1ProxyId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/proxies/${issuer1ProxyId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/proxies/${issuer1ProxyId}`
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when the proxy is not found", async () => {
      expect.assertions(4);

      const { issuers } = testEnv;
      const issuer1Did = issuers[0].did;

      // Consult a random proxy
      const wrongProxyId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer1Did}/proxies/${wrongProxyId}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${wrongProxyId} of issuer ${issuer1Did} can't be found`
        ) as string,
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a different did
      const issuer2Proxy = issuers[1].rawProxyData;
      const issuer2ProxyId = ethers.utils.sha256(
        Buffer.from(JSON.stringify(issuer2Proxy))
      );

      const response2 = await request(server).get(
        `/issuers/${issuer1Did}/proxies/${issuer2ProxyId}`
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${issuer2ProxyId} of issuer ${issuer1Did} can't be found`
        ) as string,
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  describe("GET /issuers/{did}/proxies/{proxyId}/{path}", () => {
    let issuer1ProxyId: string;
    let issuer1ProxyData: IssuerProxyObject;
    const subpath = "/credentials/status/3";

    beforeAll(() => {
      const { issuers } = testEnv;
      issuer1ProxyData = issuers[0].rawProxyData;
      issuer1ProxyId = ethers.utils.sha256(
        Buffer.from(JSON.stringify(issuer1ProxyData))
      );
    });

    it("should return a specifc StatusList2021Credential (JWT)", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuer1 = issuers[0];
      const issuer1Did = issuer1.did;
      const url = `/issuers/${issuer1Did}/proxies/${issuer1ProxyId}${subpath}`;

      // Mock issuer's endpoint response
      jest.spyOn(axios, "get").mockImplementation((requestUrl: string) => {
        if (requestUrl === `${issuer1ProxyData.prefix}${subpath}`) {
          return Promise.resolve({
            status: 200,
            data: "jwt",
          });
        }

        return Promise.reject(new Error("Invalid url"));
      });

      // Mock VC Lib validation
      jest
        .spyOn(vcLib, "verifyCredentialJwt")
        .mockImplementation(async (jwt: string) => {
          if (jwt === "jwt")
            return Promise.resolve({
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/vc/status-list/2021/v1",
              ],
              id: `${issuer1.rawProxyData.prefix}${issuer1.rawProxyData.testSuffix}`,
              type: ["VerifiableCredential", "StatusList2021Credential"],
              issuer: issuer1Did,
              issued: "2021-04-05T14:27:40Z",
              issuanceDate: "2021-04-05T14:27:40Z",
              validFrom: "2021-04-05T14:27:40Z",
              credentialSubject: {
                id: `${issuer1.rawProxyData.prefix}${issuer1.rawProxyData.testSuffix}#list`,
                type: "StatusList2021",
                statusPurpose: "revocation",
                encodedList:
                  "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
              },
              credentialSchema: {
                id: "https://example.net",
                type: "FullJsonSchemaValidator2021",
              },
            });

          return Promise.reject(new Error("Invalid JWT"));
        });

      const response = await request(server).get(url);

      expect(response.text).toBe("jwt");
      expect(response.status).toBe(200);
    });

    it("should return an error if the issuer's endpoint respond with a 500", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuer1 = issuers[0];
      const issuer1Did = issuer1.did;
      const url = `/issuers/${issuer1Did}/proxies/${issuer1ProxyId}${subpath}`;

      // Mock issuer's endpoint response
      jest.spyOn(axios, "get").mockImplementation((requestUrl: string) => {
        if (requestUrl === `${issuer1ProxyData.prefix}${subpath}`) {
          const error = new Error() as AxiosError<string>;
          error.status = "500";
          error.response = {
            status: 500,
            data: "Internal Server Error",
          } as AxiosResponse<string>;

          return Promise.reject(error);
        }

        return Promise.reject(new Error("Invalid url"));
      });

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        detail: "The Status List Credential can't be retrieved",
        status: 500,
        title: "Unreachable Status List Credential",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should return an error if the Status List VC returned by the endpoint is invalid", async () => {
      expect.assertions(2);

      const { issuers } = testEnv;
      const issuer1Did = issuers[0].did;
      const url = `/issuers/${issuer1Did}/proxies/${issuer1ProxyId}${subpath}`;

      jest.spyOn(axios, "get").mockImplementation((requestUrl: string) => {
        if (requestUrl === `${issuer1ProxyData.prefix}${subpath}`) {
          return Promise.resolve({
            status: 200,
            data: "jwt",
          });
        }

        return Promise.reject(new Error("Invalid url"));
      });

      jest.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(async () => {
        return Promise.reject(new Error("Invalid JWT"));
      });

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        title: "Invalid Status List Credential",
        status: 500,
        type: "about:blank",
        detail:
          "The Status List Credential returned by the Issuer's proxy is invalid",
      });
      expect(response.status).toBe(500);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const url = `/issuers/not-a-did/proxies/${issuer1ProxyId}${subpath}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const url = `/issuers/did:ebsi:z1234/proxies/${issuer1ProxyId}${subpath}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const url = `/issuers/${randomDid}/proxies/${issuer1ProxyId}${subpath}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when the proxy is not found", async () => {
      expect.assertions(4);

      const { issuers } = testEnv;
      const issuer1Did = issuers[0].did;

      // Consult a random proxy
      const wrongProxyId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer1Did}/proxies/${wrongProxyId}${subpath}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${wrongProxyId} of issuer ${issuer1Did} can't be found`
        ) as string,
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a different did
      const issuer2Proxy = issuers[1].rawProxyData;
      const issuer2ProxyId = ethers.utils.sha256(
        Buffer.from(JSON.stringify(issuer2Proxy))
      );

      const response2 = await request(server).get(
        `/issuers/${issuer1Did}/proxies/${issuer2ProxyId}${subpath}`
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${issuer2ProxyId} of issuer ${issuer1Did} can't be found`
        ) as string,
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });
});
