import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import axios, { AxiosError, AxiosResponse } from "axios";
import * as vcLib from "@cef-ebsi/verifiable-credential";
import { remove0xPrefix } from "@ebsiint-api/shared";
import { IssuersModule } from "./issuers.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { IssuerObject, setupTestEnv } from "../../../tests/utils/tir.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import { IssuerTypeNames } from "./issuers.constants.js";

const ISSUERS_TOTAL = 12;

vi.mock("@cef-ebsi/verifiable-credential", async () => {
  const mod = await vi.importActual<
    typeof import("@cef-ebsi/verifiable-credential")
  >("@cef-ebsi/verifiable-credential");

  return {
    ...mod,
  };
});

describe("Issuers Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let rootTao: IssuerObject;
  let issuer: IssuerObject;
  let issuer2: IssuerObject;
  let configService: ConfigService<ApiConfig, true>;
  const randomDid = EbsiWallet.createDid();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      issuersTotal: ISSUERS_TOTAL,
    });
    const { tirContract } = testEnv;
    rootTao = testEnv.issuers[0]!;
    issuer = testEnv.issuers[testEnv.issuers.length - 1]!;
    issuer2 = testEnv.issuers[testEnv.issuers.length - 2]!;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IssuersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = app.getHttpServer();

    // Mock TIR contract
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(tirContract),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /issuers", () => {
    it("should return a paginated collection of issuers", async () => {
      expect.assertions(3);

      const response = await request(server).get("/issuers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/issuers?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: ISSUERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
          last: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/issuers?page[size]=3");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
        items: expect.arrayContaining([]),
        total: ISSUERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          next: expect.stringContaining(`/issuers?page[after]=2&page[size]=3`),
          last: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/issuers?page[after]=2&page[size]=3",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(`/issuers?page[after]=2&page[size]=3`),
        items: expect.arrayContaining([]),
        total: ISSUERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          next: expect.stringContaining(`/issuers?page[after]=3&page[size]=3`),
          last: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/issuers?page[after]=100&page[size]=3",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(`/issuers?page[after]=100&page[size]=3`),
        items: expect.arrayContaining([]),
        total: ISSUERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
          next: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
          last: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/issuers?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(`/issuers?page[after]=1&page[size]=10`),
        items: expect.arrayContaining([]),
        total: ISSUERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
          last: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
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

      const response = await request(server).get(`/issuers/${issuer.did}`);

      expect(response.body).toStrictEqual({
        did: issuer.did,
        attributes: [
          {
            body: issuer.attribute.utf8,
            hash: remove0xPrefix(issuer.attribute.id),
            issuerType: IssuerTypeNames[issuer.issuerType],
            tao: issuer.tao,
            rootTao: rootTao.did,
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

      const url = `/issuers/${issuer.did}/attributes`;
      const attributeId = remove0xPrefix(issuer.attribute.id);

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(url),
        items: [
          {
            href: expect.stringContaining(`${url}/${attributeId}`),
            id: attributeId,
          },
        ],
        total: expect.any(Number),
        pageSize: expect.any(Number),
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/not-a-did/attributes",
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
        "/issuers/did:ebsi:z1234/attributes",
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
        `/issuers/${randomDid}/attributes`,
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
    it("should return the latest revision of a specific attribute", async () => {
      expect.assertions(2);

      const attributeId = remove0xPrefix(issuer.attribute.id);
      const url = `/issuers/${issuer.did}/attributes/${attributeId}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        did: issuer.did,
        attribute: {
          body: issuer.attribute.utf8,
          hash: attributeId,
          issuerType: IssuerTypeNames[issuer.issuerType],
          rootTao: rootTao.did,
          tao: issuer.tao,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${issuer.attribute.id}`,
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
        `/issuers/did:ebsi:z1234/attributes/${issuer.attribute.id}`,
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
        `/issuers/${randomDid}/attributes/${issuer.attribute.id}`,
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

      // Consult a random attribute
      const wrongAttributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer.did}/attributes/${wrongAttributeId}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${wrongAttributeId} not found`,
        ),
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      // Consult an attribute from a different did
      const dataHash2 = testEnv.issuers[1]!.attribute.id;

      const response2 = await request(server).get(
        `/issuers/${issuer.did}/attributes/${dataHash2}`,
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(`Attribute ${dataHash2} not found`),
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  // TODO: for better tests, add more attributes revisions (currently: 1)
  describe("GET /issuers/{did}/attributes/{attributeId}/revisions", () => {
    it("should return the revisions of a specific attribute", async () => {
      expect.assertions(3);

      const attributeId = issuer.attribute.id;
      const url = `/issuers/${issuer.did}/attributes/${attributeId}/revisions`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        items: expect.arrayContaining([]),
        total: 2,
        pageSize: 10,
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        },
      });

      expect((response.body as { items: string }).items).toHaveLength(2);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(9);

      const attributeId = issuer.attribute.id;
      const url = `/issuers/${issuer.did}/attributes/${attributeId}/revisions`;

      const response1 = await request(server).get(`${url}?page[size]=3`);

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
        items: expect.arrayContaining([]),
        total: 2,
        pageSize: 3,
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `${url}?page[after]=2&page[size]=3`,
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(`${url}?page[after]=2&page[size]=3`),
        items: expect.arrayContaining([]),
        total: 2,
        pageSize: 3,
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get(`${url}?page[after]=1`);
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        items: expect.arrayContaining([]),
        total: 2,
        pageSize: 10,
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(2);
      expect(response4.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const attributeId = issuer.attribute.id;
      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${attributeId}`,
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

      const attributeId = issuer.attribute.id;
      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/attributes/${attributeId}`,
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

      const attributeId = issuer.attribute.id;
      const response = await request(server).get(
        `/issuers/${randomDid}/attributes/${attributeId}`,
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
      const url = `/issuers/${issuer.did}/attributes/${wrongDataHash}/revisions`;

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

      const attributeId = issuer.attribute.id;
      const url = `/issuers/${issuer.did}/attributes/${attributeId}/revisions`;

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

      const url = `/issuers/${issuer.did}/proxies`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        items: [
          {
            href: expect.stringContaining(`${url}/${issuer.proxy.id}`),
            proxyId: issuer.proxy.id,
          },
        ],
        total: expect.any(Number),
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
        "/issuers/did:ebsi:z1234/proxies",
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
        `/issuers/${randomDid}/proxies`,
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
    it("should return a specific proxy", async () => {
      expect.assertions(2);

      const url = `/issuers/${issuer.did}/proxies/${issuer.proxy.id}`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual(issuer.proxy.obj);
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/proxies/${issuer.proxy.id}`,
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
        `/issuers/did:ebsi:z1234/proxies/${issuer.proxy.id}`,
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
        `/issuers/${randomDid}/proxies/${issuer.proxy.id}`,
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
      const issuer1Did = issuers[0]!.did;

      // Consult a random proxy
      const wrongProxyId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer1Did}/proxies/${wrongProxyId}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${wrongProxyId} of issuer ${issuer1Did} can't be found`,
        ),
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      const response2 = await request(server).get(
        `/issuers/${issuer.did}/proxies/${issuer2.proxy.id}`,
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${issuer2.proxy.id} of issuer ${issuer.did} can't be found`,
        ),
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  describe("GET /issuers/{did}/proxies/{proxyId}/{path}", () => {
    const subpath = "/credentials/status/3";

    it("should return a specific StatusList2021Credential (JWT)", async () => {
      expect.assertions(2);

      const url = `/issuers/${issuer.did}/proxies/${issuer.proxy.id}${subpath}`;

      // Mock issuer's endpoint response
      vi.spyOn(axios, "get").mockImplementation((requestUrl: string) => {
        if (requestUrl === `${issuer.proxy.obj.prefix}${subpath}`) {
          return Promise.resolve({
            status: 200,
            data: "jwt",
          });
        }

        return Promise.reject(new Error("Invalid url"));
      });

      // Mock VC Lib validation
      vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(
        async (jwt: string) => {
          if (jwt === "jwt")
            return Promise.resolve({
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/vc/status-list/2021/v1",
              ],
              id: `${issuer.proxy.obj.prefix}${issuer.proxy.obj.testSuffix}`,
              type: [
                "VerifiableCredential",
                "VerifiableAttestation",
                "StatusList2021Credential",
              ],
              issuer: issuer.did,
              issued: "2021-04-05T14:27:40Z",
              issuanceDate: "2021-04-05T14:27:40Z",
              validFrom: "2021-04-05T14:27:40Z",
              credentialSubject: {
                id: `${issuer.proxy.obj.prefix}${issuer.proxy.obj.testSuffix}#list`,
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
        },
      );

      const response = await request(server).get(url);

      expect(response.text).toBe("jwt");
      expect(response.status).toBe(200);
    });

    it("should return an error if the issuer's endpoint respond with a 500", async () => {
      expect.assertions(2);

      const url = `/issuers/${issuer.did}/proxies/${issuer.proxy.id}${subpath}`;

      // Mock issuer's endpoint response
      vi.spyOn(axios, "get").mockImplementation((requestUrl: string) => {
        if (requestUrl === `${issuer.proxy.obj.prefix}${subpath}`) {
          const error = new Error() as AxiosError<string>;
          error.status = 500;
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

      const url = `/issuers/${issuer.did}/proxies/${issuer.proxy.id}${subpath}`;

      vi.spyOn(axios, "get").mockImplementation((requestUrl: string) => {
        if (requestUrl === `${issuer.proxy.obj.prefix}${subpath}`) {
          return Promise.resolve({
            status: 200,
            data: "jwt",
          });
        }

        return Promise.reject(new Error("Invalid url"));
      });

      vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(async () => {
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

      const url = `/issuers/not-a-did/proxies/${issuer.proxy.id}${subpath}`;

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

      const url = `/issuers/did:ebsi:z1234/proxies/${issuer.proxy.id}${subpath}`;

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

      const url = `/issuers/${randomDid}/proxies/${issuer.proxy.id}${subpath}`;

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

      // Consult a random proxy
      const wrongProxyId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const url = `/issuers/${issuer.did}/proxies/${wrongProxyId}${subpath}`;

      const response1 = await request(server).get(url);

      expect(response1.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${wrongProxyId} of issuer ${issuer.did} can't be found`,
        ),
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response1.status).toBe(404);

      const response2 = await request(server).get(
        `/issuers/${issuer.did}/proxies/${issuer2.proxy.id}${subpath}`,
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Proxy ${issuer2.proxy.id} of issuer ${issuer.did} can't be found`,
        ),
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });
});
