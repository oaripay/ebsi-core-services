import axios from "axios";
import request from "supertest";
import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ethers } from "ethers";
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
  InsertPolicyParam,
  InsertSchemaParam,
  InsertAdministratorParam,
  UpdateAdministratorParam,
  UpdateMetadataParam,
  UpdateSchemaParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  SchemaSCRegistry,
  SchemaSCRegistry__factory,
} from "../../contracts/trusted-schemas";
import { setupTestEnv } from "../../../tests/utils/schemaRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertPolicyParam
  | InsertAdministratorParam
  | InsertSchemaParam
  | UpdateAdministratorParam
  | UpdateSchemaParam
  | UpdateMetadataParam;

jest.setTimeout(120000);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let schemasRegistryContract: SchemaSCRegistry;
  let jsonRpcService: JsonRpcService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let provider: ethers.providers.Web3Provider;

  const createAdministrator = (wallet: ethers.Wallet) => {
    const did = `did:ebsi:${wallet.address.toLowerCase()}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const attributeData = `0x${Buffer.from(JSON.stringify(json)).toString(
      "hex"
    )}`;

    return { did, attributeData };
  };

  const newAdminWallet = ethers.Wallet.createRandom();
  const adminV1 = createAdministrator(newAdminWallet);
  const adminV2 = createAdministrator(newAdminWallet);
  const adminV3 = createAdministrator(newAdminWallet);

  const schemaId = `0x${Buffer.from("11.11.2011").toString("hex")}`;
  const rawSchema = {
    "@context": "https://ebsi.eu",
    type: "Schema",
    name: "example",
  };
  const serializedSchema = JSON.stringify(rawSchema);
  const serializedSchemaBuffer = Buffer.from(serializedSchema);

  const rawUpdatedSchema = {
    "@context": "https://ebsi.eu",
    type: "Schema",
    name: "example updated",
  };
  const serializedUpdatedSchema = JSON.stringify(rawUpdatedSchema);
  const serializedUpdatedSchemaBuffer = Buffer.from(serializedUpdatedSchema);

  const rawMetadata = {
    meta: "value",
  };
  const serializedMetadata = JSON.stringify(rawMetadata);
  const serializedMetadataBuffer = Buffer.from(serializedMetadata);

  const rawMetadata2 = {
    meta: "value2",
  };
  const serializedMetadata2 = JSON.stringify(rawMetadata2);
  const serializedMetadataBuffer2 = Buffer.from(serializedMetadata2);

  const rawUpdatedMetadata = {
    meta: "value",
  };
  const serializedUpdatedMetadata = JSON.stringify(rawUpdatedMetadata);
  const serializedUpdatedMetadataBuffer = Buffer.from(
    serializedUpdatedMetadata
  );

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

  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const policy3 = createPolicy();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
    schemasRegistryContract = testEnv.schemasRegistryContract;

    provider = testEnv.provider;

    // Mock SchemaSCRegistry and TAR contract
    jest
      .spyOn(SchemaSCRegistry__factory, "connect")
      .mockImplementation(() => schemasRegistryContract);

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

    // Make sure we never use axios.post in tests ;-)
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    // Instead of calling EBSI Ledger API, use schemasRegistryContract directly
    const signer = ethers.Wallet.createRandom().connect(provider);
    jest
      .spyOn(jsonRpcService, "callBesuAuth")
      .mockImplementation(async (_method: string, params: unknown[]) => {
        if (_method === "eth_sendRawTransaction") {
          const tx = await schemasRegistryContract
            .connect(signer)
            .provider.sendTransaction(params[0] as string);

          return tx.hash;
        }

        if (_method === "eth_estimateGas") {
          return schemasRegistryContract.provider.estimateGas(
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
      to: schemasRegistryContract.address,
      data: schemasRegistryContract.interface.encodeFunctionData(
        "insertSchema",
        [schemaId, serializedSchemaBuffer, serializedMetadataBuffer]
      ),
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

    const { chainId } = await schemasRegistryContract.provider.getNetwork();
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "insertAdministrator",
    "insertPolicy",
    "insertSchema",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
    "updateSchema",
    "updateMetadata",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      const { did } = adminV1;
      let param: JsonRpcParams = null;

      const signer = ethers.Wallet.createRandom();

      switch (method) {
        case "insertAdministrator": {
          // create a new administrator and add attribute1
          param = {
            attributeData: adminV1.attributeData,
            did: did.toLowerCase(),
            from: signer.address,
          } as InsertAdministratorParam;
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
        case "insertSchema": {
          param = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as InsertSchemaParam;
          break;
        }
        case "updateAdministrator": {
          if (updateAttribute) {
            // update attribute1: change it to attribute3
            param = {
              attributeData: adminV3.attributeData,
              did: did.toLowerCase(),
              from: signer.address,
              prevAttributeHash: ethers.utils.sha256(
                Buffer.from(adminV1.attributeData.slice(2), "hex")
              ),
            } as UpdateAdministratorParam;
          } else {
            // updateIssuer: add attribute2
            param = {
              attributeData: adminV2.attributeData,
              did: did.toLowerCase(),
              from: signer.address,
            } as UpdateAdministratorParam;
          }
          break;
        }
        case "updateSchema": {
          param = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedUpdatedMetadataBuffer.toString("hex")}`,
          } as UpdateSchemaParam;
          break;
        }
        case "updateMetadata": {
          param = {
            from: signer.address,
            schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
            metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
          } as UpdateMetadataParam;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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

      const signer = ethers.Wallet.createRandom();

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertAdministrator": {
          param = {
            attributeData: adminV1.attributeData,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
          } as InsertAdministratorParam;
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
        case "insertSchema": {
          param = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as InsertSchemaParam;
          break;
        }
        case "updateAdministrator": {
          param = {
            attributeData: adminV1.attributeData,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
          } as UpdateAdministratorParam;
          break;
        }
        case "updateSchema": {
          param = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as UpdateSchemaParam;
          break;
        }
        case "updateMetadata": {
          param = {
            from: signer.address,
            schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
            metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
          } as UpdateMetadataParam;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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

      const signer = ethers.Wallet.createRandom();

      let param1: JsonRpcParams = null;
      let param2: JsonRpcParams = null;
      let param3: JsonRpcParams = null;

      let expectedErrorMessage1;
      let expectedErrorMessage2;
      let expectedErrorMessage3;

      switch (method) {
        case "insertAdministrator": {
          param1 = {
            did: adminV1.did,
            from: signer.address,
          } as InsertAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].attributeData has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            attributeData: adminV1.attributeData,
          } as InsertAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].did has failed the following constraints: isLowercase, isDid";

          param3 = {
            did: adminV1.did,
            attributeData: adminV1.attributeData,
            from: "bad address",
          } as InsertAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
        case "insertPolicy": {
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
        case "insertSchema": {
          param1 = {
            from: signer.address,
            schemaId,
            schema: "0x1234",
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as InsertSchemaParam;

          expectedErrorMessage1 =
            "property params[0].schema has failed the following constraints: isHexadecimalJSON";

          param2 = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedSchemaBuffer.toString("hex")}`,
            metadata: "0x1234",
          } as InsertSchemaParam;

          expectedErrorMessage2 =
            "property params[0].metadata has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: signer.address,
            schema: `0x${serializedSchemaBuffer.toString("hex")}`,
            metadata: serializedMetadataBuffer.toString("hex"),
          } as InsertSchemaParam;

          expectedErrorMessage3 =
            "property params[0].metadata has failed the following constraints: matches";
          break;
        }
        case "updateSchema": {
          param1 = {
            from: signer.address,
            schemaId,
            schema: "0x1234",
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as UpdateSchemaParam;

          expectedErrorMessage1 =
            "property params[0].schema has failed the following constraints: isHexadecimalJSON";

          param2 = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
            metadata: "0x1234",
          } as UpdateSchemaParam;

          expectedErrorMessage2 =
            "property params[0].metadata has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: signer.address,
            schemaId: "11.11.2011",
            schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as UpdateSchemaParam;

          expectedErrorMessage3 =
            "property params[0].schemaId has failed the following constraints: isHexadecimal, matches";
          break;
        }
        case "updateMetadata": {
          param1 = {
            from: signer.address,
            schemaRevisionId: "1234",
            metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
          } as UpdateMetadataParam;

          expectedErrorMessage1 =
            "property params[0].schemaRevisionId has failed the following constraints: matches";

          param2 = {
            from: signer.address,
            schemaRevisionId: "0x",
            metadata: "0x1234",
          } as UpdateMetadataParam;

          expectedErrorMessage2 =
            "property params[0].metadata has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: signer.address,
            schemaRevisionId: "0x",
            metadata: serializedMetadataBuffer.toString("hex"),
          } as UpdateMetadataParam;

          expectedErrorMessage3 =
            "property params[0].metadata has failed the following constraints: matches";
          break;
        }
        case "updateAdministrator": {
          param1 = {
            did: adminV1.did,
            from: signer.address,
          } as UpdateAdministratorParam;

          expectedErrorMessage1 =
            "property params[0].attributeData has failed the following constraints: isHexadecimal";

          param2 = {
            from: signer.address,
            attributeData: adminV1.attributeData,
          } as UpdateAdministratorParam;

          expectedErrorMessage2 =
            "property params[0].did has failed the following constraints: isLowercase, isDid";

          param3 = {
            did: adminV1.did,
            attributeData: adminV1.attributeData,
            from: "bad address",
          } as UpdateAdministratorParam;

          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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

      const signer = ethers.Wallet.createRandom();

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      const metadata2 = {
        meta: "another value",
      };

      switch (method) {
        case "insertAdministrator": {
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
        case "insertPolicy": {
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
        case "insertSchema": {
          param1 = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as InsertSchemaParam;

          param2 = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedSchemaBuffer.toString("hex")}`,
            metadata: `0x${Buffer.from(JSON.stringify(metadata2)).toString(
              "hex"
            )}`,
          } as InsertSchemaParam;

          break;
        }
        case "updateAdministrator": {
          param1 = {
            ...adminV1,
            from: signer.address,
          } as UpdateAdministratorParam;
          param2 = {
            ...adminV2,
            from: signer.address,
          } as UpdateAdministratorParam;
          break;
        }
        case "updateSchema": {
          param1 = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as UpdateSchemaParam;

          param2 = {
            from: signer.address,
            schemaId,
            schema: `0x${serializedUpdatedSchemaBuffer.toString("hex")}`,
            metadata: `0x${Buffer.from(JSON.stringify(metadata2)).toString(
              "hex"
            )}`,
          } as UpdateSchemaParam;

          break;
        }
        case "updateMetadata": {
          param1 = {
            from: signer.address,
            schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
            metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
          } as UpdateMetadataParam;

          param2 = {
            from: signer.address,
            schemaRevisionId: ethers.utils.sha256(serializedSchemaBuffer),
            metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
          } as UpdateMetadataParam;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
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
