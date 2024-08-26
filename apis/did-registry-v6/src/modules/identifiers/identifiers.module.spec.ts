import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { DidRegistry__factory } from "@ebsiint-sc/did-registry-v4";
import { graphServer } from "../../../tests/mocks/node.js";
import { dids } from "../../../tests/mocks/handlers.js";
import { IdentifiersModule } from "./identifiers.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/didRegistry.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { UserDetails } from "../../../tests/utils/data.js";
import {
  did1,
  did2,
  did3,
  didDocument,
} from "../../../tests/utils/constants.js";

const DID_DOCUMENTS = 3;

describe("Identifiers Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let users: UserDetails[];

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocumentsTotal: DID_DOCUMENTS,
    });
    const { didRegistryContract } = testEnv;
    users = testEnv.users;

    // Mock TSR contract
    vi.spyOn(DidRegistry__factory, "connect").mockImplementation(
      () => didRegistryContract,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IdentifiersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(didRegistryContract),
    );

    graphServer.listen({
      // This is to ignore GET/POST Requests and only focus on GraphQL
      onUnhandledRequest: "bypass",
    });
  });

  afterAll(async () => {
    await app.close();
    graphServer.close();
  });

  describe("GET /identifiers", () => {
    it("should return a paginated collection of DID documents", async () => {
      expect.assertions(3);

      const response = await request(server).get("/identifiers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining(
          dids.map((did) => ({
            did: did.didDocument.id,
            href: expect.stringContaining(`/identifiers/${did.didDocument.id}`),
          })),
        ),
        pageSize: 10,
        links: {
          prev: expect.stringContaining("/identifiers?page[size]=10"),
          next: expect.stringContaining("/identifiers?page[size]=10"),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        dids.length,
      );
      expect(response.status).toBe(200);
    });

    it("should return an empty array for an unknown controller", async () => {
      expect.assertions(2);

      const controller = EbsiWallet.createDid();

      const response = await request(server).get(
        `/identifiers?controller=${controller}`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&controller=${controller}`,
        ),
        items: [],
        pageSize: 10,
        links: {
          prev: expect.stringContaining(
            `/identifiers?page[size]=10&controller=${controller}`,
          ),
          next: expect.stringContaining(
            `/identifiers?page[size]=10&controller=${controller}`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return DIDs filtered by controller", async () => {
      expect.assertions(2);

      const controller = "did:ebsi:z23FGxCRmGZmei6uY3KCseXA";

      const response = await request(server).get(
        `/identifiers?controller=${controller}`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&controller=${controller}`,
        ),
        items: [
          {
            did: controller,
            href: expect.any(String),
          },
        ],
        pageSize: 10,
        links: {
          prev: expect.stringContaining(
            `/identifiers?page[size]=10&controller=${controller}`,
          ),
          next: expect.stringContaining(
            `/identifiers?page[size]=10&controller=${controller}`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return DIDs filtered by verification relationship", async () => {
      expect.assertions(2);

      const extraQuery = `verification-method-id=0x5145304834586d6434646a787435345f7a6e364c4a6769685052525030767275444a31416c6b3544447977&verification-relationship=capabilityInvocation`;

      const response = await request(server).get(`/identifiers?${extraQuery}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
        ),
        items: [
          {
            did: "did:ebsi:z23FGxCRmGZmei6uY3KCseXA",
            href: expect.any(String),
          },
        ],
        pageSize: 10,
        links: {
          prev: expect.stringContaining(
            `/identifiers?page[size]=10&${extraQuery}`,
          ),
          next: expect.stringContaining(
            `/identifiers?page[size]=10&${extraQuery}`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/identifiers?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=2",
        ),
        items: expect.arrayContaining([]),
        pageSize: 2,
        links: {
          prev: expect.stringContaining("/identifiers?page[size]=2"),
          next: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2",
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/identifiers?page[after]=2&page[size]=2",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=2&page[size]=2",
        ),
        items: expect.arrayContaining([]),
        pageSize: 2,
        links: {
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=2",
          ),
          next: expect.stringContaining("/identifiers?page[size]=2"),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/identifiers?page[after]=100&page[size]=2",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=100&page[size]=2",
        ),
        items: expect.arrayContaining([]),
        pageSize: 2,
        links: {
          prev: expect.stringContaining("/identifiers?page[size]=2"),
          next: expect.stringContaining("/identifiers?page[size]=2"),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/identifiers?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        pageSize: 10,
        links: {
          prev: expect.stringContaining("/identifiers?page[size]=10"),
          next: expect.stringContaining("/identifiers?page[size]=10"),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/identifiers?page[size]=100",
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/identifiers?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/identifiers?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/identifiers?page[after]=abc",
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

  describe("GET /identifiers/{did}", () => {
    it("should return a specific DID document", async () => {
      expect.assertions(3);

      const response = await request(server).get(`/identifiers/${did2}`);

      expect(response.body).toStrictEqual(didDocument);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a specific DID document as 'application/did+json' if 'Accept' header is 'application/did+json'", async () => {
      expect.assertions(4);

      const response = await request(server)
        .get(`/identifiers/${did2}`)
        .set("Accept", "application/did+json");

      const { "@context": context, ...didDocWithoutContext } = didDocument;

      expect(response.body).toStrictEqual(didDocWithoutContext);
      expect(
        (response.body as Record<string, unknown>)["@context"],
      ).toBeUndefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/did+json"));
    });

    it("should return a DID document valid at a specific time", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/identifiers/${did2}?valid-at=2024-04-19`,
      );
      expect(response.body).toStrictEqual(didDocument);
      expect(response.status).toBe(200);
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers/invalid");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID v1"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const randomDid = EbsiWallet.createDid();
      const response = await request(server).get(`/identifiers/${randomDid}`);

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: `Identifier ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the did document is bad formatted", async () => {
      expect.assertions(4);

      let response = await request(server).get(`/identifiers/${did1}`);

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `Identifier ${did1} contains an invalid base document. Unexpected token 'b', "bad base document" is not valid JSON`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      response = await request(server).get(`/identifiers/${did3}`);

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: expect.stringContaining(
          `Identifier ${did3} contains an invalid public key in a verification method.`,
        ),
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("POST /identifiers/{did}/actions", () => {
    it("should perform the action checkController", async () => {
      expect.assertions(4);

      const { did, wallet } = users[0]!;
      let response = await request(server)
        .post(`/identifiers/${did}/actions`)
        .send({
          jsonrpc: "2.0",
          method: "checkController",
          params: [wallet.address],
          id: 123,
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 123,
        result: true,
      });
      expect(response.status).toBe(200);

      const randomAddress = ethers.Wallet.createRandom().address;
      response = await request(server)
        .post(`/identifiers/${did}/actions`)
        .send({
          jsonrpc: "2.0",
          method: "checkController",
          params: [randomAddress],
          id: 123,
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 123,
        result: false,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error for bad use of actions", async () => {
      const randomAddress = ethers.Wallet.createRandom().address;
      const { did } = users[0]!;
      let response = await request(server)
        .post(`/identifiers/bad-did/actions`)
        .send({
          jsonrpc: "2.0",
          method: "checkController",
          params: [randomAddress],
        });

      expect(response.body).toStrictEqual({
        detail: `["did must be a valid DID v1"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Request without payload
      response = await request(server)
        .post(`/identifiers/${did}/actions`)
        .send();

      expect(response.body).toStrictEqual({
        error: {
          code: -32600,
          message: "JSON-RPC payload must be an object",
        },
        id: null,
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post(`/identifiers/${did}/actions`)
        .send({
          jsonrpc: "2.0",
          method: "bad method",
          params: [randomAddress],
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "The method 'bad method' is invalid",
        },
        id: null,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post(`/identifiers/${did}/actions`)
        .send({
          jsonrpc: "2.0",
          method: "checkController",
          params: ["bad address"],
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid 'params.0': Invalid Ethereum address",
        },
        id: null,
      });
      expect(response.status).toBe(400);

      const randomDid = EbsiWallet.createDid();
      response = await request(server)
        .post(`/identifiers/${randomDid}/actions`)
        .send({
          jsonrpc: "2.0",
          method: "checkController",
          params: [randomAddress],
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "did doesn't exist",
        },
        id: null,
      });
      expect(response.status).toBe(400);
    });
  });
});
