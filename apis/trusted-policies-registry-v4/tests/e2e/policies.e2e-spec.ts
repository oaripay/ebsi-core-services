import { describe, beforeAll, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { PaginatedList } from "@ebsiint-api/shared";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { PolicyLink } from "../../src/modules/policies/policies.interface.js";
import { getServer } from "../utils/getServer.js";

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

describe("TPR API v4 - Policies (e2e)", () => {
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

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

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
          self: expect.stringContaining(
            "/trusted-policies-registry/v4/policies?page[after]=1&page[size]=10",
          ),
          items: expect.arrayContaining([]),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-policies-registry/v4/policies?page[after]=1&page[size]=10",
            ),
            prev: expect.stringContaining(
              "/trusted-policies-registry/v4/policies?page[after]=1&page[size]=10",
            ),
            next: expect.stringContaining(
              "/trusted-policies-registry/v4/policies?page[after]=",
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(2);

      // Get last policy
      const page: SupertestPoliciesResponse =
        await request(server).get("/policies");

      const response = await request(server).get(
        `/policies/${page.body.items[0]!.policyName}`,
      );

      expect(response.body).toStrictEqual({
        policyId: expect.any(String),
        policyName: expect.any(String),
        description: expect.any(String),
        status: expect.any(Boolean),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/69042");

      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy 69042 not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
