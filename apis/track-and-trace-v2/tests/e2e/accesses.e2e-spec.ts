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
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";

import { AppModule } from "../../src/app.module.ts";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.ts";
import { getServer } from "../utils/getServer.ts";

describe("Track and Trace API v2 - Accesses (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let testAuthorisedLegalEntityDid: string;

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

    const testAuthorisedLegalEntityKid = configService.get(
      "testAuthorisedLegalEntityKid",
      {
        infer: true,
      },
    );

    if (!testAuthorisedLegalEntityKid) {
      throw new Error("TEST_AUTHORISED_LEGAL_ENTITY_KID must be defined");
    }

    testAuthorisedLegalEntityDid = testAuthorisedLegalEntityKid.split("#")[0]!;
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

      const response = await request(server).head(
        `/accesses?creator=${testAuthorisedLegalEntityDid}`,
      );

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });

  describe("GET /accesses", () => {
    it("should throw an error 400 if the subject is invalid", async () => {
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

      const response = await request(server).get(
        `/accesses?subject=${testAuthorisedLegalEntityDid}`,
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            documentId: expect.any(String),
            grantedBy: expect.stringMatching(/^did:/),
            permission: expect.stringMatching(/^(write|delegate|creator)$/),
            subject: testAuthorisedLegalEntityDid,
          }),
        ]),
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(testAuthorisedLegalEntityDid)}`,
          ),
          next: expect.stringContaining("/accesses?page[after]="),
          prev: expect.stringContaining(
            `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(testAuthorisedLegalEntityDid)}`,
          ),
        }),
        pageSize: 10,
        self: expect.stringContaining(
          `/accesses?page[after]=1&page[size]=10&subject=${encodeURIComponent(testAuthorisedLegalEntityDid)}`,
        ),
      });
      expect(response.status).toBe(200);
    });
  });
});
