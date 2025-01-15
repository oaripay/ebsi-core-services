import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { methodNotAllowed } from "@ebsiint-api/shared";
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace-v2";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { setupServer } from "msw/node";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { handlers } from "../../../tests/utils/graphServer.js";
import { setupTestEnv } from "../../../tests/utils/trackAndTrace.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { hexToDid } from "../../shared/utils.js";
import { AccessesModule } from "./accesses.module.js";

describe("Accesses Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  const mockServer = setupServer(...handlers);

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv();
    const { trackAndTraceContract } = testEnv;

    // Mock TSR contract
    vi.spyOn(TrackAndTrace__factory, "connect").mockImplementation(
      () => trackAndTraceContract,
    );

    const moduleFixture = await Test.createTestingModule({
      imports: [AccessesModule],
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

    // Mock Contract service
    mockServer.listen({
      // This is to ignore GET/POST Requests and only focus on GraphQL
      onUnhandledRequest: "bypass",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("HEAD /accesses?creator={did}", () => {
    it("should throw an error 400 if the creator parameter is missing or invalid", async () => {
      expect.assertions(4);

      // Missing `creator` param
      let response = await request(server).head("/accesses");

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(400);

      // Invalid `creator` param (not a did:ebsi DID)
      response = await request(server).head("/accesses?creator=1234");

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(400);
    });

    it("should throw an error 404 if the DID is not a creator", async () => {
      expect.assertions(2);

      const did = EbsiWallet.createDid();
      const response = await request(server).head(`/accesses?creator=${did}`);

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(404);
    });

    it("should return 204 when the DID is a creator", async () => {
      expect.assertions(2);

      const creatorAccount =
        testEnv.documentsWithBlockSource[0]!.didEbsiCreator;

      const response = await request(server).head(
        `/accesses?creator=${creatorAccount}`,
      );

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });

  describe("GET /accesses?subject={did}", () => {
    it("should throw an error 400 if the subject parameter is missing or invalid", async () => {
      expect.assertions(4);

      // Missing `subject` param
      let response = await request(server).get("/accesses");

      expect(response.body).toStrictEqual({
        detail: `["subject must be a valid DID string"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid `subject` param (not a did:ebsi DID)
      response = await request(server).get("/accesses?subject=1234");

      expect(response.body).toStrictEqual({
        detail: `["subject must be a valid DID string"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an empty list when there are no accesses", async () => {
      expect.assertions(2);

      const randomDid = EbsiWallet.createDid();
      const response = await request(server).get(
        `/accesses?subject=${encodeURIComponent(randomDid)}`,
      );

      expect(response.body).toStrictEqual({
        items: [],
        links: {
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(randomDid)}`,
          ),
          last: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(randomDid)}`,
          ),
          next: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(randomDid)}`,
          ),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(randomDid)}`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(randomDid)}`,
        ),
      });
      expect(response.status).toBe(200);
    });

    it("should return the list of accesses given a DID (did:ebsi)", async () => {
      expect.assertions(2);

      const { documentsWithBlockSource, operators } = testEnv;

      const grantedDidEbsiAccount = hexToDid(operators[1]!.id);

      const response = await request(server).get(
        `/accesses?subject=${grantedDidEbsiAccount}`,
      );

      const doc = documentsWithBlockSource[0]!;

      expect(response.body).toStrictEqual({
        items: [
          {
            documentId: doc.documentHash,
            grantedBy: doc.didEbsiCreator,
            permission: "delegate",
            subject: grantedDidEbsiAccount,
          },
        ],
        links: {
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidEbsiAccount)}`,
          ),
          last: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidEbsiAccount)}`,
          ),
          next: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidEbsiAccount)}`,
          ),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidEbsiAccount)}`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidEbsiAccount)}`,
        ),
      });
      expect(response.status).toBe(200);
    });

    it("should return the list of accesses given a DID (did:key)", async () => {
      expect.assertions(2);

      const { documentsWithBlockSource, operators } = testEnv;

      const grantedDidKeyAccount = hexToDid(operators[2]!.id);

      const response = await request(server).get(
        `/accesses?subject=${grantedDidKeyAccount}`,
      );

      const doc = documentsWithBlockSource[0]!;

      expect(response.body).toStrictEqual({
        items: [
          {
            documentId: doc.documentHash,
            grantedBy: doc.didEbsiCreator,
            permission: "write",
            subject: grantedDidKeyAccount,
          },
        ],
        links: {
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidKeyAccount)}`,
          ),
          last: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidKeyAccount)}`,
          ),
          next: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidKeyAccount)}`,
          ),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidKeyAccount)}`,
          ),
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(grantedDidKeyAccount)}`,
        ),
      });
      expect(response.status).toBe(200);
    });
  });
});
