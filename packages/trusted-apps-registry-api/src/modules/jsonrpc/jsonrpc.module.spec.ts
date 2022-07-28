import axios from "axios";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  HttpServer,
  ValidationPipe,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { createJWT, ES256KSigner } from "did-jwt";
import { JWTVerifyResult } from "jose";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  UnsignedTransaction,
  DeleteAppAdministratorParam,
  InsertAppParam,
  InsertAppInfoParam,
  InsertAppAdministratorParam,
  InsertRevocationParam,
  InsertAuthorizationParam,
  UpdateAuthorizationParam,
  InsertPolicyParam,
  UpdatePolicyParam,
  UpdateAppParam,
  InsertAppPublicKeyParam,
  UpdateAppPublicKeyParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar, Tar__factory } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/tar";
import LedgerService from "../ledger/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | DeleteAppAdministratorParam
  | InsertAppParam
  | InsertAppInfoParam
  | InsertAppAdministratorParam
  | InsertRevocationParam
  | InsertAuthorizationParam
  | UpdateAuthorizationParam
  | InsertPolicyParam
  | UpdatePolicyParam
  | UpdateAppParam
  | InsertAppPublicKeyParam
  | UpdateAppPublicKeyParam;

jest.setTimeout(90000);

let tokenVerificationResolve = true;
let customPayload = {
  sub: "test",
} as unknown;

jest.mock("@cef-ebsi/siop-auth", () => ({
  verifyJwtTar: jest.fn().mockImplementation(async () => {
    if (!tokenVerificationResolve)
      return Promise.reject(new Error("error message"));
    return Promise.resolve({
      payload: customPayload,
    } as JWTVerifyResult);
  }),
}));

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let tarContract: Tar;
  let jsonRpcService: JsonRpcService;
  let ledgerService: LedgerService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let userAccessToken: string;
  let userAccessTokenPayload: { [x: string]: unknown };
  let defaultSignerSiopAccessToken: string;
  let defaultSignerSiopAccessTokenPayload: { [x: string]: unknown };

  function createPolicy() {
    const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const policyData = `0x${data.toString("hex")}`;
    return {
      policyId,
      policyData,
    };
  }

  const adminDid = EbsiWallet.createDid();

  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const policy3 = createPolicy();

  const appAdmin1 = EbsiWallet.createDid();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      policiesTotal: 0,
      policiesRevisionsTotal: 0,
      appsTotal: 2, // create 2 random apps
    });
    tarContract = testEnv.tarContract;

    // Mock TAR contract
    jest
      .spyOn(ethers.providers, "WebSocketProvider")
      .mockImplementation(
        () =>
          new ethers.providers.BaseProvider(
            "any"
          ) as ethers.providers.WebSocketProvider
      );
    jest.spyOn(Tar__factory, "connect").mockImplementation(() => tarContract);

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
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

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate JWTs
    userAccessTokenPayload = { sub: adminDid };
    userAccessToken = await createJWT(userAccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(crypto.randomBytes(32)),
    });

    defaultSignerSiopAccessTokenPayload = {
      sub: testEnv.user.did,
    };
    defaultSignerSiopAccessToken = await createJWT(
      defaultSignerSiopAccessTokenPayload,
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      }
    );
  });

  beforeEach(() => {
    // Make sure we never use axios.post or axios.get in tests ;-)
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    jest.spyOn(axios, "get").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    // For the tests, we assume that the DID is controlled by the signer
    jest
      .spyOn(jsonRpcService, "isDidControlledByAddress")
      .mockImplementation(async () => Promise.resolve(true));
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should reject a POST without JWT", async () => {
    expect.assertions(3);

    const response = await request(server).post("/jsonrpc").send();

    expect(response.body).toStrictEqual({
      detail: "Invalid or missing JWT",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid user token", async () => {
    expect.assertions(3);

    // Mock reject JWT
    tokenVerificationResolve = false;

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail: "Invalid JWT: error message",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    // Mock access token verification
    tokenVerificationResolve = true;

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail:
        '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when sendTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);

    // Mock access token verification
    tokenVerificationResolve = true;

    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: tarContract.address,
      data: tarContract.interface.encodeFunctionData("getAppByName", ["myapp"]),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
        params: [
          {
            protocol: "eth",
            unsignedTransaction: transaction,
            r,
            s,
            v: `0x${Number(v).toString(16)}`,
            signedRawTransaction: sgnTx,
          },
        ],
        id: "45",
      });

    const { chainId } = await tarContract.provider.getNetwork();
    const actualChainId = ethers.BigNumber.from(chainId).toHexString();

    expect(responseSend.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: `Invalid unsignedTransaction.chainId. Expected ${actualChainId}. Received 0x1b3b`,
      },
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an Invalid Request error for bad method", async () => {
    expect.assertions(2);

    // Mock access token verification
    tokenVerificationResolve = true;

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "unknown-method",
        params: [],
        id: 123,
      });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 123,
      error: {
        code: -32600,
        message: expect.stringContaining(
          "The method 'unknown-method' is invalid"
        ) as string,
      },
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);
    const signer = ethers.Wallet.createRandom();

    const param = {
      from: signer.address,
      name: "App1",
      domain: 0,
      appAdministrator: appAdmin1,
    } as InsertAppParam;

    // Mock access token verification
    tokenVerificationResolve = true;
    customPayload =
      defaultSignerSiopAccessTokenPayload as unknown as JWTVerifyResult;

    // The DID is not controlled by the signer
    jest
      .spyOn(jsonRpcService, "isDidControlledByAddress")
      .mockImplementation(async () => Promise.resolve(false));

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertApp",
        params: [param],
        id: 231,
      });

    expect(responseBuild.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 231,
      result: {
        chainId: expect.any(String) as string,
        data: expect.any(String) as string,
        from: param.from,
        gasLimit: expect.any(String) as string,
        gasPrice: expect.any(String) as string,
        nonce: expect.any(String) as string,
        to: expect.any(String) as string,
        value: "0x0",
      },
    });
    expect(responseBuild.status).toBe(200);

    const unsignedTransaction = responseBuild.body.result;
    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(
        JSON.stringify(unsignedTransaction)
      ) as unknown as UnsignedTransaction
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await signer.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
      error: {
        code: -32600,
        message: `The DID ${testEnv.user.did} is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each([
    "insertApp",
    "insertAppPublicKey",
    "updateAppPublicKey",
    "insertAppAdministrator",
    "deleteAppAdministrator",
    "insertAppInfo",
    "updateApp",
    "insertRevocation",
    "insertAuthorization",
    "updateAuthorization",
    "insertPolicy",
    "updatePolicy",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const method = testMethod.replace("(test update attribute)", "");

    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      // Mock access token verification
      tokenVerificationResolve = true;
      customPayload =
        defaultSignerSiopAccessTokenPayload as unknown as JWTVerifyResult;

      let param: JsonRpcParams = null;

      const signer = testEnv.user.wallet;

      const name = "my-app1";
      const applicationId = ethers.utils.sha256(ethers.utils.toUtf8Bytes(name));
      const appPublicKey = "this is a public key";
      const publickeyBytes = Buffer.from(appPublicKey, "utf8");
      const publicKeyId = ethers.utils.sha256(publickeyBytes);
      const publicKeyHex = `0x${publickeyBytes.toString("hex")}`;

      const appInfo = {
        data1: "my data",
      };
      const appInfoHex = `0x${Buffer.from(
        JSON.stringify(appInfo),
        "utf8"
      ).toString("hex")}`;

      // Get pre-existing apps
      const { apps } = testEnv;

      const authorization = {
        name: apps[0].name,
        authorizedAppName: apps[1].name,
        iss: appAdmin1,
        permissions: 12,
        status: 1,
        notBefore: Date.now(),
        notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
      };

      switch (method) {
        case "insertApp": {
          // insert a new app
          param = {
            from: signer.address,
            name,
            domain: 0,
            appAdministrator: appAdmin1,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          // insert administrator to an app
          param = {
            from: signer.address,
            applicationId,
            administratorId: appAdmin1,
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          // delete administrator from an app
          param = {
            from: signer.address,
            applicationId,
            administratorId: appAdmin1,
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          // insert info to an app
          param = {
            from: signer.address,
            applicationId,
            info: appInfoHex,
          } as InsertAppInfoParam;
          break;
        case "updateApp": {
          param = {
            from: signer.address,
            applicationId,
            domain: 0,
          } as UpdateAppParam;
          break;
        }
        case "insertRevocation": {
          param = {
            from: signer.address,
            // The applicationId is derived from the app public key
            applicationId,
            revokedBy: appAdmin1,
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: signer.address,
            ...authorization,
          } as InsertAuthorizationParam;
          break;
        }
        case "updateAuthorization": {
          // Dynamically get the authorizationId that we've just inserted
          const authorizationId = (
            await ledgerService
              .getContract()
              .getAuthorizations(
                ethers.utils.sha256(Buffer.from(apps[0].name, "utf8")),
                ethers.utils.sha256(Buffer.from(apps[1].name, "utf8")),
                1,
                10
              )
          ).items[0];

          param = {
            from: signer.address,
            authorizationId,
            permissions: 12,
            status: 1,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "insertAppPublicKey": {
          param = {
            from: signer.address,
            applicationId,
            publicKey: publicKeyHex,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;
          break;
        }
        case "updateAppPublicKey": {
          param = {
            from: signer.address,
            publicKeyId,
            status: 2,
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        }
        case "insertPolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policyData: policy1.policyData,
          } as InsertPolicyParam;
          break;
        }
        case "updatePolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policyData: policy2.policyData,
          } as UpdatePolicyParam;
          break;
        }
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
          from: param.from,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: "0x0",
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);

      // Mock access token verification
      tokenVerificationResolve = true;
      customPayload =
        defaultSignerSiopAccessTokenPayload as unknown as JWTVerifyResult;

      const signer = testEnv.user.wallet;
      const appPublicKey = "this is a public key";

      // Get pre-existing apps
      const { apps } = testEnv;

      let param: JsonRpcParams = null;

      const publicKey = "this is a public key";
      const publicKeyId = ethers.utils.sha256(Buffer.from(publicKey, "utf8"));
      const publicKeyHex = `0x${Buffer.from(publicKey).toString("hex")}`;

      const appInfo = {
        data1: "my data",
      };
      const appInfoHex = `0x${Buffer.from(
        JSON.stringify(appInfo),
        "utf8"
      ).toString("hex")}`;

      switch (method) {
        case "insertApp": {
          param = {
            from: signer.address,
            name: "App1",
            domain: 0,
            appAdministrator: appAdmin1,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          // insert administrator to an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            administratorId: appAdmin1,
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          // delete administrator from an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            administratorId: appAdmin1,
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          // insert info to an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            info: appInfoHex,
          } as InsertAppInfoParam;
          break;
        case "insertPolicy":
        case "updatePolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policyData: policy1.policyData,
          } as InsertPolicyParam;
          break;
        }
        case "updateApp":
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            name: "new-name",
            domain: 1,
          } as UpdateAppParam;
          break;
        case "insertRevocation": {
          param = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: appAdmin1,
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: appAdmin1,
            permissions: 9,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          break;
        }
        case "updateAuthorization": {
          param = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31", // a valid, random ID
            permissions: 10,
            status: 1,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "insertAppPublicKey": {
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            publicKey: publicKeyHex,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;
          break;
        }
        case "updateAppPublicKey": {
          param = {
            from: signer.address,
            publicKeyId,
            status: 2,
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        }
        default:
          break;
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          // no id defined
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        result: expect.objectContaining({}) as unknown,
      });
      expect(responseBuild.status).toBe(200);
    });

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      expect.assertions(6);

      // Mock access token verification
      tokenVerificationResolve = true;
      customPayload =
        defaultSignerSiopAccessTokenPayload as unknown as JWTVerifyResult;

      const signer = testEnv.user.wallet;

      let param1: JsonRpcParams = null;
      let param2: JsonRpcParams = null;
      let param3: JsonRpcParams = null;

      let expectedErrorMessage1: string;
      let expectedErrorMessage2: string;
      let expectedErrorMessage3: string;

      const appPublicKey = "this is a public key";
      const publicKeyHex = `0x${Buffer.from(appPublicKey).toString("hex")}`;

      const appInfo = {
        data1: "my data",
      };
      const appInfoHex = `0x${Buffer.from(
        JSON.stringify(appInfo),
        "utf8"
      ).toString("hex")}`;

      // Get pre-existing apps
      const { apps } = testEnv;

      switch (method) {
        case "insertApp": {
          param1 = {
            from: signer.address,
            domain: 0,
            appAdministrator: appAdmin1,
          } as InsertAppParam;

          expectedErrorMessage1 =
            "property params[0].name has failed the following constraints: isString";

          param2 = {
            from: signer.address,
            name: "App1",
            domain: 45,
            appAdministrator: appAdmin1,
          } as unknown as InsertAppParam;

          expectedErrorMessage2 =
            "property params[0].domain has failed the following constraints: max";

          param3 = {
            from: signer.address,
            name: "App1",
            domain: 0,
          } as InsertAppParam;

          expectedErrorMessage3 =
            "property params[0].appAdministrator has failed the following constraints: isString";
          break;
        }
        case "insertAppAdministrator":
          param1 = {
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: appAdmin1,
          } as InsertAppAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].from has failed the following constraints: isEthereumAddress";

          param2 = {
            from: signer.address,
            administratorId: appAdmin1,
          } as InsertAppAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";

          param3 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
          } as InsertAppAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].administratorId has failed the following constraints: isDidV1";

          break;
        case "deleteAppAdministrator":
          param1 = {
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: appAdmin1,
          } as DeleteAppAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].from has failed the following constraints: isEthereumAddress";

          param2 = {
            from: signer.address,
            administratorId: appAdmin1,
          } as DeleteAppAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";

          param3 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
          } as DeleteAppAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].administratorId has failed the following constraints: isDidV1";

          break;
        case "insertAppInfo":
          // insert info to an app
          param1 = {
            from: signer.address,
            info: appInfoHex,
          } as unknown as InsertAppInfoParam;

          expectedErrorMessage1 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";

          // insert info to an app
          param2 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
          } as InsertAppInfoParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimal";

          // insert info to an app
          param3 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            info: 123,
          } as unknown as InsertAppInfoParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimal";
          break;
        case "updateApp":
          param1 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            domain: 45,
          } as UpdateAppParam;

          param2 = {
            from: signer.address,
            domain: 0,
          } as UpdateAppParam;

          param3 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            domain: "0",
          } as unknown as UpdateAppParam;

          expectedErrorMessage1 =
            "property params[0].domain has failed the following constraints: max";
          expectedErrorMessage2 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";
          expectedErrorMessage3 =
            "property params[0].domain has failed the following constraints: max, min, isInt";

          break;
        case "insertRevocation": {
          param1 = {
            from: signer.address,
            applicationId: appPublicKey,
            revokedBy: appAdmin1,
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;

          expectedErrorMessage1 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: "mario",
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;

          expectedErrorMessage2 =
            "property params[0].revokedBy has failed the following constraints: isDid";

          param3 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: appAdmin1,
            notBefore: -10,
          } as InsertRevocationParam;

          expectedErrorMessage3 =
            "property params[0].notBefore has failed the following constraints: min";
          break;
        }
        case "insertAuthorization": {
          param1 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: appAdmin1,
            permissions: 45,
            status: 0,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;

          expectedErrorMessage1 =
            "property params[0].permissions has failed the following constraints: max";

          param2 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: "invalid iss",
            permissions: 12,
            status: 0,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;

          expectedErrorMessage2 =
            "property params[0].iss has failed the following constraints: isDid";

          param3 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: appAdmin1,
            permissions: 10,
            status: 45,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as unknown as InsertAuthorizationParam;

          expectedErrorMessage3 =
            "property params[0].status has failed the following constraints: max";
          break;
        }
        case "updateAuthorization": {
          param1 = {
            from: signer.address,
            authorizationId: "t42",
            permissions: 12,
            status: 0,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;

          expectedErrorMessage1 =
            "property params[0].authorizationId has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: 45,
            status: 0,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;

          expectedErrorMessage2 =
            "property params[0].permissions has failed the following constraints: max";

          param3 = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: 12,
            status: 45,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as unknown as UpdateAuthorizationParam;

          expectedErrorMessage3 =
            "property params[0].status has failed the following constraints: max";

          break;
        }
        case "insertAppPublicKey": {
          param1 = {
            from: signer.address,
            applicationId: "x",
            publicKey: publicKeyHex,
            status: 0,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;

          expectedErrorMessage1 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            publicKey: `0x${crypto.randomBytes(12).toString("hex")}`,
            status: 45,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as unknown as InsertAppPublicKeyParam;

          expectedErrorMessage2 =
            "property params[0].status has failed the following constraints: max";

          param3 = {
            from: signer.address,
            applicationId: "0x1234",
            publicKey: `0x${crypto.randomBytes(12).toString("hex")}`,
            status: 0,
            notBefore: -1,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;

          expectedErrorMessage3 =
            "property params[0].notBefore has failed the following constraints: min";
          break;
        }
        case "updateAppPublicKey": {
          param1 = {
            from: signer.address,
            publicKeyId: "bad id",
            status: 2,
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;

          expectedErrorMessage1 =
            "property params[0].publicKeyId has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;

          expectedErrorMessage2 =
            "property params[0].status has failed the following constraints: max, min, isInt";

          param3 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            status: 2,
          } as UpdateAppPublicKeyParam;

          expectedErrorMessage3 =
            "property params[0].notAfter has failed the following constraints: min, isInt";
          break;
        }
        case "insertPolicy":
        case "updatePolicy": {
          param1 = {
            ...policy1,
            from: signer.address,
          };
          param2 = {
            ...policy2,
            from: signer.address,
          };
          param3 = {
            ...policy3,
            from: signer.address,
          };

          delete param1.policyId;
          expectedErrorMessage1 =
            "property params[0].policyId has failed the following constraints: isString";

          delete param2.policyData;
          expectedErrorMessage2 =
            "property params[0].policyData has failed the following constraints: isHexadecimal";

          param3.from = "bad address";
          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const response1 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param1],
          id: 231,
        });

      expect(response1.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        error: {
          code: -32600,
          message: expect.stringContaining(expectedErrorMessage1) as string,
        },
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param2],
          id: 231,
        });

      expect(response2.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        error: {
          code: -32600,
          message: expect.stringContaining(expectedErrorMessage2) as string,
        },
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param3],
          id: 231,
        });

      expect(response3.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        error: {
          code: -32600,
          message: expect.stringContaining(expectedErrorMessage3) as string,
        },
      });
      expect(response3.status).toBe(400);
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      // Mock access token verification
      tokenVerificationResolve = true;
      customPayload =
        defaultSignerSiopAccessTokenPayload as unknown as JWTVerifyResult;

      const signer = testEnv.user.wallet;

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      const appPublicKey = "this is a public key";
      const publicKeyHex = `0x${Buffer.from(appPublicKey).toString("hex")}`;

      const appInfo = {
        data1: "my data",
      };
      const appInfoHex = `0x${Buffer.from(
        JSON.stringify(appInfo),
        "utf8"
      ).toString("hex")}`;

      // Get pre-existing apps
      const { apps } = testEnv;

      switch (method) {
        case "insertApp": {
          param1 = {
            from: signer.address,
            name: "App1",
            domain: 0,
            appAdministrator: appAdmin1,
          } as InsertAppParam;
          param2 = {
            from: signer.address,
            name: "App2",
            domain: 1,
            appAdministrator: EbsiWallet.createDid(),
            publicKey: publicKeyHex,
            status: 2,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          param1 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: appAdmin1,
          } as InsertAppAdministratorParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: EbsiWallet.createDid(),
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param1 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: appAdmin1,
          } as DeleteAppAdministratorParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: EbsiWallet.createDid(),
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          param1 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            info: appInfoHex,
          } as InsertAppInfoParam;
          param2 = {
            from: signer.address,
            applicationId:
              "0x24a454c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d4",
            info: appInfoHex,
          } as InsertAppInfoParam;
          break;
        case "insertRevocation": {
          param1 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: appAdmin1,
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: EbsiWallet.createDid(),
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "updateApp": {
          param1 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            domain: 0,
          } as UpdateAppParam;

          param2 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            domain: 1,
          } as UpdateAppParam;
          break;
        }
        case "insertAuthorization": {
          param1 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: appAdmin1,
            permissions: 12,
            status: 0,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          param2 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: appAdmin1,
            permissions: 12,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          break;
        }
        case "updateAuthorization": {
          param1 = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: 12,
            status: 0,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          param2 = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: 12,
            status: 2,
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "insertAppPublicKey": {
          param1 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            publicKey: `0x${crypto.randomBytes(12).toString("hex")}`,
            status: 0,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            publicKey: `0x${crypto.randomBytes(12).toString("hex")}`,
            status: 1,
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppPublicKeyParam;
          break;
        }
        case "updateAppPublicKey": {
          param1 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            status: 0,
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          param2 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            status: 1,
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        }
        case "insertPolicy":
        case "updatePolicy": {
          param1 = {
            ...policy1,
            from: signer.address,
          } as InsertPolicyParam;
          param2 = {
            ...policy2,
            from: signer.address,
          } as InsertPolicyParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param1],
          id: 231,
        });
      expect(responseBuild1.status).toBe(200);
      const transaction1 = responseBuild1.body.result as UnsignedTransaction;

      const responseBuild2: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param2],
          id: 232,
        });
      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const randomSigner = ethers.Wallet.createRandom();

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(transaction1)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction2,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx1,
            },
          ],
          id: "45",
        });
      expect(responseSend1.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        error: {
          code: -32600,
          message: expect.stringContaining(
            "does not match with the signedRawTransaction"
          ) as string,
        },
      });
      expect(responseSend1.status).toBe(400);

      // Tampering "from"
      transaction1.from = transaction2.from;
      const responseSend2 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction1,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx1,
            },
          ],
          id: "46",
        });
      expect(responseSend2.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "46",
        error: {
          code: -32600,
          message: expect.stringContaining(
            "does not match with unsignedTransaction.from"
          ) as string,
        },
      });
      expect(responseSend1.status).toBe(400);
    });
  });
});
