import { ethers } from "ethers";
import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  HttpServer,
  ValidationPipe,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
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
  UnsignedTransaction,
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
import LedgerService from "../../src/modules/ledger/ledger.service";
import { waitToBeMined } from "../utils/waitToBeMined";
import { PaginatedList } from "../../src/shared/interfaces";
import { requestSiopJwt } from "../utils/siopJwt";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

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
  let server: HttpServer | string;
  let ledgerService: LedgerService;
  let adminTestWallet: ethers.Wallet;
  let adminUserAccessToken: string;
  let userTestWallet: ethers.Wallet;
  let userAccessToken: string;
  let besuRpcNode: string;
  let didAppAdmin: string;
  let configService: ConfigService<ApiConfig, true>;
  let sampleTransaction: string;

  let blockscout: {
    url: string;
    bearerToken: string;
  };

  const publicKeyRaw = `-----BEGIN ${crypto.randomBytes(12).toString("hex")}`;
  const publicKeyBuffer = Buffer.from(publicKeyRaw, "utf8");
  const publicKeyId = ethers.utils.sha256(publicKeyBuffer);
  const info = {
    someData: Date.now(),
  };
  const infoHex = `0x${Buffer.from(JSON.stringify(info)).toString("hex")}`;

  const newApp = {
    name: `test-app-${new Date().toISOString()}`,
    domain: 1,
    appAdministrator: EbsiWallet.createDid(),
  };
  const applicationId = ethers.utils.sha256(
    ethers.utils.toUtf8Bytes(newApp.name)
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

    server = getServer(app, configService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );
    userTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testUserPrivateKey"))
    );
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    adminUserAccessToken = await requestSiopJwt({
      clientDid: configService.get<string>("testAdminDid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      trustedAppsRegistryUrl: `${configService.get<string>(
        "domain"
      )}${configService.get<string>("apiUrlPrefix")}`,
    });

    userAccessToken = await requestSiopJwt({
      clientDid: configService.get<string>("testUserDid"),
      clientPrivateKey: configService.get<string>("testUserPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      trustedAppsRegistryUrl: `${configService.get<string>(
        "domain"
      )}${configService.get<string>("apiUrlPrefix")}`,
    });
    didAppAdmin = configService.get<string>("testAdminDid");
    besuRpcNode = configService.get("besuRpcNode");

    blockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");
  });

  afterAll(async () => {
    await app.close();
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
            "/trusted-apps-registry/v3/apps?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-apps-registry/v3/apps?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-apps-registry/v3/apps?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-apps-registry/v3/apps?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-apps-registry/v3/apps?page[after]="
            ) as string,
          }) as PaginatedList<AppLink>["links"],
        })
      );
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
            `/trusted-apps-registry/v3/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId0}`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-apps-registry/v3/apps?page[after]=1&page[size]=10&public_key_id=${publicKeyId0}`
          ) as string,
          next: expect.stringContaining(
            "/trusted-apps-registry/v3/apps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/trusted-apps-registry/v3/apps?page[after]="
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

      const { name }: AppLink =
        responseApps.body.items[responseApps.body.items.length - 1];
      const applicationName0 = name;

      const response: SupertestAuthorizationsResponse = await request(
        server
      ).get(`/apps/${applicationName0}/authorizations`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/trusted-apps-registry/v3/apps/${applicationName0}/authorizations?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName0}/authorizations?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName0}/authorizations?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName0}/authorizations?page[after]=`
          ) as string,
          last: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName0}/authorizations?page[after]=`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of authorizations filtered by requesterApplicationName", async () => {
      expect.assertions(2);

      // Get first app
      const responseApps: SupertestAppsResponse = await request(server).get(
        "/apps"
      );

      const { name }: AppLink =
        responseApps.body.items[responseApps.body.items.length - 1];
      const app2: AppLink =
        responseApps.body.items[responseApps.body.items.length - 2];
      const applicationName1 = name;
      const applicationName2 = app2.name;

      const response: SupertestAuthorizationsResponse = await request(
        server
      ).get(
        `/apps/${applicationName1}/authorizations?requesterApplicationName=${applicationName2}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${applicationName2}`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${applicationName2}`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${applicationName2}`
          ) as string,
          next: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${applicationName2}`
          ) as string,
          last: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${applicationName1}/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${applicationName2}`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("/apps/{applicationName}", () => {
    it("should return a specific app", async () => {
      expect.assertions(3);

      const appsResponse: SupertestAppsResponse = await request(server).get(
        "/apps"
      );

      expect(appsResponse.status).toBe(200);
      const { id, name }: AppLink =
        appsResponse.body.items[appsResponse.body.items.length - 1];

      const response: SupertestAppResponse = await request(server).get(
        `/apps/${name}`
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
        revocation: expect.any(Object) as unknown,
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

  describe("/apps/{applicationName}/public-keys", () => {
    it("should return a collection of public keys", async () => {
      expect.assertions(2);
      const appsResponse: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const { name }: AppLink =
        appsResponse.body.items[appsResponse.body.items.length - 1];
      const response: SupertestPublicKeysResponse = await request(server).get(
        `/apps/${name}/public-keys`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${name}/public-keys?page[after]=1&page[size]=10`
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-apps-registry/v3/apps/${name}/public-keys?page[after]=1&page[size]=10`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-apps-registry/v3/apps/${name}/public-keys?page[after]=1&page[size]=10`
            ) as string,
            next: expect.stringContaining(
              `/trusted-apps-registry/v3/apps/${name}/public-keys?page[after]=`
            ) as string,
            last: expect.stringContaining(
              `/trusted-apps-registry/v3/apps/${name}/public-keys?page[after]=`
            ) as string,
          }) as PaginatedList<AppLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /apps/{name}/public-keys/{publicKeyId}", () => {
    it("should return a specific public key", async () => {
      expect.assertions(2);
      const appsResponse: SupertestAppsResponse = await request(server).get(
        "/apps"
      );
      const { name, id }: AppLink =
        appsResponse.body.items[appsResponse.body.items.length - 1];
      const responseKeys: SupertestPublicKeysResponse = await request(
        server
      ).get(`/apps/${name}/public-keys`);

      const pubKeyId = responseKeys.body.items[0].id;

      const response: SupertestPublicKeyResponse = await request(server).get(
        `/apps/${name}/public-keys/${pubKeyId}`
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

  describeWriteOps().each([
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
            administratorId: didAppAdmin,
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId,
            administratorId: didAppAdmin,
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
            revokedBy: didAppAdmin,
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: adminTestWallet.address,
            name: newApp.name,
            authorizedAppName: newApp.name,
            iss: didAppAdmin,
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
        .auth(adminUserAccessToken, { type: "bearer" })
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

  describeWriteOps().each([
    "insertApp",
    "insertAppPublicKey",
    "updateAppPublicKey",
    "insertAppAdministrator",
    "deleteAppAdministrator",
    "insertAppInfo",
    "insertRevocation",
    "insertAuthorization",
    "updateAuthorization",
    "updateApp",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
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
            administratorId: didAppAdmin,
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId,
            administratorId: didAppAdmin,
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
            revokedBy: didAppAdmin,
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: adminTestWallet.address,
            name: newApp.name,
            authorizedAppName: newApp.name, // Fun fact: "authorizedAppName" can be the same as "name" cc @ben
            iss: didAppAdmin,
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
            ethers.utils.toUtf8Bytes(newApp.name)
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
          param = {
            from: adminTestWallet.address,
            applicationId,
            domain: 0,
          } as UpdateAppParam;
          break;
        case "insertAppPublicKey":
          param = {
            from: adminTestWallet.address,
            applicationId,
            publicKey: `0x${publicKeyBuffer.toString("hex")}`,
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
        .auth(adminUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          id: 231,
        });

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await adminTestWallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(adminUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
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
        besuRpcNode,
        responseSend.body.result as string
      );
      expect(receipt.status).toBe(1);
      sampleTransaction = responseSend.body.result as string;

      /* eslint-disable jest/no-conditional-expect */
      switch (method) {
        case "insertApp": {
          // get app
          const appResponse: SupertestAppsResponse = await request(server).get(
            `/apps/${newApp.name}`
          );
          expect(appResponse.body).toBeDefined();
          expect(appResponse.status).toBe(200);
          break;
        }
        case "insertAuthorization": {
          // get Authorization
          const appResponse = await request(server).get(`/apps/${newApp.name}`);
          const applicationName = (appResponse.body as AppResponseObject).name;
          const appId = (appResponse.body as AppResponseObject).applicationId;

          const authsResponse: SupertestAuthorizationsResponse = await request(
            server
          ).get(`/apps/${applicationName}/authorizations`);
          const { authorizationId, requesterApplicationName } =
            authsResponse.body.items[0];
          const response = await request(server).get(
            `/apps/${applicationName}/authorizations/${authorizationId}`
          );
          expect(response.body).toStrictEqual({
            authorizationId,
            resourceApplicationId: appId,
            requesterApplicationId: expect.any(String) as string,
            resourceApplicationName: newApp.name,
            requesterApplicationName,
            iss: didAppAdmin,
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
        case "insertRevocation": {
          const response: SupertestAppResponse = await request(server).get(
            `/apps/${newApp.name}`
          );

          expect(response.body).toStrictEqual({
            applicationId: response.body.applicationId,
            name: response.body.name,
            domain: expect.any(String) as string,
            administrators: expect.arrayContaining([]) as string[],
            authorizations: expect.arrayContaining(
              []
            ) as AuthorizationResponseObject[],
            info: expect.any(Object) as { [x: string]: unknown },
            publicKeys: expect.arrayContaining([]) as string[],
            revocation: {
              revokedBy: didAppAdmin,
              notBefore: expect.any(Number) as number,
            },
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

  it("should revert the transaction if the sender has not the right attribute in TPR", async () => {
    expect.assertions(2);

    const randomApp = {
      name: `test-app-${new Date().toISOString()}`,
      domain: 1,
      appAdministrator: EbsiWallet.createDid(),
    };

    const param = {
      from: userTestWallet.address,
      ...randomApp,
    } as InsertAppParam;

    const method = "insertApp";
    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method,
        params: [param],
        id: 231,
      });

    const unsignedTransaction = responseBuild.body.result;
    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(
        JSON.stringify(unsignedTransaction)
      ) as unknown as UnsignedTransaction
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await userTestWallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
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
    // wait to be mined
    const receipt = await waitToBeMined(
      besuRpcNode,
      responseSend.body.result as string
    );
    expect(receipt.status).toBe(0);
    receipt.revertReason = Buffer.from(
      (receipt.revertReason ?? "").slice(2),
      "hex"
    )
      .toString()
      .replace(/[^a-zA-Z:' ]/g, "");
    expect(receipt).toStrictEqual(
      expect.objectContaining({
        status: 0,
        revertReason: expect.stringContaining(
          `Policy error: sender doesn't have the attribute TAR:insertApp`
        ) as string,
      })
    );
  });

  it("should return transaction data from blockscout", async () => {
    if (!blockscout.url || !sampleTransaction) return;
    expect.assertions(1);

    await new Promise((f) => {
      setTimeout(f, 1500);
    });

    // check if blockscout is working properly
    const blockscoutCheck: SupertestJsonRpcResponse = await request(
      blockscout.url
    )
      .post("")
      .set({ Authorization: blockscout.bearerToken })
      .send({
        query: `{transaction(hash: "${sampleTransaction}") { hash, blockNumber, value, gasUsed }}`,
        variables: null,
        operationName: null,
      });

    expect(blockscoutCheck.body).toStrictEqual({
      data: {
        transaction: {
          blockNumber: expect.any(Number) as number,
          gasUsed: expect.any(String) as string,
          hash: sampleTransaction,
          value: expect.any(String) as string,
        },
      },
    });
  });
});
