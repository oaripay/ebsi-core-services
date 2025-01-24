import type { PaginatedList } from "@ebsiint-api/shared";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.js";
import type { PolicyLink } from "../../src/modules/policies/policies.interface.js";

import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { getServer } from "../utils/getServer.js";

interface SupertestPoliciesResponse {
  body: PaginatedList<PolicyLink>;
  status: number;
}

describe("TPR API v2 - Policies (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/policies", () => {
    it("should return a collection of policies", async () => {
      expect.assertions(2);
      const response: SupertestPoliciesResponse =
        await request(server).get("/policies");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          items: expect.arrayContaining([]),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-policies-registry/v2/policies?page[after]=1&page[size]=10",
            ),
            last: expect.stringContaining(
              "/trusted-policies-registry/v2/policies?page[after]=",
            ),
            next: expect.stringContaining(
              "/trusted-policies-registry/v2/policies?page[after]=",
            ),
            prev: expect.stringContaining(
              "/trusted-policies-registry/v2/policies?page[after]=1&page[size]=10",
            ),
          }),
          pageSize: expect.any(Number),
          self: expect.stringContaining(
            "/trusted-policies-registry/v2/policies?page[after]=1&page[size]=10",
          ),
          total: expect.any(Number),
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(2);

      // Get last policy
      const getPoliciesResponse: SupertestPoliciesResponse =
        await request(server).get("/policies");

      const policyId = `${getPoliciesResponse.body.total - 1}`;
      const lastPageUrl = getPoliciesResponse.body.links!.last;
      const lastPage: SupertestPoliciesResponse = await request(server).get(
        lastPageUrl.slice(lastPageUrl.lastIndexOf("/policies")),
      );

      const response = await request(server).get(
        `/policies/${lastPage.body.items.at(-1)!.policyName}`,
      );

      expect(response.body).toStrictEqual({
        description: expect.any(String),
        operationType: expect.any(String),
        policyConditions: expect.arrayContaining([
          expect.objectContaining({
            attributeName: expect.any(String),
            attributeOperation: expect.any(String),
            name: expect.any(String),
            typeOfValue: expect.any(String),
            value: expect.anything(),
          }),
        ]),
        policyId: `${policyId}`,
        policyName: expect.any(String),
        status: expect.any(Boolean),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/69042");

      expect(response.body).toStrictEqual({
        detail: "Policy 69042 not found",
        status: 404,
        title: "Policy Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
