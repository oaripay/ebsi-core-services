import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { setupServer } from "msw/node";
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { AccessesModule } from "./accesses.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trackAndTrace.js";
import { hexToDid } from "../../shared/utils.js";
import { handlers } from "../../../tests/utils/graphServer.js";

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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AccessesModule],
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
        `/accesses?subject=${randomDid}`,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${randomDid}`,
        ),
        items: [],
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${randomDid}`,
          ),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${randomDid}`,
          ),
          next: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${randomDid}`,
          ),
          last: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${randomDid}`,
          ),
        },
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
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${grantedDidEbsiAccount}`,
        ),
        items: [
          {
            subject: grantedDidEbsiAccount,
            documentId: doc.documentHash,
            grantedBy: doc.didEbsiCreator,
            permission: "delegate",
          },
        ],
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidEbsiAccount}`,
          ),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidEbsiAccount}`,
          ),
          next: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidEbsiAccount}`,
          ),
          last: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidEbsiAccount}`,
          ),
        },
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
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${grantedDidKeyAccount}`,
        ),
        items: [
          {
            subject: grantedDidKeyAccount,
            documentId: doc.documentHash,
            grantedBy: doc.didEbsiCreator,
            permission: "write",
          },
        ],
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidKeyAccount}`,
          ),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidKeyAccount}`,
          ),
          next: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidKeyAccount}`,
          ),
          last: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${grantedDidKeyAccount}`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });
  });
});
