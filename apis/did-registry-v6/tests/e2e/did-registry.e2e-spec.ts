import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { useContainer } from "class-validator";
import { ethers } from "ethers";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.js";
import type { DidDocumentResponse } from "../../src/modules/identifiers/identifiers.interface.js";

import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { getServer } from "../utils/getServer.js";

describe("DID Registry API v (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let testUserDid: string;
  let testUserDidDocument: DidDocumentResponse;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = getServer(app, configService);

    testUserDid = configService.get("testUserDid");
    if (!testUserDid) throw new Error("TEST_USER_DID is not defined");

    const resp = await request(server).get(`/identifiers/${testUserDid}`);
    testUserDidDocument = resp.body as DidDocumentResponse;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /identifiers", () => {
    it("should return a paginated collection of identifiers", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers");

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            did: expect.stringContaining("did:"),
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=2&page[size]=10`,
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10",
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10",
        ),
      });
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of identifiers filtered by verification relationship", async () => {
      expect.assertions(2);

      const vRelationship = (
        [
          "authentication",
          "assertionMethod",
          "keyAgreement",
          "capabilityInvocation",
          "capabilityDelegation",
        ] as const
      ).find((r) => {
        return Object.keys(testUserDidDocument).includes(r);
      });

      if (!vRelationship) {
        throw new Error(`No verification relationship found in ${testUserDid}`);
      }

      const vMethodId = (
        testUserDidDocument[vRelationship] as string[]
      )[0]!.split("#")[1]!;

      /**
       * Call /identifiers and specify the verification relationship
       * and the verification method id
       */
      const extraQuery = `verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`;
      const response = await request(server).get(`/identifiers?${extraQuery}`);

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          // the list of items should contain at least the DID obtained above
          {
            did: testUserDid,
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
        links: {
          first: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
          last: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
          prev: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
        ),
      });
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of identifiers filtered by verification relationship and controller", async () => {
      expect.assertions(2);

      const vRelationship = (
        [
          "authentication",
          "assertionMethod",
          "keyAgreement",
          "capabilityInvocation",
          "capabilityDelegation",
        ] as const
      ).find((r) => {
        return Object.keys(testUserDidDocument).includes(r);
      });

      if (!vRelationship) {
        throw new Error(`No verification relationship found in ${testUserDid}`);
      }

      const vMethodId = (
        testUserDidDocument[vRelationship] as string[]
      )[0]!.split("#")[1]!;
      const controller = testUserDidDocument.controller[0]!;

      /**
       * Call /identifiers and specify the verification relationship
       * and the verification method id
       */
      let extraQuery = `controller=${controller}&verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`;
      const response = await request(server).get(`/identifiers?${extraQuery}`);
      extraQuery = extraQuery.replace(
        controller,
        encodeURIComponent(controller),
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          // the list of items should contain at least the DID obtained above
          {
            did: testUserDid,
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
        links: {
          first: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
          last: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
          prev: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
        ),
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);
      const response1 = await request(server).get(
        "/identifiers?page[size]=100",
      );
      expect(response1.body).toStrictEqual({
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);
      const response2 = await request(server).get("/identifiers?page[size]=0");
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
      const response3 = await request(server).get("/identifiers?page[after]=0");
      expect(response3.body).toStrictEqual({
        detail: '["page[after] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response3.status).toBe(400);
      const response4 = await request(server).get(
        "/identifiers?page[after]=abc",
      );
      expect(response4.body).toStrictEqual({
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /identifiers/{did}", () => {
    it("should return a specific identifier", async () => {
      expect.assertions(4);
      const response = await request(server).get(`/identifiers/${testUserDid}`);

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          controller: expect.arrayContaining([]),
          id: expect.stringContaining("did:"),
          verificationMethod: expect.arrayContaining([]),
        }),
      );
      expect(
        response.body as { "@context": string | string[] }["@context"],
      ).toBeDefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a did document valid at specific time", async () => {
      expect.assertions(3);
      const response = await request(server).get(
        `/identifiers/${testUserDid}?valid-at=1970-01-01`,
      );
      expect(response.body).toStrictEqual(
        expect.objectContaining({
          controller: expect.arrayContaining([]),
          id: expect.stringContaining("did:"),
          verificationMethod: [], // no keys in 1970
        }),
      );
      expect(
        response.body as { "@context": string | string[] }["@context"],
      ).toBeDefined();
      expect(response.status).toBe(200);
    });

    it("should return a specific identifier as 'application/did+json' if 'Accept' header is 'application/did+json'", async () => {
      expect.assertions(3);
      const response = await request(server)
        .get(`/identifiers/${testUserDid}`)
        .set("Accept", "application/did+json");
      expect(response.body).toStrictEqual(
        expect.objectContaining({
          controller: expect.arrayContaining([]),
          id: expect.stringContaining("did:"),
          verificationMethod: expect.arrayContaining([]),
        }),
      );
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/did+json"));
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);
      const response = await request(server).get("/identifiers/invalid");
      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);
      const randomDid = EbsiWallet.createDid();
      const response = await request(server).get(`/identifiers/${randomDid}`);
      expect(response.body).toStrictEqual({
        detail: `Identifier ${randomDid} not found`,
        status: 404,
        title: "Identifier Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /identifiers/{did}/events", () => {
    it("should return a paginated collection of identifiers events", async () => {
      expect.assertions(2);
      const response = await request(server).get(
        `/identifiers/${testUserDid}/events`,
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            blockNumber: expect.stringContaining(""),
            event: expect.stringContaining(""),
            id: expect.stringContaining(""),
            signer: expect.stringContaining(""),
            timestamp: expect.stringContaining(""),
            txId: expect.stringContaining(""),
          },
        ]),
        links: {
          first: expect.stringContaining(
            `/identifiers/${testUserDid}/events?page[after]=1&page[size]=1`,
          ),
          next: expect.stringContaining(
            `/identifiers/${testUserDid}/events?page[after]=2&page[size]=1`,
          ),
          prev: expect.stringContaining(
            `/identifiers/${testUserDid}/events?page[after]=1&page[size]=1`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/identifiers/${testUserDid}/events?page[after]=1&page[size]=1`,
        ),
      });
      expect(response.status).toBe(200);
    });
  });

  describe("POST /identifiers/{did}/actions", () => {
    it("should perform the action checkController", async () => {
      expect.assertions(2);

      const randomAddress = ethers.Wallet.createRandom().address;
      const response = await request(server)
        .post(`/identifiers/${testUserDid}/actions`)
        .send({
          id: 123,
          jsonrpc: "2.0",
          method: "checkController",
          params: [randomAddress],
        });

      expect(response.body).toStrictEqual({
        id: 123,
        jsonrpc: "2.0",
        result: false,
      });
      expect(response.status).toBe(200);
    });
  });
});
