import {
  vi,
  describe,
  beforeAll,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import request from "supertest";
import { ethers } from "ethers";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import crypto from "node:crypto";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { Tar__factory } from "@ebsiint-sc/trusted-apps-registry";
import { PaginatedList } from "@ebsiint-api/shared";
import { AppsModule } from "./apps.module.js";
import {
  AppLink,
  AuthorizationLink,
  PublicKeyLink,
  PublicKeyResponseObject,
} from "./apps.interface.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/tar.js";
import type { ApiConfig } from "../../config/configuration.js";

interface SupertestAppsResponse {
  status: number;
  body: PaginatedList<AppLink>;
}

interface SupertestPublicKeysResponse {
  status: number;
  body: PaginatedList<PublicKeyLink>;
}

interface SupertestAuthorizationsResponse {
  status: number;
  body: PaginatedList<AuthorizationLink>;
}

interface SupertestPublicKeyResponse {
  status: number;
  body: PublicKeyResponseObject;
}

const APPS_TOTAL = 12;

describe("Apps Module", () => {
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      appsTotal: APPS_TOTAL,
    });

    const { tarContract } = testEnv;

    // Mock TAR contract
    vi.spyOn(ethers.providers, "WebSocketProvider").mockImplementation(
      () =>
        new ethers.providers.BaseProvider(
          "any",
        ) as ethers.providers.WebSocketProvider,
    );
    vi.spyOn(Tar__factory, "connect").mockImplementation(() => tarContract);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /apps", () => {
    it("should return a paginated collection of apps", async () => {
      expect.assertions(3);

      const response: SupertestAppsResponse =
        await request(server).get("/apps");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/apps?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining("/apps?page[after]=1&page[size]=10"),
          prev: expect.stringContaining("/apps?page[after]=1&page[size]=10"),
          next: expect.stringContaining(
            `/apps?page[after]=${Math.min(
              Math.ceil(APPS_TOTAL / 10),
              2,
            )}&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/apps?page[after]=${Math.ceil(APPS_TOTAL / 10)}&page[size]=10`,
          ),
        },
      });
      expect(response.body.items).toHaveLength(Math.min(10, APPS_TOTAL));
      expect(response.status).toBe(200);
    });

    it("should return an app when query public_key_id is defined", async () => {
      expect.assertions(3);

      const responseApps: SupertestAppsResponse =
        await request(server).get("/apps");
      const applicationName = responseApps.body.items[0]!.name;

      const pubKeysResponse: SupertestAppsResponse = await request(server).get(
        `/apps/${applicationName}/public-keys`,
      );
      const publicKeyId = pubKeysResponse.body.items[0]!.id;
      const response: SupertestAppsResponse = await request(server).get(
        `/apps?public_key_id=${publicKeyId}`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`,
        ),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`,
          ),
          prev: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`,
          ),
          next: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`,
          ),
          last: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId}`,
          ),
        },
      });
      expect(response.body.items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should return an empty list if the app public_key_id does not exist", async () => {
      expect.assertions(3);

      const response: SupertestAppsResponse = await request(server).get(
        `/apps?public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`,
        ),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`,
          ),
          prev: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`,
          ),
          next: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`,
          ),
          last: expect.stringContaining(
            `/apps?page[after]=1&page[size]=10&public_key_id=0x1234567890123456789012345678901234567890123456789012345678901234`,
          ),
        },
      });
      expect(response.body.items).toHaveLength(0);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1: SupertestAppsResponse =
        await request(server).get("/apps?page[size]=3");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining("/apps?page[after]=1&page[size]=3"),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining("/apps?page[after]=1&page[size]=3"),
          prev: expect.stringContaining("/apps?page[after]=1&page[size]=3"),
          next: expect.stringContaining("/apps?page[after]=2&page[size]=3"),
          last: expect.stringContaining("/apps?page[after]=4&page[size]=3"),
        },
      });
      expect(response1.body.items).toHaveLength(3);
      expect(response1.status).toBe(200);

      // next page
      const response2: SupertestAppsResponse = await request(server).get(
        "/apps?page[after]=2&page[size]=3",
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/apps"),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining("/apps?page[after]=1&page[size]=3"),
          prev: expect.stringContaining("/apps?page[after]=1&page[size]=3"),
          next: expect.stringContaining("/apps?page[after]=3&page[size]=3"),
          last: expect.stringContaining("/apps?page[after]=4&page[size]=3"),
        },
      });
      expect(response2.body.items).toHaveLength(3);
      expect(response2.status).toBe(200);

      // big page
      const response3: SupertestAppsResponse = await request(server).get(
        "/apps?page[after]=100&page[size]=3",
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining("/apps?page[after]=100&page[size]=3"),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 3,
        links: {
          first: expect.stringContaining("/apps?page[after]=1&page[size]=3"),
          prev: expect.stringContaining("/apps?page[after]=4&page[size]=3"),
          next: expect.stringContaining("/apps?page[after]=4&page[size]=3"),
          last: expect.stringContaining("/apps?page[after]=4&page[size]=3"),
        },
      });
      expect(response3.body.items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4: SupertestAppsResponse = await request(server).get(
        "/apps?page[after]=1",
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining("/apps"),
        items: expect.arrayContaining([]),
        total: APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining("/apps?page[after]=1&page[size]=10"),
          prev: expect.stringContaining("/apps?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/apps?page[after]=2&page[size]=10"),
          last: expect.stringContaining("/apps?page[after]=2&page[size]=10"),
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

  describe("GET /apps/{applicationName}", () => {
    it("should return a specific app", async () => {
      expect.assertions(2);

      // Get first app
      const { apps } = testEnv;
      const { publicKey, name, domain, appAdministrator, applicationId, info } =
        apps[0]!;

      const domainName = ["undefined", "ebsi", "external"][domain];

      const response = await request(server).get(`/apps/${name}`);

      expect(response.body).toStrictEqual({
        applicationId,
        name,
        domain: domainName,
        administrators: [appAdministrator],
        authorizations: expect.arrayContaining([]),
        info,
        publicKeys: [Buffer.from(publicKey, "utf8").toString("base64")],
        revocation: null,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the app is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/apps/0x0000000000000000000000000000000000000000000000000000000000000000",
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
  });

  describe("GET /apps/{applicationName}/public-keys", () => {
    it("should return a paginated collection of public-keys", async () => {
      expect.assertions(3);
      const { name } = testEnv.apps[0]!;
      const response: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${name}/public-keys`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect(response.body.items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);
      const { name } = testEnv.apps[0]!;
      const response1: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${name}/public-keys?page[size]=3`,
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          prev: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          next: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          last: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
        },
      });
      expect(response1.body.items).toHaveLength(1);
      expect(response1.status).toBe(200);

      // next page
      const response2: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${name}/public-keys?page[after]=2&page[size]=3`,
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining("/apps"),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          prev: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          next: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          last: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
        },
      });
      expect(response2.body.items).toHaveLength(0);
      expect(response2.status).toBe(200);

      // big page
      const response3: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${name}/public-keys?page[after]=100&page[size]=3`,
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${name}/public-keys?page[after]=100&page[size]=3`,
        ),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 3,
        links: {
          first: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          prev: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          next: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
          last: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=3`,
          ),
        },
      });
      expect(response3.body.items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page after defined but page size undefined
      const response4: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${name}/public-keys?page[after]=1`,
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(`/apps/${name}/public-keys`),
        items: expect.arrayContaining([]),
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/apps/${name}/public-keys?page[after]=1&page[size]=10`,
          ),
        },
      });
      expect(response4.body.items).toHaveLength(1);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);
      const { name } = testEnv.apps[0]!;
      const response1 = await request(server).get(
        `/apps/${name}/public-keys?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/apps/${name}/public-keys?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/apps/${name}/public-keys?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/apps/${name}/public-keys?page[after]=abc`,
      );
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

  describe("GET /apps/{name}/public-keys/{publicKeyId}", () => {
    it("should return a specific public key", async () => {
      expect.assertions(2);
      const { name, applicationId } = testEnv.apps[0]!;
      const responseKeys: SupertestPublicKeysResponse = await request(
        server,
      ).get(`/apps/${name}/public-keys`);
      const publicKeyId = responseKeys.body.items[0]!.id;

      const response: SupertestPublicKeyResponse = await request(server).get(
        `/apps/${name}/public-keys/${publicKeyId}`,
      );

      expect(response.body).toStrictEqual({
        applicationId,
        publicKey: expect.any(String),
        status: "active",
        notBefore: expect.any(Number),
        notAfter: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });

    it("should throw not found error for an unknown public key", async () => {
      expect.assertions(2);
      const { name } = testEnv.apps[0]!;
      // random key
      const publicKeyId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response: SupertestPublicKeyResponse = await request(server).get(
        `/apps/${name}/public-keys/${publicKeyId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Public Key Not Found",
        status: 404,
        detail: `Public key ${publicKeyId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw not found error for a public key owner by a different applicationId", async () => {
      expect.assertions(2);
      const { name } = testEnv.apps[0]!;
      const responseKeys: SupertestPublicKeysResponse = await request(
        server,
      ).get(`/apps/${name}/public-keys`);
      // random key
      const publicKeyId = responseKeys.body.items[0]!.id;
      const otherAppName = testEnv.apps[1]!.name;

      const response: SupertestPublicKeyResponse = await request(server).get(
        `/apps/${otherAppName}/public-keys/${publicKeyId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Public Key Not Found",
        status: 404,
        detail: `Public key ${publicKeyId} is not owned by ${otherAppName}`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /apps/{name}/authorizations", () => {
    it("should return a paginated collection of authorizations", async () => {
      expect.assertions(3);

      // Get first app
      const { apps } = testEnv;
      const { name } = apps[0]!;

      const response: SupertestAuthorizationsResponse = await request(
        server,
      ).get(`/apps/${name}/authorizations`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${name}/authorizations?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([]),
        total: 2 * APPS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps/${name}/authorizations?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/apps/${name}/authorizations?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/apps/${name}/authorizations?page[after]=${Math.min(
              Math.ceil((2 * APPS_TOTAL) / 10),
              2,
            )}&page[size]=10`,
          ),
          last: expect.stringContaining(
            `/apps/${name}/authorizations?page[after]=${Math.ceil(
              (2 * APPS_TOTAL) / 10,
            )}&page[size]=10`,
          ),
        },
      });
      expect(response.body.items).toHaveLength(Math.min(10, 2 * APPS_TOTAL));
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of authorizations filtered by requesterApplicationName", async () => {
      expect.assertions(3);

      // Get first app
      const { apps } = testEnv;
      const applicationName1 = apps[0]!.name;
      const requesterApplicationName2 = apps[1]!.name;

      const response: SupertestAuthorizationsResponse = await request(
        server,
      ).get(
        `/apps/${applicationName1}/authorizations?requesterApplicationName=${requesterApplicationName2}`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${requesterApplicationName2}`,
        ),
        items: expect.arrayContaining([]),
        total: 2,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${requesterApplicationName2}`,
          ),
          prev: expect.stringContaining(
            `/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${requesterApplicationName2}`,
          ),
          next: expect.stringContaining(
            `/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${requesterApplicationName2}`,
          ),
          last: expect.stringContaining(
            `/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${requesterApplicationName2}`,
          ),
        },
      });
      expect(response.body.items).toHaveLength(2);
      expect(response.status).toBe(200);
    });

    it("should return a specific authorization", async () => {
      expect.assertions(2);

      const { apps, authorizations } = testEnv;
      const { name } = apps[0]!;
      const applicationId = ethers.utils.sha256(Buffer.from(name, "utf8"));

      const responseAuths: SupertestAuthorizationsResponse = await request(
        server,
      ).get(`/apps/${name}/authorizations`);
      const { authorizationId } = responseAuths.body.items[0]!;
      const response = await request(server).get(
        `/apps/${name}/authorizations/${authorizationId}`,
      );
      expect(response.body).toStrictEqual({
        authorizationId: expect.any(String),
        resourceApplicationId: applicationId,
        requesterApplicationId: applicationId,
        resourceApplicationName: name,
        requesterApplicationName: name,
        iss: authorizations[0]![0]![0].iss,
        permissions: {
          create: "false",
          read: "true",
          update: "false",
          delete: "false",
        },
        status: "active",
        notBefore: expect.any(Number),
        notAfter: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });
  });
});
