import { describe, beforeAll, it, expect, afterAll } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { methodNotAllowed, type PaginatedList } from "@ebsiint-api/shared";
import { AppModule } from "../../src/app.module.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { PolicyLink } from "../../src/modules/policies/policies.interface.js";
import { getServer } from "../utils/getServer.js";

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

describe("TSR API v2 - Policies (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
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
          self: expect.stringContaining(
            "/trusted-schemas-registry/v2/policies?page[after]=1&page[size]=10",
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-schemas-registry/v2/policies?page[after]=1&page[size]=10",
            ),
            prev: expect.stringContaining(
              "/trusted-schemas-registry/v2/policies?page[after]=1&page[size]=10",
            ),
            next: expect.stringContaining(
              "/trusted-schemas-registry/v2/policies?page[after]=",
            ),
            last: expect.stringContaining(
              "/trusted-schemas-registry/v2/policies?page[after]=",
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/policies/{policyId}", () => {
    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);
      const response = await request(server).get("/policies/unknown-policy");
      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy unknown-policy not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/policies/{policyId}/revisions", () => {
    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/policies/unknown-policy/revisions",
      );

      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy unknown-policy not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
