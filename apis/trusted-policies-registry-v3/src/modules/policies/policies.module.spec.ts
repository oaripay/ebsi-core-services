import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { PoliciesModule } from "./policies.module.js";

const POLICIES_TOTAL = 12;

describe("Policies Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      policiesTotal: POLICIES_TOTAL,
    });
    const { policiesRegistryContract } = testEnv;

    const moduleFixture = await Test.createTestingModule({
      imports: [PoliciesModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = app.getHttpServer();

    // Mock contract
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => policiesRegistryContract,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /policies", () => {
    it("should return a paginated collection of policies", async () => {
      expect.assertions(3);

      const response = await request(server).get("/policies");
      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining(
            `/policies?page[after]=${Math.ceil(
              POLICIES_TOTAL / 10,
            )}&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/policies?page[after]=${Math.min(
              Math.ceil(POLICIES_TOTAL / 10),
              2,
            )}&page[size]=10`,
          ),
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
        },
        pageSize: 10,
        self: expect.stringContaining("/policies?page[after]=1&page[size]=10"),
        total: POLICIES_TOTAL,
      });
      expect((response.body as { items: string }).items).toHaveLength(
        Math.min(10, POLICIES_TOTAL),
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/policies?page[size]=3");
      expect(response1.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3",
          ),
          last: expect.stringContaining("/policies?page[after]=4&page[size]=3"),
          next: expect.stringContaining("/policies?page[after]=2&page[size]=3"),
          prev: expect.stringContaining("/policies?page[after]=1&page[size]=3"),
        },
        pageSize: 3,
        self: expect.stringContaining("/policies?page[after]=1&page[size]=3"),
        total: POLICIES_TOTAL,
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/policies?page[after]=2&page[size]=3",
      );
      expect(response2.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3",
          ),
          last: expect.stringContaining("/policies?page[after]=4&page[size]=3"),
          next: expect.stringContaining("/policies?page[after]=3&page[size]=3"),
          prev: expect.stringContaining("/policies?page[after]=1&page[size]=3"),
        },
        pageSize: 3,
        self: expect.stringContaining("/policies"),
        total: POLICIES_TOTAL,
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/policies?page[after]=100&page[size]=3",
      );
      expect(response3.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3",
          ),
          last: expect.stringContaining("/policies?page[after]=4&page[size]=3"),
          next: expect.stringContaining("/policies?page[after]=4&page[size]=3"),
          prev: expect.stringContaining("/policies?page[after]=4&page[size]=3"),
        },
        pageSize: 3,
        self: expect.stringContaining("/policies?page[after]=100&page[size]=3"),
        total: POLICIES_TOTAL,
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/policies?page[after]=1");
      expect(response4.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
          last: expect.stringContaining(
            "/policies?page[after]=2&page[size]=10",
          ),
          next: expect.stringContaining(
            "/policies?page[after]=2&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
        },
        pageSize: 10,
        self: expect.stringContaining("/policies"),
        total: POLICIES_TOTAL,
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/policies?page[size]=100");
      expect(response1.body).toStrictEqual({
        detail: '["page[size] must not be greater than 50"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/policies?page[size]=0");
      expect(response2.body).toStrictEqual({
        detail: '["page[size] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/policies?page[after]=0");
      expect(response3.body).toStrictEqual({
        detail: '["page[after] must not be less than 1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/policies?page[after]=abc");
      expect(response4.body).toStrictEqual({
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });

    it("should reject a non whitelisted query", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies?invalid-query=abc");

      expect(response.body).toStrictEqual({
        detail: '["property invalid-query should not exist"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /policies/{policyName}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(2);

      // Get first policy
      const policy = testEnv.policies[0]!;

      const response = await request(server).get(
        `/policies/${policy.policyName}`,
      );

      expect(response.body).toStrictEqual({
        description: policy.description,
        policyId: `${policy.policyId}`,
        policyName: policy.policyName,
        status: policy.status,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/policy-unknown");

      expect(response.body).toStrictEqual({
        detail: "Policy policy-unknown not found",
        status: 404,
        title: "Policy Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
