import request from "supertest";
import { ethers } from "ethers";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AsyncReturnType } from "@ebsiint-api/shared";
import { UsersModule } from "./users.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry";
import { LedgerService } from "../ledger/ledger.service";
import { ApiConfig } from "../../config/configuration";

jest.setTimeout(90000);

const USERS_TOTAL = 12;

describe("Policies Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      usersTotal: USERS_TOTAL,
    });
    const { policiesRegistryContract } = testEnv;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = app.getHttpServer() as HttpServer;

    // Mock contract
    const ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(policiesRegistryContract)
      );
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /users", () => {
    it("should return a paginated collection of users", async () => {
      expect.assertions(3);

      const response = await request(server).get("/users");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/users?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: USERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/users?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/users?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/users?page[after]=${Math.min(
              Math.ceil(USERS_TOTAL / 10),
              2
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/users?page[after]=${Math.ceil(USERS_TOTAL / 10)}&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(
        Math.min(10, USERS_TOTAL)
      );
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get("/users?page[size]=3");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/users?page[after]=1&page[size]=3"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: USERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/users?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/users?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/users?page[after]=2&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/users?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/users?page[after]=2&page[size]=3"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/users") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: USERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/users?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/users?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/users?page[after]=3&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/users?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/users?page[after]=100&page[size]=3"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/users?page[after]=100&page[size]=3"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: USERS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/users?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/users?page[after]=4&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/users?page[after]=4&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/users?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4 = await request(server).get("/users?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/users") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: USERS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/users?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/users?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/users?page[after]=2&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/users?page[after]=2&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/users?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/users?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/users?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/users?page[after]=abc");
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

  describe("GET /users/{address}", () => {
    it("should return a specific user", async () => {
      expect.assertions(2);

      // Get first user
      const user = testEnv.users[0];

      const response = await request(server).get(`/users/${user.address}`);

      expect(response.body).toStrictEqual(user);
      expect(response.status).toBe(200);
    });

    it("should throw an error for bad requests", async () => {
      expect.assertions(2);

      const response = await request(server).get("/users/bad-address");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["address must be an Ethereum address"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the user is not found", async () => {
      expect.assertions(2);

      const randomAddress = ethers.Wallet.createRandom().address;
      const response = await request(server).get(`/users/${randomAddress}`);

      expect(response.body).toStrictEqual({
        title: "User Not Found",
        status: 404,
        detail: expect.stringContaining(
          `User ${randomAddress} not found`
        ) as string,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
