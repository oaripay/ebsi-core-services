import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  PolicyResponseObject,
  PolicyLink,
} from "../../src/modules/policies/policies.interface";
import { PaginatedList } from "../../src/shared/interfaces";

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

interface SupertestPolicyResponse {
  status: number;
  body: PolicyResponseObject;
}

jest.setTimeout(60000);

describe("Policies (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  describe("/policies", () => {
    it("should return a collection of policies", async () => {
      expect.assertions(2);
      const response: SupertestPoliciesResponse = await request(server).get(
        "/policies"
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-apps-registry/v2/policies?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-apps-registry/v2/policies?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-apps-registry/v2/policies?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-apps-registry/v2/policies?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-apps-registry/v2/policies?page[after]="
            ) as string,
          }) as PaginatedList<PolicyLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(3);

      const policiesResponse: SupertestPoliciesResponse = await request(
        server
      ).get("/policies");

      expect(policiesResponse.status).toBe(200);
      const { policyId }: PolicyLink = policiesResponse.body.items[
        policiesResponse.body.items.length - 1
      ];

      const response: SupertestPolicyResponse = await request(server).get(
        `/policies/${encodeURIComponent(policyId)}`
      );

      expect(response.body).toStrictEqual({
        policyId,
        policy: expect.any(String) as string,
        hash: expect.any(String) as string,
      });
      expect(response.status).toBe(200);
    });

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
});
