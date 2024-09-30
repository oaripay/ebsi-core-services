import { describe, beforeAll, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import { useContainer } from "class-validator";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";
import { DidDocumentResponse } from "../../src/modules/identifiers/identifiers.interface.js";

describe("DID Registry API v (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;

  let lastIdentifiers: {
    did: string;
    href: string;
  }[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    // Get last identifier
    const getAllIdentifiers = await request(server).get("/identifiers");

    const { items: identifiers } = getAllIdentifiers.body as {
      items: {
        did: string;
        href: string;
      }[];
    };
    lastIdentifiers = identifiers;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /identifiers", () => {
    it("should return a paginated collection of identifiers", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([
          {
            did: expect.stringContaining("did:"),
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
        pageSize: 10,
        links: {
          prev: expect.stringContaining("/identifiers?page[size]=10"),
          next: expect.stringContaining(
            `/identifiers?page[after]=2&page[size]=10`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });
    it("should return a paginated collection of identifiers filtered by verification relationship", async () => {
      expect.assertions(2);
      /**
       * To perform this test we need a DID that contains at
       * least 1 valid verification relationship.
       * Since a document could have all the keys expired, then
       * we use a for loop to check and get one from the last page of
       * DIDs.
       * At the end we have: did, 1 verification relationship, and
       * its corresponding verification method id
       */
      let did = "";
      let vMethodId = "";
      let vRelationship = "";
      // eslint-disable-next-line no-restricted-syntax
      for (const identifier of lastIdentifiers) {
        // eslint-disable-next-line no-await-in-loop
        const resp = await request(server).get(
          `/identifiers/${identifier.did}`,
        );
        const didDocument = resp.body as DidDocumentResponse;
        const vr = (
          [
            "authentication",
            "assertionMethod",
            "keyAgreement",
            "capabilityInvocation",
            "capabilityDelegation",
          ] as const
        ).find((r) => {
          return Object.keys(didDocument).includes(r);
        });
        if (vr) {
          did = identifier.did;
          vRelationship = vr;
          vMethodId = (didDocument[vr] as string[])[0]!.split("#")[1]!;
          break;
        }
      }

      if (!vRelationship) {
        throw new Error(
          `No verification relationship found in the list of identifiers`,
        );
      }

      /**
       * Call /identifiers and specify the verification relationship
       * and the verification method id
       */
      const extraQuery = `verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`;
      const response = await request(server).get(`/identifiers?${extraQuery}`);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
        ),
        items: expect.arrayContaining([
          // the list of items should contain at least the DID obtained above
          {
            did,
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
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
    it("should return a paginated collection of identifiers filtered by verification relationship and controller", async () => {
      expect.assertions(2);
      /**
       * To perform this test we need a DID that contains at
       * least 1 valid verification relationship.
       * Since a document could have all the keys expired, then
       * we use a for loop to check and get one from the last page of
       * DIDs.
       * At the end we have: did, 1 verification relationship, and
       * its corresponding verification method id
       */
      let did = "";
      let vMethodId = "";
      let vRelationship = "";
      let controller = "";
      // eslint-disable-next-line no-restricted-syntax
      for (const identifier of lastIdentifiers) {
        // eslint-disable-next-line no-await-in-loop
        const resp = await request(server).get(
          `/identifiers/${identifier.did}`,
        );
        const didDocument = resp.body as DidDocumentResponse;
        const vr = (
          [
            "authentication",
            "assertionMethod",
            "keyAgreement",
            "capabilityInvocation",
            "capabilityDelegation",
          ] as const
        ).find((r) => {
          return Object.keys(didDocument).includes(r);
        });
        if (vr) {
          did = identifier.did;
          vRelationship = vr;
          vMethodId = (didDocument[vr] as string[])[0]!.split("#")[1]!;
          controller = didDocument.controller[0]!;
          break;
        }
      }
      /**
       * Call /identifiers and specify the verification relationship
       * and the verification method id
       */
      const extraQuery = `controller=${controller}&verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`;
      const response = await request(server).get(`/identifiers?${extraQuery}`);

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`,
        ),
        items: expect.arrayContaining([
          // the list of items should contain at least the DID obtained above
          {
            did,
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
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
    it("should return a specific identifier", async () => {
      expect.assertions(4);
      const response = await request(server).get(
        `/identifiers/${lastIdentifiers[0]!.did}`,
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
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
    it("should return a specific identifier filtered by verification", async () => {
      expect.assertions(4);
      const response = await request(server).get(
        `/identifiers/${lastIdentifiers[0]!.did}`,
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
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
        `/identifiers/${lastIdentifiers[0]!.did}?valid-at=1970-01-01`,
      );
      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
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
        .get(`/identifiers/${lastIdentifiers[0]!.did}`)
        .set("Accept", "application/did+json");
      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
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
  });
  describe("GET /identifiers/{did}/events", () => {
    it("should return a paginated collection of identifiers events", async () => {
      expect.assertions(2);
      const response = await request(server).get(
        `/identifiers/${lastIdentifiers[0]!.did}/events`,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${lastIdentifiers[0]!.did}/events?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([
          {
            id: expect.stringContaining(""),
            event: expect.stringContaining(""),
            signer: expect.stringContaining(""),
            timestamp: expect.stringContaining(""),
            txId: expect.stringContaining(""),
            blockNumber: expect.stringContaining(""),
          },
        ]),
        pageSize: 10,
        links: {
          prev: expect.stringContaining(
            `/identifiers/${lastIdentifiers[0]!.did}/events?page[size]=10`,
          ),
          next: expect.stringContaining(
            `/identifiers/${lastIdentifiers[0]!.did}/events?page[size]=10`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });
  });
  describe("POST /identifiers/{did}/actions", () => {
    it("should perform the action checkController", async () => {
      expect.assertions(2);

      const randomAddress = ethers.Wallet.createRandom().address;
      const response = await request(server)
        .post(`/identifiers/${lastIdentifiers[0]!.did}/actions`)
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
  });
});
