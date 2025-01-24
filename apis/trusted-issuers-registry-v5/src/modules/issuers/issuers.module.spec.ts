import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import * as vcLib from "@cef-ebsi/verifiable-credential";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { methodNotAllowed, remove0xPrefix } from "@ebsiint-api/shared";
import { Tir__factory } from "@ebsiint-sc/trusted-issuers-registry-v3";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import axios, { AxiosError, AxiosResponse } from "axios";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { IssuerObject, setupTestEnv } from "../../../tests/utils/tir.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { IssuerTypeNames } from "./issuers.constants.js";
import { IssuersModule } from "./issuers.module.js";

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
  const randomDid = EbsiWallet.createDid();

  beforeAll(async () => {
    // Spin up test blockchain
    testEnv = await setupTestEnv({
      issuersTotal: ISSUERS_TOTAL,
    });
    const { tirContract } = testEnv;

    // Mock TIR contract
    vi.spyOn(Tir__factory, "connect").mockImplementation(
      // Create new instance without runner (provider)
      () => tirContract.connect(),
    );

    // Mock LedgerService
    vi.spyOn(LedgerService.prototype, "getProvider").mockImplementation(
      // @ts-expect-error Error due to a mismatch between ESM and CommonJS modules
      () => testEnv.provider,
    );

    rootTao = testEnv.issuers[0]!;
    issuer = testEnv.issuers.at(-1)!;
    issuer2 = testEnv.issuers.at(-2)!;

    const moduleFixture = await Test.createTestingModule({
      imports: [IssuersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /issuers", () => {
    it("should return a paginated collection of issuers", async () => {
      expect.assertions(3);

      const response = await request(server).get("/issuers");
      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
          next: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=10`),
        },
        pageSize: 10,
        self: expect.stringContaining("/issuers?page[after]=1&page[size]=10"),
        total: ISSUERS_TOTAL,
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/issuers?page[size]=3");
      expect(response1.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
          next: expect.stringContaining(`/issuers?page[after]=2&page[size]=3`),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
        },
        pageSize: 3,
        self: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
        total: ISSUERS_TOTAL,
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/issuers?page[after]=2&page[size]=3",
      );
      expect(response2.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
          next: expect.stringContaining(`/issuers?page[after]=3&page[size]=3`),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
        },
        pageSize: 3,
        self: expect.stringContaining(`/issuers?page[after]=2&page[size]=3`),
        total: ISSUERS_TOTAL,
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/issuers?page[after]=100&page[size]=3",
      );
      expect(response3.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`/issuers?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
          next: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
          prev: expect.stringContaining(`/issuers?page[after]=4&page[size]=3`),
        },
        pageSize: 3,
        self: expect.stringContaining(`/issuers?page[after]=100&page[size]=3`),
        total: ISSUERS_TOTAL,
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/issuers?page[after]=1");
      expect(response4.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            `/issuers?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
          next: expect.stringContaining(`/issuers?page[after]=2&page[size]=10`),
          prev: expect.stringContaining(`/issuers?page[after]=1&page[size]=10`),
        },
        pageSize: 10,
        self: expect.stringContaining(`/issuers?page[after]=1&page[size]=10`),
        total: ISSUERS_TOTAL,
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/issuers?page[size]=100");
      expect(response1.body).toStrictEqual({
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/issuers?page[size]=0");
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/issuers?page[after]=0");
      expect(response3.body).toStrictEqual({
        detail: '["page[after] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/issuers?page[after]=abc");
      expect(response4.body).toStrictEqual({
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });

    it("should reject a non whitelisted query", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers?invalid-query=abc");

      expect(response.body).toStrictEqual({
        detail: '["property invalid-query should not exist"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /issuers/{did}", () => {
    it("should return a specific issuer", async () => {
      expect.assertions(2);

      const response = await request(server).get(`/issuers/${issuer.did}`);

      expect(response.body).toStrictEqual({
        attributes: [
          {
            body: issuer.attribute.utf8,
            hash: remove0xPrefix(issuer.attribute.id),
            issuerType: IssuerTypeNames[issuer.issuerType],
            rootTao: rootTao.did,
            tao: issuer.tao,
          },
        ],
        did: issuer.did,
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
        items: [
          {
            href: expect.stringContaining(`${url}/${attributeId}`),
            id: attributeId,
          },
        ],
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        },
        pageSize: expect.any(Number),
        self: expect.stringContaining(url),
        total: expect.any(Number),
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
        attribute: {
          body: issuer.attribute.utf8,
          hash: attributeId,
          issuerType: IssuerTypeNames[issuer.issuerType],
          rootTao: rootTao.did,
          tao: issuer.tao,
        },
        did: issuer.did,
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        },
        pageSize: 10,
        self: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        total: 2,
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
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
        },
        pageSize: 3,
        self: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
        total: 2,
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `${url}?page[after]=2&page[size]=3`,
      );
      expect(response2.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=3`),
        },
        pageSize: 3,
        self: expect.stringContaining(`${url}?page[after]=2&page[size]=3`),
        total: 2,
      });
      expect((response2.body as { items: string }).items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get(`${url}?page[after]=1`);
      expect(response4.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          last: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          next: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
          prev: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        },
        pageSize: 10,
        self: expect.stringContaining(`${url}?page[after]=1&page[size]=10`),
        total: 2,
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the attribute is not found", async () => {
      expect.assertions(2);

      const wrongDataHash = randomBytes(32).toString("hex");
      const url = `/issuers/${issuer.did}/attributes/${wrongDataHash}/revisions`;

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        detail: `Attribute ${wrongDataHash} not found`,
        status: 404,
        title: "Attribute Not Found",
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
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(`${url}?page[size]=0`);
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
            data: "jwt",
            status: 200,
          });
        }

        return Promise.reject(new Error("Invalid url"));
      });

      // Mock VC Lib validation
      vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(
        (jwt: string) => {
          if (jwt === "jwt")
            return Promise.resolve({
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://w3id.org/vc/status-list/2021/v1",
              ],
              credentialSchema: {
                id: "https://example.net",
                type: "FullJsonSchemaValidator2021",
              },
              credentialSubject: {
                encodedList:
                  "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
                id: `${issuer.proxy.obj.prefix}${issuer.proxy.obj.testSuffix}#list`,
                statusPurpose: "revocation",
                type: "StatusList2021",
              },
              id: `${issuer.proxy.obj.prefix}${issuer.proxy.obj.testSuffix}`,
              issuanceDate: "2021-04-05T14:27:40Z",
              issued: "2021-04-05T14:27:40Z",
              issuer: issuer.did,
              type: [
                "VerifiableCredential",
                "VerifiableAttestation",
                "StatusList2021Credential",
              ],
              validFrom: "2021-04-05T14:27:40Z",
            });

          throw new Error("Invalid JWT");
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
          // eslint-disable-next-line unicorn/error-message
          const error = new Error() as AxiosError<string>;
          error.status = 500;
          error.response = {
            data: "Internal Server Error",
            status: 500,
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
            data: "jwt",
            status: 200,
          });
        }

        return Promise.reject(new Error("Invalid url"));
      });

      vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(() => {
        throw new Error("Invalid JWT");
      });

      const response = await request(server).get(url);

      expect(response.body).toStrictEqual({
        detail:
          "The Status List Credential returned by the Issuer's proxy is invalid",
        status: 500,
        title: "Invalid Status List Credential",
        type: "about:blank",
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
