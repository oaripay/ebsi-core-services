import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { PolicyLink } from "../../src/modules/policies/policies.interface";
import { PaginatedList } from "../../src/shared/interfaces";

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

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
            "/trusted-policies-registry/v1/policies?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]="
            ) as string,
          }) as PaginatedList<PolicyLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });
});
