import { describe, beforeAll, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import { useContainer } from "class-validator";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";

describe("Track and Trace API v1 - Accesses (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;

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

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("HEAD /accesses", () => {
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

      const testUserKid = configService.get("testUserKid", {
        infer: true,
      });

      if (!testUserKid) {
        throw new Error("TEST_USER_KID must be defined");
      }

      const testUserDid = testUserKid.split("#")[0]!;

      const response = await request(server).head(
        `/accesses?creator=${testUserDid}`,
      );

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });
});
