import axios from "axios";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
import crypto from "crypto";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  UnsignedTransaction,
  DeleteAppAdministratorParam,
  InsertAppParam,
  InsertAppInfoParam,
  InsertAppAdministratorParam,
  InsertAdministratorParam,
  UpdateAdministratorParam,
  InsertRevocationParam,
  InsertAuthorizationParam,
  UpdateAuthorizationParam,
  InsertPolicyParam,
  UpdatePolicyParam,
  UpdateAppParam,
  UpdateAppPublicKeyParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AttributeObject } from "../administrators/administrators.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Tar, Tar__factory } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/tar";
import LedgerService from "../../shared/services/ledger.service";
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
  | InsertAdministratorParam
  | UpdateAdministratorParam
  | InsertRevocationParam
  | InsertAuthorizationParam
  | UpdateAuthorizationParam
  | InsertPolicyParam
  | UpdatePolicyParam
  | UpdateAppParam
  | UpdateAppPublicKeyParam;

jest.setTimeout(90000);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let tarContract: Tar;
  let administrators: ethers.Wallet[];
  let jsonRpcService: JsonRpcService;
  let ledgerService: LedgerService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;

  const createAdministrator = (wallet: ethers.Wallet) => {
    const did = `did:ebsi:${wallet.address.toLowerCase()}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.sha256(data).slice(2);
    const attribute: AttributeObject = {
      body: dataBase64,
      hash: dataHash,
    };

    return { did, attribute };
  };

  function createPolicy() {
    const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const policy = data.toString("base64");
    return {
      policyId,
      policy,
    };
  }

  const newAdminWallet = ethers.Wallet.createRandom();
  const adminV1 = createAdministrator(newAdminWallet);
  const adminV2 = createAdministrator(newAdminWallet);
  const adminV3 = createAdministrator(newAdminWallet);

  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const policy3 = createPolicy();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: 1,
      policiesTotal: 0,
      policiesRevisionsTotal: 0,
      appsTotal: 2, // create 2 random apps
    });
    tarContract = testEnv.tarContract;
    administrators = testEnv.administrators;

    // Mock TAR contract
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

    // Make sure we never use axios.post in tests ;-)
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    // Mock JsonRpcService (prevent calling EBSI Ledger API)
    jest.spyOn(jsonRpcService, "createSession").mockImplementation(async () => {
      return Promise.resolve();
    });

    // Instead of calling EBSI Ledger API, use tarContract directly
    const signer = administrators[0];
    jest
      .spyOn(jsonRpcService, "callBesuAuth")
      .mockImplementation(async (_method: string, params: unknown[]) => {
        if (_method === "eth_sendRawTransaction") {
          const tx = await tarContract
            .connect(signer)
            .provider.sendTransaction(params[0] as string);

          return tx.hash;
        }

        if (_method === "eth_estimateGas") {
          return tarContract.provider.estimateGas(
            params[0] as ethers.providers.TransactionRequest
          );
        }

        return Promise.reject(new Error("Unknown method"));
      });
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server).post("/jsonrpc").send();

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
    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: tarContract.address,
      data: tarContract.interface.encodeFunctionData("getAdministrator", [
        "did",
      ]),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "signedTransaction",
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

  it("should throw an error when the sender of a transaction is not in the TAR", async () => {
    expect.assertions(3);
    const wallet = ethers.Wallet.createRandom();

    const data = Buffer.from(
      JSON.stringify({
        "@context": {
          name: { "@id": "http://tar-api-test.org/name", "@type": "@id" },
          description: "http://tar-api-test.org/description",
        },
        name: "alice",
      })
    );
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.sha256(data);

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertAdministrator",
        params: [
          {
            from: wallet.address, // this address is not in the TAR
            did: "did:ebsi:1",
            attribute: {
              body: dataBase64,
              hash: dataHash,
            },
          },
        ],
        id: 231,
      });

    expect(responseBuild.status).toBe(200);

    const transaction = responseBuild.body.result as UnsignedTransaction;

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction))
    );

    uTx.chainId = Number(uTx.chainId);

    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "signedTransaction",
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

    expect(responseSend.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: expect.stringContaining(
          `Administrator did:ebsi:${wallet.address.toLowerCase()} was not found in the Trusted Apps Registry`
        ) as string,
      },
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an Invalid Request error for bad method", async () => {
    expect.assertions(2);

    const response = await request(server).post("/jsonrpc").send({
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

  // Tests to be repeated for every method
  describe.each([
    "insertApp",
    "insertAppAdministrator",
    "deleteAppAdministrator",
    "insertAppInfo",
    "insertAdministrator",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
    "updateApp",
    "insertRevocation",
    "insertAuthorization",
    "updateAuthorization",
    "updateAppPublicKey",
    "insertPolicy",
    "updatePolicy",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      const { did } = adminV1;
      let param: JsonRpcParams = null;

      const signer = administrators[0];

      const appPublicKey = "this is a public key";
      const publickeyBytes = Buffer.from(appPublicKey, "utf8");
      const publicKeyId = ethers.utils.sha256(publickeyBytes);

      // Get pre-existing apps
      const { apps } = testEnv;

      const authorization = {
        name: apps[0].name,
        authorizedAppName: apps[1].name,
        iss: "did:ebsi:0x001F",
        permissions: "cru",
        status: "active",
        notBefore: Date.now(),
        notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
      };

      switch (method) {
        case "insertApp": {
          // insert a new app
          param = {
            from: signer.address,
            name: "App1",
            domain: "ebsi",
            appAdministrator: "did:ebsi:0x001F",
            publicKey: appPublicKey,
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          // insert administrator to an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x0010",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          // delete administrator from an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x0010",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          // insert info to an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            info: {
              data1: "data",
            },
          } as InsertAppInfoParam;
          break;
        case "insertAdministrator": {
          // create a new administrator and add attribute1
          param = {
            attribute: adminV1.attribute,
            did: did.toLowerCase(),
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "updateAdministrator": {
          if (updateAttribute) {
            // update attribute1: change it to attribute3
            param = {
              attribute: adminV3.attribute,
              did: did.toLowerCase(),
              from: signer.address,
              prevAttributeHash: adminV1.attribute.hash,
            } as UpdateAdministratorParam;
          } else {
            // updateIssuer: add attribute2
            param = {
              attribute: adminV2.attribute,
              did: did.toLowerCase(),
              from: signer.address,
            } as UpdateAdministratorParam;
          }
          break;
        }
        case "updateApp": {
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            name: "App1-v2",
            domain: "ebsi",
          } as UpdateAppParam;
          break;
        }
        case "insertRevocation": {
          param = {
            from: signer.address,
            // The applicationId is derived from the app public key
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: "did:ebsi:0x001F",
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
                ethers.utils.sha256(Buffer.from(apps[0].publicKey, "utf8")),
                ethers.utils.sha256(Buffer.from(apps[1].publicKey, "utf8")),
                1,
                10
              )
          ).items[0];

          param = {
            from: signer.address,
            authorizationId,
            permissions: "cru",
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "updateAppPublicKey": {
          param = {
            from: signer.address,
            publicKeyId,
            status: "revoked",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        }
        case "insertPolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policy: policy1.policy,
          } as InsertPolicyParam;
          break;
        }
        case "updatePolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policy: policy2.policy,
          } as UpdatePolicyParam;
          break;
        }
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
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
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
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);
      const signer = administrators[0];
      const appPublicKey = "this is a public key";

      // Get pre-existing apps
      const { apps } = testEnv;

      let param: JsonRpcParams = null;

      const publicKey = "this is a public key";
      const publicKeyId = ethers.utils.sha256(Buffer.from(publicKey, "utf8"));

      switch (method) {
        case "insertApp": {
          param = {
            from: signer.address,
            name: "App1",
            domain: "ebsi",
            appAdministrator: "did:ebsi:0x001F",
            publicKey: appPublicKey,
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppParam;
          break;
        }
        case "insertAppAdministrator":
          // insert administrator to an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x0010",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          // delete administrator from an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            administratorId: "did:ebsi:0x0010",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          // insert info to an app
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            info: {
              data1: "data",
            },
          } as InsertAppInfoParam;
          break;
        case "insertAdministrator":
        case "updateAdministrator": {
          // create a new administrator and add attribute1
          param = {
            attribute: adminV1.attribute,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "insertPolicy":
        case "updatePolicy": {
          param = {
            from: signer.address,
            policyId: policy1.policyId,
            policy: policy1.policy,
          } as InsertPolicyParam;
          break;
        }
        case "updateApp":
          param = {
            from: signer.address,
            applicationId: publicKeyId,
            name: "new-name",
            domain: "ebsi",
          } as UpdateAppParam;
          break;
        case "insertRevocation": {
          param = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: "did:ebsi:0x001F",
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "insertAuthorization": {
          param = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: "did:ebsi:0x001F",
            permissions: "cru",
            status: "active",
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
            permissions: "cru",
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "updateAppPublicKey": {
          param = {
            from: signer.address,
            publicKeyId,
            status: "revoked",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          break;
        }
        default:
          break;
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
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

      const signer = administrators[0];

      let param1: JsonRpcParams = null;
      let param2: JsonRpcParams = null;
      let param3: JsonRpcParams = null;

      let expectedErrorMessage1;
      let expectedErrorMessage2;
      let expectedErrorMessage3;

      const appPublicKey = "this is a public key";

      // Get pre-existing apps
      const { apps } = testEnv;

      switch (method) {
        case "insertApp": {
          param1 = {
            from: signer.address,
            domain: "ebsi",
            appAdministrator: "did:ebsi:0x001F",
            publicKey: appPublicKey,
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppParam;

          expectedErrorMessage1 =
            "property params[0].name has failed the following constraints: isString";

          param2 = ({
            from: signer.address,
            name: "App1",
            domain: "unknown domain",
            appAdministrator: "did:ebsi:0x001F",
            publicKey: appPublicKey,
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as unknown) as InsertAppParam;

          expectedErrorMessage2 =
            "property params[0].domain has failed the following constraints: isEnum";

          param3 = {
            from: signer.address,
            name: "App1",
            domain: "ebsi",
            appAdministrator: "did:ebsi:0x001F",
            publicKey: appPublicKey,
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppParam;

          expectedErrorMessage3 =
            "property params[0].notBefore has failed the following constraints: isInt";
          break;
        }
        case "insertAppAdministrator":
          param1 = {
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: "did:ebsi:0x0010",
          } as InsertAppAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].from has failed the following constraints: isEthereumAddress";

          param2 = {
            from: signer.address,
            administratorId: "did:ebsi:0x0010",
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
            "property params[0].administratorId has failed the following constraints: isDid";

          break;
        case "deleteAppAdministrator":
          param1 = {
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: "did:ebsi:0x0010",
          } as DeleteAppAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].from has failed the following constraints: isEthereumAddress";

          param2 = {
            from: signer.address,
            administratorId: "did:ebsi:0x0010",
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
            "property params[0].administratorId has failed the following constraints: isDid";

          break;
        case "insertAppInfo":
          // insert info to an app
          param1 = ({
            from: signer.address,
            info: {
              data1: "data",
            },
          } as unknown) as InsertAppInfoParam;

          expectedErrorMessage1 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";

          // insert info to an app
          param2 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
          } as InsertAppInfoParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isObject";

          // insert info to an app
          param3 = ({
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            info: 123,
          } as unknown) as InsertAppInfoParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isObject";
          break;
        case "insertAdministrator":
        case "updateAdministrator": {
          param1 = {
            ...adminV1,
            from: signer.address,
          } as InsertAdministratorParam;

          delete param1.attribute;

          expectedErrorMessage1 =
            "property params[0].attribute has failed the following constraints: isObject";

          param2 = {
            from: signer.address,
            attribute: adminV1.attribute,
          } as InsertAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].did has failed the following constraints: isDid";

          param3 = {
            ...adminV3,
            from: "bad address",
          } as InsertAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
        case "updateApp":
          param1 = ({
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            name: "new-name",
            domain: "bad domain",
          } as unknown) as UpdateAppParam;

          param2 = {
            from: signer.address,
            name: "new-name",
            domain: "ebsi",
          } as UpdateAppParam;

          param3 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            domain: "ebsi",
          } as UpdateAppParam;

          expectedErrorMessage1 =
            "property params[0].domain has failed the following constraints: isEnum";
          expectedErrorMessage2 =
            "property params[0].applicationId has failed the following constraints: isHexadecimal";
          expectedErrorMessage3 =
            "property params[0].name has failed the following constraints: isString";

          break;
        case "insertRevocation": {
          param1 = {
            from: signer.address,
            applicationId: appPublicKey,
            revokedBy: "did:ebsi:0x001F",
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
            revokedBy: "did:ebsi:0x001F",
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
            iss: "did:ebsi:0x001F",
            permissions: "test",
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;

          expectedErrorMessage1 =
            "property params[0].permissions has failed the following constraints: matches";

          param2 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: "invalid iss",
            permissions: "cru",
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;

          expectedErrorMessage2 =
            "property params[0].iss has failed the following constraints: isDid";

          param3 = ({
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: "did:ebsi:0x001F",
            permissions: "cru",
            status: "unknown",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as unknown) as InsertAuthorizationParam;

          expectedErrorMessage3 =
            "property params[0].status has failed the following constraints: isEnum";
          break;
        }
        case "updateAuthorization": {
          param1 = {
            from: signer.address,
            authorizationId: "t42",
            permissions: "cru",
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;

          expectedErrorMessage1 =
            "property params[0].authorizationId has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: "test",
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;

          expectedErrorMessage2 =
            "property params[0].permissions has failed the following constraints: matches";

          param3 = ({
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: "cru",
            status: "broken",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as unknown) as UpdateAuthorizationParam;

          expectedErrorMessage3 =
            "property params[0].status has failed the following constraints: isEnum";

          break;
        }
        case "updateAppPublicKey": {
          param1 = {
            from: signer.address,
            publicKeyId: "bad id",
            status: "revoked",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;

          param2 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;

          param3 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            status: "revoked",
          } as UpdateAppPublicKeyParam;

          expectedErrorMessage1 =
            "property params[0].publicKeyId has failed the following constraints: isHexadecimal";
          expectedErrorMessage2 =
            "property params[0].status has failed the following constraints: isEnum";
          expectedErrorMessage3 =
            "property params[0].notAfter has failed the following constraints: isInt";
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

          delete param2.policy;
          expectedErrorMessage2 =
            "property params[0].policy has failed the following constraints: isBase64";

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

      const signer = administrators[0];

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      const appPublicKey = "this is a public key";

      // Get pre-existing apps
      const { apps } = testEnv;

      switch (method) {
        case "insertApp": {
          param1 = {
            from: signer.address,
            name: "App1",
            domain: "ebsi",
            appAdministrator: "did:ebsi:0x001F",
            publicKey: appPublicKey,
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAppParam;
          param2 = {
            from: signer.address,
            name: "App2",
            domain: "ebsi",
            appAdministrator: "did:ebsi:0x001A",
            publicKey: "this is a public key",
            status: "active",
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
            administratorId: "did:ebsi:0x0010",
          } as InsertAppAdministratorParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: "did:ebsi:0x0020",
          } as InsertAppAdministratorParam;
          break;
        case "deleteAppAdministrator":
          param1 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: "did:ebsi:0x0010",
          } as DeleteAppAdministratorParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            administratorId: "did:ebsi:0x0020",
          } as DeleteAppAdministratorParam;
          break;
        case "insertAppInfo":
          param1 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            info: {
              data1: "data",
            },
          } as InsertAppInfoParam;
          param2 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d4",
            info: {
              data1: "data2",
            },
          } as InsertAppInfoParam;
          break;
        case "insertAdministrator":
        case "updateAdministrator": {
          param1 = {
            ...adminV1,
            from: signer.address,
          } as InsertAdministratorParam;
          param2 = {
            ...adminV2,
            from: signer.address,
          } as InsertAdministratorParam;
          break;
        }
        case "insertRevocation": {
          param1 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: "did:ebsi:0x001F",
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          param2 = {
            from: signer.address,
            applicationId: ethers.utils.sha256(
              Buffer.from(appPublicKey, "utf8")
            ),
            revokedBy: "did:ebsi:0x001A",
            notBefore: Date.now() + 10000000,
          } as InsertRevocationParam;
          break;
        }
        case "updateApp": {
          param1 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            name: "App1-v2",
            domain: "ebsi",
          } as UpdateAppParam;

          param2 = {
            from: signer.address,
            applicationId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            name: "App1-v2.1",
            domain: "ebsi",
          } as UpdateAppParam;
          break;
        }
        case "insertAuthorization": {
          param1 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: "did:ebsi:0x001F",
            permissions: "cru",
            status: "active",
            notBefore: Date.now(),
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as InsertAuthorizationParam;
          param2 = {
            from: signer.address,
            name: apps[0].name,
            authorizedAppName: apps[1].name,
            iss: "did:ebsi:0x001F",
            permissions: "cru",
            status: "revoked",
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
            permissions: "cru",
            status: "active",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          param2 = {
            from: signer.address,
            authorizationId:
              "0x8bdd58e4f558d893144de376fc7c87a8aaef26ba8aabb2b2c7a8c022d1c88a31",
            permissions: "cru",
            status: "revoked",
            notAfter: Date.now() + 365 * 24 * 60 * 60 * 1000,
          } as UpdateAuthorizationParam;
          break;
        }
        case "updateAppPublicKey": {
          param1 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            status: "active",
            notAfter: Date.now(),
          } as UpdateAppPublicKeyParam;
          param2 = {
            from: signer.address,
            publicKeyId:
              "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d3",
            status: "revoked",
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
        JSON.parse(JSON.stringify(transaction1))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
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
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
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
