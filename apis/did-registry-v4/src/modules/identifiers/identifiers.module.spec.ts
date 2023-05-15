import { jest, describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { DidRegistry__factory } from "@ebsiint-sc/did-registry-v4";
import { encode } from "@ebsiint-api/shared";
import { IdentifiersModule } from "./identifiers.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { LedgerService } from "../ledger/ledger.service";
import { ApiConfig } from "../../config/configuration";
import { createUser, UserDetails } from "../../../tests/utils/data";

jest.setTimeout(120000);

const DID_DOCUMENTS = 3;

describe("Identifiers Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let configService: ConfigService<ApiConfig, true>;
  let users: UserDetails[];

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocumentsTotal: DID_DOCUMENTS,
    });
    const { didRegistryContract } = testEnv;
    users = testEnv.users;

    // Mock TSR contract
    jest
      .spyOn(DidRegistry__factory, "connect")
      .mockImplementation(() => didRegistryContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IdentifiersModule],
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

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(didRegistryContract));
    jest
      .spyOn(ledgerService, "getContractV3")
      .mockImplementation(async () =>
        Promise.resolve(testEnv.setupV3.didRegistryV3Contract)
      );
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /identifiers", () => {
    it("should return a paginated collection of DID documents", async () => {
      expect.assertions(3);

      const response = await request(server).get("/identifiers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10"
        ),
        items: expect.arrayContaining(
          users.map((user) => ({
            did: user.did,
            href: expect.stringContaining(`/identifiers/${user.did}`),
          }))
        ),
        total: DID_DOCUMENTS,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          next: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          last: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        DID_DOCUMENTS
      );
      expect(response.status).toBe(200);
    });

    it("should return an empty array for an unknown controller", async () => {
      expect.assertions(2);

      const controller = EbsiWallet.createDid();

      const response = await request(server).get(
        `/identifiers?controller=${controller}`
      );
      expect(response.body).toStrictEqual({
        title: "Not Found",
        detail: `Controller ${controller} not found`,
        status: 404,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return DIDs filtered by controller", async () => {
      expect.assertions(2);

      const controller = users[0].did;

      const response = await request(server).get(
        `/identifiers?controller=${controller}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&controller=${controller}`
        ),
        items: [
          {
            did: controller,
            href: expect.any(String),
          },
        ],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controller}`
          ),
          prev: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controller}`
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controller}`
          ),
          last: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controller}`
          ),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return DIDs filtered by verification relationship", async () => {
      expect.assertions(2);

      const extraQuery = `verification-method-id=${users[0].thumbprint}&verification-relationship=capabilityInvocation`;
      const response = await request(server).get(`/identifiers?${extraQuery}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
        ),
        items: [
          {
            did: users[0].did,
            href: expect.any(String),
          },
        ],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
          ),
          prev: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
          ),
          last: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
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
          "/identifiers?page[after]=1&page[size]=2"
        ),
        items: expect.arrayContaining([]),
        total: DID_DOCUMENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=2"
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=2"
          ),
          next: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
          last: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/identifiers?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=2&page[size]=2"
        ),
        items: expect.arrayContaining([]),
        total: DID_DOCUMENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=2"
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=2"
          ),
          next: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
          last: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/identifiers?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=100&page[size]=2"
        ),
        items: expect.arrayContaining([]),
        total: DID_DOCUMENTS,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=2"
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
          next: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
          last: expect.stringContaining(
            "/identifiers?page[after]=2&page[size]=2"
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/identifiers?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10"
        ),
        items: expect.arrayContaining([]),
        total: DID_DOCUMENTS,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          next: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          last: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/identifiers?page[size]=100"
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
        "/identifiers?page[after]=abc"
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

      const { did, didDocument } = users[0];

      const response = await request(server).get(`/identifiers/${did}`);

      expect(response.body).toStrictEqual(didDocument);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a DID document from V3 if it doesn't exist on V4", async () => {
      expect.assertions(3);

      const [didDocumentV3] = testEnv.setupV3.didDocuments;
      const { did, didDocument } = didDocumentV3;

      const response = await request(server).get(`/identifiers/${did}`);

      expect(response.body).toStrictEqual(didDocument);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a specific DID document as 'application/did+json' if 'Accept' header is 'application/did+json'", async () => {
      expect.assertions(4);

      const { did, didDocument } = users[0];

      const response = await request(server)
        .get(`/identifiers/${did}`)
        .set("Accept", "application/did+json");

      const { "@context": context, ...didDocWithoutContext } = didDocument;

      expect(response.body).toStrictEqual(didDocWithoutContext);
      expect(
        (response.body as { [x: string]: unknown })["@context"]
      ).toBeUndefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+json"));
    });

    it("should return a DID document valid at a specific time", async () => {
      expect.assertions(10);

      const user = await createUser();
      const publicKeyJwk1 = encode.publicKey.fromHexToJWK(
        user.wallet.publicKey
      );
      const thumbprint1 = user.thumbprint;
      const publicKeyJwk2 = {
        kty: "EC",
        crv: "P-256",
        x: "S72xRvIMPce-tPHJOaB8km4mPkcz2brMxtAQ8GDfAVg",
        y: "6szYD97Mp2BQnIwAVg2axxJSY3JsG8LQknyR7WH09Pc",
      };
      const thumbprint2 = "2hyKWiLemt60cgMhW7RZOFjXN7nBjAml3bjk4IAYQtQ";
      const publicKeyJwk3 = {
        kty: "OKP",
        crv: "Ed25519",
        x: "AHjO0ivGIlmGBoqeVGEs4OA7Am9tmG-qpcGoz_wf58Y",
      };
      const thumbprint3 = "jjgyWrlP1LJR1q2cGNrPEj_7wnwafmQoij4wBHbj_iY";

      // creation of a new did document
      await (
        await testEnv.didRegistryContract.insertDidDocument(
          user.did,
          JSON.stringify({ "@context": user.didDocument["@context"] }),
          thumbprint1,
          user.wallet.publicKey,
          true,
          new Date("2022-01-01").getTime() / 1000,
          new Date("2030-01-01").getTime() / 1000
        )
      ).wait();

      // new key and relationship added later
      await (
        await testEnv.didRegistryContract.addVerificationMethod(
          user.did,
          thumbprint2,
          Buffer.from(JSON.stringify(publicKeyJwk2)),
          false
        )
      ).wait();

      await (
        await testEnv.didRegistryContract.addVerificationRelationship(
          user.did,
          "authentication",
          thumbprint2,
          new Date("2024-01-01").getTime() / 1000,
          new Date("2029-01-01").getTime() / 1000
        )
      ).wait();

      // the first key is rolled
      await (
        await testEnv.didRegistryContract.rollVerificationMethod(
          user.did,
          thumbprint3,
          Buffer.from(JSON.stringify(publicKeyJwk3)),
          false,
          new Date("2027-01-01").getTime() / 1000,
          new Date("2040-01-01").getTime() / 1000,
          thumbprint1,
          3 * 30 * 24 * 3600 // 3 months of transition
        )
      ).wait();

      // new controller added
      await (
        await testEnv.didRegistryContract.addController(user.did, users[0].did)
      ).wait();

      // controllers are the same for the whole history
      const controllers = [user.did, users[0].did];

      // expect first key in 2022
      let response = await request(server).get(
        `/identifiers/${user.did}?valid-at=2022-02-01`
      );
      expect(response.body).toStrictEqual({
        "@context": user.didDocument["@context"],
        id: user.did,
        controller: controllers,
        verificationMethod: [
          {
            id: `${user.did}#${thumbprint1}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk1,
          },
        ],
        capabilityInvocation: [`${user.did}#${thumbprint1}`],
        authentication: [`${user.did}#${thumbprint1}`],
      });
      expect(response.status).toBe(200);

      // expect 2 keys in 2024
      response = await request(server).get(
        `/identifiers/${user.did}?valid-at=2024-02-01`
      );
      expect(response.body).toStrictEqual({
        "@context": user.didDocument["@context"],
        id: user.did,
        controller: controllers,
        verificationMethod: [
          {
            id: `${user.did}#${thumbprint1}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk1,
          },
          {
            id: `${user.did}#${thumbprint2}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk2,
          },
        ],
        capabilityInvocation: [`${user.did}#${thumbprint1}`],
        authentication: [
          `${user.did}#${thumbprint1}`,
          `${user.did}#${thumbprint2}`,
        ],
      });
      expect(response.status).toBe(200);

      // expect 3 keys in the beginning of 2027 (because of the transition period for the rolling)
      response = await request(server).get(
        `/identifiers/${user.did}?valid-at=2027-02-01`
      );
      expect(response.body).toStrictEqual({
        "@context": user.didDocument["@context"],
        id: user.did,
        controller: controllers,
        verificationMethod: [
          {
            id: `${user.did}#${thumbprint1}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk1,
          },
          {
            id: `${user.did}#${thumbprint2}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk2,
          },
          {
            id: `${user.did}#${thumbprint3}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk3,
          },
        ],
        capabilityInvocation: [
          `${user.did}#${thumbprint1}`,
          `${user.did}#${thumbprint3}`,
        ],
        authentication: [
          `${user.did}#${thumbprint1}`,
          `${user.did}#${thumbprint2}`,
          `${user.did}#${thumbprint3}`,
        ],
      });
      expect(response.status).toBe(200);

      // expect 2 keys in the middle of 2027 (first key removed after rolling)
      response = await request(server).get(
        `/identifiers/${user.did}?valid-at=2027-06-01`
      );
      expect(response.body).toStrictEqual({
        "@context": user.didDocument["@context"],
        id: user.did,
        controller: controllers,
        verificationMethod: [
          {
            id: `${user.did}#${thumbprint2}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk2,
          },
          {
            id: `${user.did}#${thumbprint3}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk3,
          },
        ],
        capabilityInvocation: [`${user.did}#${thumbprint3}`],
        authentication: [
          `${user.did}#${thumbprint2}`,
          `${user.did}#${thumbprint3}`,
        ],
      });
      expect(response.status).toBe(200);

      // expect only 1 key by 2030 (second key expired)
      response = await request(server).get(
        `/identifiers/${user.did}?valid-at=2030-02-01`
      );
      expect(response.body).toStrictEqual({
        "@context": user.didDocument["@context"],
        id: user.did,
        controller: controllers,
        verificationMethod: [
          {
            id: `${user.did}#${thumbprint3}`,
            type: "JsonWebKey2020",
            controller: user.did,
            publicKeyJwk: publicKeyJwk3,
          },
        ],
        capabilityInvocation: [`${user.did}#${thumbprint3}`],
        authentication: [`${user.did}#${thumbprint3}`],
      });
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

      let user = await createUser();
      const now = Math.floor(Date.now() / 1000);
      await (
        await testEnv.didRegistryContract.insertDidDocument(
          user.did,
          "bad base document",
          user.thumbprint,
          user.wallet.publicKey,
          true,
          now,
          now + 3600
        )
      ).wait();

      let response = await request(server).get(`/identifiers/${user.did}`);

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `Identifier ${user.did} contains an invalid base document. Unexpected token b in JSON at position 0`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      user = await createUser();
      await (
        await testEnv.didRegistryContract.insertDidDocument(
          user.did,
          JSON.stringify(user.didDocument["@context"]),
          user.thumbprint,
          "0x1234567890", // bad public key
          true,
          now,
          now + 3600
        )
      ).wait();

      response = await request(server).get(`/identifiers/${user.did}`);

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `Identifier ${user.did} contains an invalid public key in a verification method. Unknown point format`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("POST /identifiers/{did}/actions", () => {
    it("should perform the action checkController", async () => {
      expect.assertions(4);

      const { did, wallet } = users[0];
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

    it("should perform the action checkController for a DID registered in DID Registry V3", async () => {
      expect.assertions(2);

      const [didDocumentV3] = testEnv.setupV3.didDocuments;
      const { did, controller } = didDocumentV3;

      const response = await request(server)
        .post(`/identifiers/${did}/actions`)
        .send({
          jsonrpc: "2.0",
          method: "checkController",
          params: [controller.address],
          id: 123,
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 123,
        result: true,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error for bad use of actions", async () => {
      const randomAddress = ethers.Wallet.createRandom().address;
      const { did } = users[0];
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
          message:
            "Validation error: each value in params must be an Ethereum address",
        },
        id: null,
      });
      expect(response.status).toBe(400);
    });
  });
});
