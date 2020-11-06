import request from "supertest";
import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import PoliciesModule from "./policies.module";
import AllExceptionsFilter from "../../filters/http-exception.filter";
import {
  mockTirContract,
  policies,
} from "../../../tests/utils/mockTirContract";
import { ledgerWorking } from "../../../tests/utils/mockAxios";
import { generateMultihash } from "../../shared/utils/multihash.utils";

jest.setTimeout(20000);
jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("Policies Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PoliciesModule],
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

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /policies", () => {
    it("should return a paginated collection of policies", async () => {
      expect.assertions(3);

      const response = await request(server).get("/policies");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/policies") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 10,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(10);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/policies?page[size]=3");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/policies") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 10,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/policies?page[after]=2&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/policies?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/policies?page[after]=2&page[size]=3"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/policies") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 10,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/policies?page[after]=3&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/policies?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/policies?page[after]=100&page[size]=3"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/policies?page[after]=100&page[size]=3"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 10,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/policies?page[after]=4&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/policies?page[after]=4&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/policies?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/policies?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/policies") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 10,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/policies?page[after]=1&page[size]=10"
          ) as string,
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
  });

  describe("GET /policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(2);

      const policyId = Object.keys(policies)[0];
      const expectedPolicy = policies[policyId].originalValue;
      const expectedHash = generateMultihash(policies[policyId].hash);

      const response = await request(server).get(
        `/policies/${encodeURIComponent(policyId)}`
      );

      expect(response.body).toStrictEqual({
        policyId,
        policy: expectedPolicy,
        hash: expectedHash,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/no-policy");

      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy no-policy not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
