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
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { AccessesModule } from "./accesses.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trackAndTrace.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import type { Access } from "./accesses.interface.js";

describe("Accesses Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({});
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

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(trackAndTraceContract),
    );
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

      const { creatorAccount } = testEnv;

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

    it("should return the list of accesses given a DID", async () => {
      expect.assertions(2);

      const {
        creatorAccount,
        grantedDidEbsiAccount,
        documentsWithBlockSource,
      } = testEnv;

      const response = await request(server).get(
        `/accesses?subject=${grantedDidEbsiAccount}`,
      );

      const items: Access[] = [];
      documentsWithBlockSource.forEach((doc) => {
        items.push({
          subject: grantedDidEbsiAccount,
          documentId: doc.documentHash,
          grantedBy: creatorAccount,
          permission: "delegate",
        });
        items.push({
          subject: grantedDidEbsiAccount,
          documentId: doc.documentHash,
          grantedBy: creatorAccount,
          permission: "write",
        });
      });
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${grantedDidEbsiAccount}`,
        ),
        items,
        total: documentsWithBlockSource.length * 2,
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
  });
});
