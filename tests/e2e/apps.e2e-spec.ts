import { ethers } from "ethers";
import crypto from "crypto";
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
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  DeleteAppAdministratorParam,
  InsertAppParam,
  InsertAppAdministratorParam,
  InsertAppInfoParam,
  InsertRevocationParam,
  InsertAuthorizationParam,
  InsertAppPublicKeyParam,
  UpdateAppParam,
  UpdateAppPublicKeyParam,
  UpdateAuthorizationParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import {
  AppResponseObject,
  AppLink,
  AuthorizationLink,
  AuthorizationResponseObject,
  PublicKeyResponseObject,
  PublicKeyLink,
} from "../../src/modules/apps/apps.interface";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";
import LedgerService from "../../src/shared/services/ledger.service";
import { waitToBeMined } from "../utils/waitToBeMined";
import { PaginatedList } from "../../src/shared/interfaces";
import { requestSiopJwt } from "../utils/siopJwt";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface SupertestAppsResponse {
  status: number;
  body: PaginatedList<AppLink>;
}

interface SupertestAppResponse {
  status: number;
  body: AppResponseObject;
}

interface SupertestAuthorizationsResponse {
  status: number;
  body: PaginatedList<AuthorizationLink>;
}

interface SupertestPublicKeysResponse {
  status: number;
  body: PaginatedList<PublicKeyLink>;
}

interface SupertestPublicKeyResponse {
  status: number;
  body: PublicKeyResponseObject;
}

type JsonRpcParams =
  | DeleteAppAdministratorParam
  | InsertAppParam
  | InsertAppAdministratorParam
  | InsertAppInfoParam
  | InsertRevocationParam
  | InsertAuthorizationParam
  | InsertAppPublicKeyParam
  | UpdateAuthorizationParam
  | UpdateAppParam
  | UpdateAppPublicKeyParam;

describe("Apps (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ledgerService: LedgerService;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;

  const publicKeyRaw = `-----BEGIN ${crypto.randomBytes(12).toString("hex")}`;
  const publicKeyBuffer = Buffer.from(publicKeyRaw, "utf8");
  const publicKeyId = ethers.utils.sha256(publicKeyBuffer);
  const applicationId = publicKeyId;
  const info = {
    someData: Date.now(),
  };
  const infoHex = `0x${Buffer.from(JSON.stringify(info)).toString("hex")}`;

  const newApp = {
    name: `test-app-${new Date().toISOString()}`,
    domain: 1,
    appAdministrator: `did:ebsi:some-admin-${new Date().toISOString()}`,
    publicKey: `0x${publicKeyBuffer.toString("hex")}`,
    status: 1,
    notBefore: Math.trunc(Date.now() / 1000),
    notAfter: Math.trunc(Date.now() / 1000) + 365 * 24 * 60 * 60,
  };

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

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate a valid Client JWT (SIOP) for the tests
    const didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    testUserAccessToken = await requestSiopJwt({
      didRegistry,
      clientDid: configService.get<string>("testAdminDid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
    });
  });

  describe("/apps", () => {
    it("should return a collection of apps", async () => {
      expect.assertions(2);
      const response: SupertestAppsResponse = await request(server).get(
        "/apps"
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-apps-registry/v2/apps?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-apps-registry/v2/apps?page[after]="
            ) as string,
          }) as PaginatedList<AppLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });

    it("should return an app when query name is defined", async () => {
      expect.assertions(3);

      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const lastOne = responseApps.body.items.length - 1;
      const appName = responseApps.body.items[lastOne].name;
      const response: SupertestAppsResponse = await request(server).get(
        `/apps?name=${appName}`
      );
      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10&name=${appName}`
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10&name=${appName}`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10&name=${appName}`
            ) as string,
            next: expect.stringContaining(
              "/trusted-apps-registry/v2/apps?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-apps-registry/v2/apps?page[after]="
            ) as string,
          }) as PaginatedList<AppLink>["links"],
        })
      );
      expect(response.body.items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should return an app when query public_key_id is defined", async () => {
      expect.assertions(3);

      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const publicKeyId0 = responseApps.body.items[0].id;
      const response: SupertestAppsResponse = await request(server).get(
        `/apps?public_key_id=${publicKeyId0}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId0}`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId0}`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-apps-registry/v2/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId0}`
          ) as string,
          next: expect.stringContaining(
            "/trusted-apps-registry/v2/apps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/trusted-apps-registry/v2/apps?page[after]="
          ) as string,
        },
      });
      expect(response.body.items).toHaveLength(1);
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of authorizations", async () => {
      expect.assertions(2);

      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const applicationId0 = responseApps.body.items[0].id;
      const response: SupertestAuthorizationsResponse = await request(
        server
      ).get(`/apps/${applicationId0}/authorizations`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/trusted-apps-registry/v2/apps/${applicationId0}/authorizations?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId0}/authorizations?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId0}/authorizations?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId0}/authorizations?page[after]=`
          ) as string,
          last: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId0}/authorizations?page[after]=`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of authorizations filtered by requesterApplicationId", async () => {
      expect.assertions(2);

      // Get first app
      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const applicationId1 = responseApps.body.items[0].id;
      const applicationId2 = responseApps.body.items[1].id;

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
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
          next: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
          last: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${applicationId1}/authorizations?page[after]=1&page[size]=10&requesterApplicationId=${applicationId2}`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("/apps/{applicationId}", () => {
    it("should return a specific app", async () => {
      expect.assertions(3);

      const appsResponse: SupertestAppsResponse = await request(server).get(
        "/apps"
      );

      expect(appsResponse.status).toBe(200);
      const { id, name }: AppLink =
        appsResponse.body.items[appsResponse.body.items.length - 1];

      const response: SupertestAppResponse = await request(server).get(
        `/apps/${id}`
      );

      expect(response.body).toStrictEqual({
        applicationId: id,
        name,
        domain: expect.any(String) as string,
        administrators: expect.arrayContaining([]) as string[],
        authorizations: expect.arrayContaining(
          []
        ) as AuthorizationResponseObject[],
        info: expect.any(Object) as { [x: string]: unknown },
        publicKeys: expect.arrayContaining([]) as string[],
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
  });

  describe("/apps/{applicationId}/public-keys", () => {
    it("should return a collection of public keys", async () => {
      expect.assertions(2);
      const appsResponse: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const { id }: AppLink =
        appsResponse.body.items[appsResponse.body.items.length - 1];
      const response: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${id}/public-keys`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-apps-registry/v2/apps/${id}/public-keys?page[after]=1&page[size]=10`
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-apps-registry/v2/apps/${id}/public-keys?page[after]=1&page[size]=10`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-apps-registry/v2/apps/${id}/public-keys?page[after]=1&page[size]=10`
            ) as string,
            next: expect.stringContaining(
              `/trusted-apps-registry/v2/apps/${id}/public-keys?page[after]=`
            ) as string,
            last: expect.stringContaining(
              `/trusted-apps-registry/v2/apps/${id}/public-keys?page[after]=`
            ) as string,
          }) as PaginatedList<AppLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /apps/{appId}/public-keys/{publicKeyId}", () => {
    it("should return a specific public key", async () => {
      expect.assertions(2);
      const appsResponse: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const { id }: AppLink =
        appsResponse.body.items[appsResponse.body.items.length - 1];
      const responseKeys: SupertestPublicKeysResponse = await request(
        server
      ).get(`/apps/${id}/public-keys`);

      const pubKeyId = responseKeys.body.items[0].id;

      const response: SupertestPublicKeyResponse = await request(server).get(
        `/apps/${id}/public-keys/${pubKeyId}`
      );

      expect(response.body).toStrictEqual({
        applicationId: id,
        publicKey: expect.any(String) as string,
        status: expect.any(String) as string,
        notBefore: expect.any(Number) as number,
        notAfter: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
    });
  });

  describe.each([
    "insertApp",
    "insertAppAdministrator",
    "deleteAppAdministrator",
    "insertAppInfo",
    "insertRevocation",
    "insertAuthorization",
    "updateApp",
    "updateAppPublicKey",
  ])("/jsonrpc - method: %s", (method: string) => {
    it(`should return a new unsigned transaction`, async () => {
      expect.assertions(2);

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertApp": {
          param = {
            from: adminTestWallet.address,
            ...newApp,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId,
            administratorId: "did:ebsi:0x00123",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId,
            administratorId: "did:ebsi:0x00123",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            info: infoHex,
          } as InsertAppInfoParam;
          break;
        case "insertRevocation": {
          param = {
            from: adminTestWallet.address,
            applicationId,
            revokedBy: "did:ebsi:0x001F",
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: adminTestWallet.address,
            name: newApp.name,
            authorizedAppName: newApp.name,
            iss: "did:ebsi:0x001F",
            permissions: 12,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          break;
        }
        case "updateApp":
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            name: `test-app-updated-${new Date().toISOString()}`,
            domain: 2,
          } as UpdateAppParam;
          break;
        case "updateAppPublicKey":
          param = {
            from: adminTestWallet.address,
            publicKeyId,
            status: 2,
            notAfter: 1709926740,
          } as UpdateAppPublicKeyParam;
          break;
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String) as string,
          data: expect.any(String) as string,
          from: adminTestWallet.address,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: expect.any(String) as string,
        },
      });
      expect(responseBuild.status).toBe(200);
    });
  });

  describe.each([
    "insertApp",
    "insertAppAdministrator",
    "deleteAppAdministrator",
    "insertAppInfo",
    "insertRevocation",
    "insertAuthorization",
    "updateAuthorization",
    "updateApp",
    "insertAppPublicKey",
    "updateAppPublicKey",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(5);

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertApp": {
          // create a new app
          param = {
            from: adminTestWallet.address,
            ...newApp,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId,
            administratorId: "did:ebsi:0x00123",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId,
            administratorId: "did:ebsi:0x00123",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          param = {
            from: adminTestWallet.address,
            applicationId,
            info: infoHex,
          } as InsertAppInfoParam;
          break;
        case "insertRevocation": {
          param = {
            from: adminTestWallet.address,
            applicationId,
            revokedBy: "did:ebsi:0x001F",
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: adminTestWallet.address,
            name: newApp.name,
            authorizedAppName: newApp.name, // Fun fact: "authorizedAppName" can be the same as "name" cc @ben
            iss: "did:ebsi:0x001F",
            permissions: 12,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          break;
        }
        case "updateAuthorization": {
          // Dynamically get the authorizationId that we've just inserted
          const appId = ethers.utils.sha256(
            Buffer.from(newApp.publicKey.slice(2), "hex")
          );
          const authorizationId = (
            await ledgerService
              .getContract()
              .getAuthorizations(appId, appId, 1, 10)
          ).items[0];

          param = {
            from: adminTestWallet.address,
            authorizationId,
            permissions: 12,
            status: 2,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "updateApp":
          // update app
          param = {
            from: adminTestWallet.address,
            applicationId,
            name: `test-app-updated-${new Date().toISOString()}`,
            domain: 2,
          } as UpdateAppParam;
          break;
        case "insertAppPublicKey":
          param = {
            from: adminTestWallet.address,
            applicationId,
            publicKey: `0x${Buffer.from(
              `another public key - ${new Date().toISOString()}`
            ).toString("hex")}`,
            status: 3,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;
          break;
        case "updateAppPublicKey":
          // this public key is already created with the previous "insertApp" call
          param = {
            from: adminTestWallet.address,
            publicKeyId,
            status: 3,
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          id: 231,
        });

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await adminTestWallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: "45",
        });

      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        result: expect.any(String) as string,
      });
      expect(responseSend.status).toBe(200);

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerService,
        responseSend.body.result as string
      );
      expect(receipt.status).toBe(1);

      /* eslint-disable jest/no-conditional-expect */
      switch (method) {
        case "insertApp": {
          // get app
          const appResponse: SupertestAppsResponse = await request(server).get(
            `/apps?name=${newApp.name}`
          );
          expect(appResponse.body.items).toHaveLength(1);
          expect(appResponse.status).toBe(200);
          break;
        }
        case "insertAuthorization": {
          // get Authorization
          const appResponse: SupertestAppsResponse = await request(server).get(
            `/apps?name=${newApp.name}`
          );
          const appId = appResponse.body.items[0].id;
          const authsResponse: SupertestAuthorizationsResponse = await request(
            server
          ).get(`/apps/${appId}/authorizations`);
          const { authorizationId, requesterApplicationName } =
            authsResponse.body.items[0];
          const response = await request(server).get(
            `/apps/${appId}/authorizations/${authorizationId}`
          );
          expect(response.body).toStrictEqual({
            authorizationId,
            resourceApplicationId: appId,
            requesterApplicationId: expect.any(String) as string,
            resourceApplicationName: newApp.name,
            requesterApplicationName,
            iss: "did:ebsi:0x001F",
            permissions: {
              create: "true",
              read: "true",
              update: "false",
              delete: "false",
            },
            status: "active",
            notBefore: expect.any(Number) as number,
            notAfter: expect.any(Number) as number,
          });
          expect(response.status).toBe(200);
          break;
        }
        default:
          expect(1).toBe(1);
          expect(1).toBe(1);
          break;
      }
    });
  });
});
