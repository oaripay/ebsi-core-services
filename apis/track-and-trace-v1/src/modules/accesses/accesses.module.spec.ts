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
    it("should throw an error 400 if the creator parameter is not missing or invalid", async () => {
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
});
