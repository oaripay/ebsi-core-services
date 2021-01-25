import request from "supertest";
import { ethers } from "ethers";
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
import { AppsModule } from "./apps.module";
import { AppLink, AuthorizationLink } from "./apps.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar__factory } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/tar";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { PaginatedList } from "../../shared/interfaces";

jest.setTimeout(150000);

interface SupertestAppsResponse {
  status: number;
  body: PaginatedList<AppLink>;
}

interface SupertestAuthorizationsResponse {
  status: number;
  body: PaginatedList<AuthorizationLink>;
}

const APPS_TOTAL = 12;

describe("Apps Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      appsTotal: APPS_TOTAL,
    });
    const { tarContract } = testEnv;

    // Mock TAR contract
    jest.spyOn(Tar__factory, "connect").mockImplementation(() => tarContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppsModule],
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
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /apps", () => {
    it("should return a paginated collection of apps", async () => {
      expect.assertions(3);

      const response: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/apps?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/apps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/apps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/apps?page[after]=${Math.min(
              Math.ceil(APPS_TOTAL / 10),
              2
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/apps?page[after]=${Math.ceil(APPS_TOTAL / 10)}&page[size]=10`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(Math.min(10, APPS_TOTAL));
      expect(response.status).toBe(200);
    });

    it("should return an app when query name is defined", async () => {
      expect.assertions(3);

      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const appName = responseApps.body.items[0].name;
      const response: SupertestAppsResponse = await request(server).get(
        `/apps?name=${appName}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&name=${appName}`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=${appName}`
          ) as string,
          prev: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=${appName}`
          ) as string,
          next: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=${appName}`
          ) as string,
          last: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=${appName}`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should return an empty list if the app name does not exist", async () => {
      expect.assertions(3);

      const response: SupertestAppsResponse = await request(server).get(
        `/apps?name=unknown-name`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&name=unknown-name`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=unknown-name`
          ) as string,
          prev: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=unknown-name`
          ) as string,
          next: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=unknown-name`
          ) as string,
          last: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&name=unknown-name`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(0);
      expect(response.status).toBe(200);
    });

    it("should return an app when query public_key_id is defined", async () => {
      expect.assertions(3);

      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const publicKeyId = responseApps.body.items[0].id;
      const response: SupertestAppsResponse = await request(server).get(
        `/apps?public_key_id=${publicKeyId}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`
          ) as string,
          prev: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`
          ) as string,
          next: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`
          ) as string,
          last: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should return an empty list if the app public_key_id does not exist", async () => {
      expect.assertions(3);

      const response: SupertestAppsResponse = await request(server).get(
        `/apps?public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`
          ) as string,
          prev: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`
          ) as string,
          next: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`
          ) as string,
          last: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(0);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1: SupertestAppsResponse = await request(server).get(
        "/apps?page[size]=3"
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/apps?page[after]=1&page[size]=3"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/apps?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/apps?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/apps?page[after]=2&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/apps?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect(response1.body.items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2: SupertestAppsResponse = await request(server).get(
        "/apps?page[after]=2&page[size]=3"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/apps") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/apps?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/apps?page[after]=1&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/apps?page[after]=3&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/apps?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect(response2.body.items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3: SupertestAppsResponse = await request(server).get(
        "/apps?page[after]=100&page[size]=3"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/apps?page[after]=100&page[size]=3"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            "/apps?page[after]=1&page[size]=3"
          ) as string,
          prev: expect.stringContaining(
            "/apps?page[after]=4&page[size]=3"
          ) as string,
          next: expect.stringContaining(
            "/apps?page[after]=4&page[size]=3"
          ) as string,
          last: expect.stringContaining(
            "/apps?page[after]=4&page[size]=3"
          ) as string,
        },
      });
      expect(response3.body.items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4: SupertestAppsResponse = await request(server).get(
        "/apps?page[after]=1"
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/apps") as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/apps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/apps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/apps?page[after]=2&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/apps?page[after]=2&page[size]=10"
          ) as string,
        },
      });
      expect(response4.body.items).toHaveLength(10);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/apps?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/apps?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/apps?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/apps?page[after]=abc");
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

  describe("GET /apps/{applicationId}", () => {
    it("should return a specific app", async () => {
      expect.assertions(2);

      // Get first app
      const { apps } = testEnv;
      const { publicKey, name, domain } = apps[0];
      const domainName = ["ebsi", "external"][domain];

      const applicationId = ethers.utils.sha256(Buffer.from(publicKey, "utf8"));
      // Get last revision of this app

      const response = await request(server).get(`/apps/${applicationId}`);

      expect(response.body).toStrictEqual({
        id: applicationId,
        name,
        domain: domainName,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the app is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/apps/0x0000000000000000000000000000000000000000000000000000000000000000"
      );

      expect(response.body).toStrictEqual({
        title: "App Not Found",
        status: 404,
        detail:
          "App 0x0000000000000000000000000000000000000000000000000000000000000000 not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the applicationId is not a hash", async () => {
      expect.assertions(4);

      const response1 = await request(server).get("/apps/no-app");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["applicationId must be longer than or equal to 66 characters","applicationId must be a hexadecimal number"]`,
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/apps/0x000000000");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["applicationId must be longer than or equal to 66 characters"]`,
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
    });
  });

  describe("GET /apps/{resourceApplicationId}/authorizations", () => {
    it("should return a paginated collection of authorizations", async () => {
      expect.assertions(3);

      // Get first app
      const { apps } = testEnv;
      const { publicKey } = apps[0];
      const applicationId = ethers.utils.sha256(Buffer.from(publicKey, "utf8"));

      const response: SupertestAuthorizationsResponse = await request(
        server
      ).get(`/apps/${applicationId}/authorizations`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${applicationId}/authorizations?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 2 * APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps/${applicationId}/authorizations?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/apps/${applicationId}/authorizations?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/apps/${applicationId}/authorizations?page[after]=${Math.min(
              Math.ceil((2 * APPS_TOTAL) / 10),
              2
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/apps/${applicationId}/authorizations?page[after]=${Math.ceil(
              (2 * APPS_TOTAL) / 10
            )}&page[size]=10`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(Math.min(10, 2 * APPS_TOTAL));
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of authorizations filtered by requesterApplicationId", async () => {
      expect.assertions(3);

      // Get first app
      const { apps } = testEnv;
      const applicationId1 = ethers.utils.sha256(
        Buffer.from(apps[0].publicKey, "utf8")
      );
      const applicationId2 = ethers.utils.sha256(
        Buffer.from(apps[1].publicKey, "utf8")
      );

      const response: SupertestAuthorizationsResponse = await request(
        server
      ).get(
        `/apps/${applicationId1}/authorizations?requesterApplicationId=${applicationId2}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 2,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
          prev: expect.stringContaining(
            `/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
          next: expect.stringContaining(
            `/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
          last: expect.stringContaining(
            `/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(2);
      expect(response.status).toBe(200);
    });

    it("should return a specific authorization", async () => {
      expect.assertions(2);

      const { apps, authorizations } = testEnv;
      const { publicKey, name } = apps[0];
      const applicationId = ethers.utils.sha256(Buffer.from(publicKey, "utf8"));

      const responseAuths: SupertestAuthorizationsResponse = await request(
        server
      ).get(`/apps/${applicationId}/authorizations`);
      const { authorizationId } = responseAuths.body.items[0];
      const response = await request(server).get(
        `/apps/${applicationId}/authorizations/${authorizationId}`
      );
      expect(response.body).toStrictEqual({
        authorizationId: expect.any(String) as string,
        resourceApplicationId: applicationId,
        requesterApplicationId: applicationId,
        resourceApplicationName: name,
        requesterApplicationName: name,
        iss: authorizations[0][0][0].iss,
        permissions: {
          create: "false",
          read: "true",
          update: "false",
          delete: "false",
        },
        status: "active",
        notBefore: expect.any(Number) as number,
        notAfter: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
    });
  });
});
