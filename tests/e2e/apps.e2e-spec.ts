import { ethers } from "ethers";
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
  UpdateAppParam,
  UpdateAppPublicKeyParam,
  UpdateAuthorizationParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";
import LedgerService from "../../src/shared/services/ledger.service";
import { waitToBeMined } from "../utils/waitToBeMined";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | DeleteAppAdministratorParam
  | InsertAppParam
  | InsertAppAdministratorParam
  | InsertAppInfoParam
  | InsertRevocationParam
  | InsertAuthorizationParam
  | UpdateAuthorizationParam
  | UpdateAppParam
  | UpdateAppPublicKeyParam;

describe("Apps (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ledgerService: LedgerService;
  let adminTestWallet: ethers.Wallet;

  const createApp = () => {
    return {
      name: `test-app-${new Date().toISOString()}`,
      domain: "ebsi",
      appAdministrator: `did:ebsi:some-admin-${new Date().toISOString()}`,
      publicKey: `my public key - ${new Date().toISOString()}`,
      status: "active",
      notBefore: Math.trunc(Date.now() / 1000),
      notAfter: Math.trunc(Date.now() / 1000) + 365 * 24 * 60 * 60,
    };
  };
  const newApp = createApp();

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

    const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("adminTestPrivateKey"))
    );

    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
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
      const publickeyBytes = Buffer.from(newApp.publicKey, "utf8");
      const publicKeyId = ethers.utils.sha256(publickeyBytes);

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
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x00123",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x00123",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            info: {
              someData: Date.now(),
            },
          } as InsertAppInfoParam;
          break;
        case "insertRevocation": {
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
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
            permissions: "cru",
            status: "active",
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
            domain: "external",
          } as UpdateAppParam;
          break;
        case "updateAppPublicKey":
          param = {
            from: adminTestWallet.address,
            publicKeyId,
            status: "revoked",
            notAfter: 1709926740,
          } as UpdateAppPublicKeyParam;
          break;
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
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
    "updateAppPublicKey",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(3);

      let param: JsonRpcParams = null;
      // this public key is created with the first "insertApp" call
      const publickeyBytes = Buffer.from(newApp.publicKey, "utf8");
      const publicKeyId = ethers.utils.sha256(publickeyBytes);

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
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x00123",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x00123",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            info: {
              someData: Date.now(),
            },
          } as InsertAppInfoParam;
          break;
        case "insertRevocation": {
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
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
            permissions: "cru",
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          break;
        }
        case "updateAuthorization": {
          // Dynamically get the authorizationId that we've just inserted
          const appId = ethers.utils.sha256(
            Buffer.from(newApp.publicKey, "utf8")
          );
          const authorizationId = (
            await ledgerService
              .getContract()
              .getAuthorizations(appId, appId, 1, 10)
          ).items[0];

          param = {
            from: adminTestWallet.address,
            authorizationId,
            permissions: "cru",
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "updateApp":
          // update app
          param = {
            from: adminTestWallet.address,
            applicationId: publicKeyId,
            name: `test-app-updated-${new Date().toISOString()}`,
            domain: "external",
          } as UpdateAppParam;
          break;
        case "updateAppPublicKey":
          // update app public key

          // this public key is already created with the previous "insertApp" call
          param = {
            from: adminTestWallet.address,
            publicKeyId,
            status: "revoked",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
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
      const receipt = await waitToBeMined(responseSend.body.result as string);
      expect(receipt.status).toBe("0x1");

      // get app
      /* const appResponse = await request(server).get(
        `/apps?name=${newApp.name}`
      );

      expect(appResponse.body).toStrictEqual({});
      expect(appResponse.status).toBe(200); */
    });
  });
});
