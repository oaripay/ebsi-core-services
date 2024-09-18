import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry-v3";
import type { RawServerDefault } from "fastify";
import { PoliciesModule } from "./policies.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { graphServer } from "../../../tests/utils/graphServer.js";
import { POLICIES_TOTAL } from "../../../tests/utils/data.js";

describe("Policies Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
    const { policiesRegistryContract } = testEnv;

    vi.spyOn(PolicyRegistry__factory, "connect").mockImplementation(
      () => policiesRegistryContract,
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PoliciesModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = app.getHttpServer();

    // Mock contract
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(policiesRegistryContract),
    );

    graphServer.listen({
      // This is to ignore GET/POST Requests and only focus on GraphQL
      onUnhandledRequest: "bypass",
    });
  });

  afterAll(async () => {
    await app.close();
    graphServer.close();
  });

  describe("GET /policies", () => {
    it("should return a paginated collection of policies", async () => {
      expect.assertions(3);

      const response = await request(server).get("/policies");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/policies?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            `/policies?page[after]=${Math.min(
              Math.ceil(POLICIES_TOTAL / 10),
              2,
            )}&page[size]=10`,
          ),
        },
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
        self: expect.stringContaining("/policies?page[after]=1&page[size]=3"),
        items: expect.arrayContaining([]),
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3",
          ),
          prev: expect.stringContaining("/policies?page[after]=1&page[size]=3"),
          next: expect.stringContaining("/policies?page[after]=2&page[size]=3"),
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/policies?page[after]=2&page[size]=3",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/policies"),
        items: expect.arrayContaining([]),
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3",
          ),
          prev: expect.stringContaining("/policies?page[after]=1&page[size]=3"),
          next: expect.stringContaining("/policies?page[after]=3&page[size]=3"),
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/policies?page[after]=100&page[size]=3",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining("/policies?page[after]=100&page[size]=3"),
        items: expect.arrayContaining([]),
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3",
          ),
          prev: expect.stringContaining(
            "/policies?page[after]=99&page[size]=3",
          ),
          next: expect.stringContaining(
            "/policies?page[after]=100&page[size]=3",
          ),
          last: expect.stringContaining(
            "/policies?page[after]=100&page[size]=3",
          ),
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/policies?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/policies"),
        items: expect.arrayContaining([]),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining(
            "/policies?page[after]=2&page[size]=10",
          ),
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/policies?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/policies?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/policies?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/policies?page[after]=abc");
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });

    it("should reject a non whitelisted query", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies?invalid-query=abc");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["property invalid-query should not exist"]',
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
        policyId: policy.policyId,
        policyName: policy.policyName,
        description: policy.description,
        status: policy.status,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/policy-unknown");

      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy policy-unknown not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
