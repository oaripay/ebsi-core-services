import { describe, beforeAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ethers } from "ethers";
import type { FastifyInstance } from "fastify";
import { DIDDocument } from "did-resolver";
import { useContainer } from "class-validator";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";

describe("DID Registry (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
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
      new FastifyAdapter()
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    // Get last identifier
    const getAllIdentifiers = await request(server).get(
      "/identifiers?page[size]=50"
    );
    const { total } = getAllIdentifiers.body as {
      total: number;
    };
    const getIdentifiersLastPage = await request(server).get(
      `/identifiers?page[after]=${Math.ceil(total / 10)}&page[size]=10`
    );
    const { items: identifiers } = getIdentifiersLastPage.body as {
      items: {
        did: string;
        href: string;
      }[];
    };
    lastIdentifiers = identifiers;
  });

  describe("GET /identifiers", () => {
    it("should return a paginated collection of identifiers", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers");

      const total =
        ((response.body as { [x: string]: unknown })?.total as number) ?? 0;

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10"
        ),
        items: expect.arrayContaining([
          {
            did: expect.stringContaining("did:"),
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=${total > 10 ? 2 : 1}&page[size]=10`
          ),
          last: expect.stringContaining(
            `/identifiers?page[after]=${Math.ceil(total / 10)}&page[size]=10`
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
      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < lastIdentifiers.length; i += 1) {
        const resp = await request(server).get(
          `/identifiers/${lastIdentifiers[i].did}`
        );
        const didDocument = resp.body as DIDDocument;
        const vr = [
          "authentication",
          "assertionMethod",
          "keyAgreement",
          "capabilityInvocation",
          "capabilityDelegation",
        ].find((r) => {
          return Object.keys(didDocument).includes(r);
        });
        if (vr) {
          did = lastIdentifiers[i].did;
          vRelationship = vr;
          [, vMethodId] = (didDocument[vr] as string[])[0].split("#");
          break;
        }
      }
      /* eslint-enable no-await-in-loop */

      /**
       * Call /identifiers and specify the verification relationship
       * and the verification method id
       */
      const extraQuery = `verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`;
      const response = await request(server).get(`/identifiers?${extraQuery}`);

      const total =
        ((response.body as { [x: string]: unknown })?.total as number) ?? 0;

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
        ),
        items: expect.arrayContaining([
          // the list of items should contain at least the DID obtained above
          {
            did,
            href: expect.stringContaining("/identifiers/"),
          },
        ]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
          ),
          prev: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&${extraQuery}`
          ),
          next: expect.stringContaining(
            `/identifiers?page[after]=${
              total > 10 ? 2 : 1
            }&page[size]=10&${extraQuery}`
          ),
          last: expect.stringContaining(
            `/identifiers?page[after]=${Math.ceil(
              total / 10
            )}&page[size]=10&${extraQuery}`
          ),
        },
      });
      expect(response.status).toBe(200);
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
    it("should return a specific identifier", async () => {
      expect.assertions(4);

      const response = await request(server).get(
        `/identifiers/${lastIdentifiers[0].did}`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
          verificationMethod: expect.arrayContaining([]),
        })
      );
      expect(
        response.body as { "@context": string | string[] }["@context"]
      ).toBeDefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a did document valid at specific time", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/identifiers/${lastIdentifiers[0].did}?valid-at=1970-01-01`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
          verificationMethod: [], // no keys in 1970
        })
      );
      expect(
        response.body as { "@context": string | string[] }["@context"]
      ).toBeDefined();
      expect(response.status).toBe(200);
    });

    it("should return a specific identifier as 'application/did+json' if 'Accept' header is 'application/did+json'", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get(`/identifiers/${lastIdentifiers[0].did}`)
        .set("Accept", "application/did+json");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:"),
          controller: expect.arrayContaining([]),
          verificationMethod: expect.arrayContaining([]),
        })
      );
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
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

  describe("POST /identifiers/{did}/actions", () => {
    it("should perform the action checkController", async () => {
      expect.assertions(2);

      const randomAddress = ethers.Wallet.createRandom().address;
      const response = await request(server)
        .post(`/identifiers/${lastIdentifiers[0].did}/actions`)
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
