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
import crypto from "crypto";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import { JsonRpcService } from "./jsonrpc.service";
import {
  UnsignedTransaction,
  InsertAdministratorParam,
  UpdateAdministratorParam,
  InsertIssuerParam,
  UpdateIssuerParam,
  InsertPolicyParam,
  UpdatePolicyParam,
} from "./dto";
import { AttributeObject } from "../administrators/administrators.interface";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { Tir, Tir__factory } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/tir";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertAdministratorParam
  | UpdateAdministratorParam
  | InsertIssuerParam
  | UpdateIssuerParam
  | InsertPolicyParam
  | UpdatePolicyParam;

jest.setTimeout(90000);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let tirContract: Tir;
  let administrators: ethers.Wallet[];
  let jsonRpcService: JsonRpcService;
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

  const createIssuer = () => {
    const wallet = ethers.Wallet.createRandom();
    return createAdministrator(wallet);
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
  const issuerV1 = createIssuer();
  const issuerV2 = createIssuer();
  const issuerV3 = createIssuer();
  const policy1 = createPolicy();
  const policy2 = createPolicy();

  function createParam(
    method: string,
    signer: ethers.Wallet,
    updateAttribute: boolean,
    tamper = false
  ) {
    let param: JsonRpcParams;

    switch (method) {
      case "insertAdministrator": {
        // create a new administrator and add attribute1
        param = {
          attribute: tamper ? adminV2.attribute : adminV1.attribute,
          did: adminV1.did.toLowerCase(),
          from: signer.address,
        } as InsertAdministratorParam;
        break;
      }
      case "updateAdministrator": {
        if (updateAttribute) {
          // update attribute1: change it to attribute3
          param = {
            attribute: tamper ? adminV2.attribute : adminV3.attribute,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
            prevAttributeHash: adminV1.attribute.hash,
          } as UpdateAdministratorParam;
        } else {
          // updateAdministrator: add attribute2
          param = {
            attribute: tamper ? adminV3.attribute : adminV2.attribute,
            did: adminV1.did.toLowerCase(),
            from: signer.address,
          } as UpdateAdministratorParam;
        }
        break;
      }
      case "insertIssuer": {
        // create a new administrator and add attribute1
        param = {
          attribute: issuerV1.attribute,
          did: tamper ? issuerV2.did.toLowerCase() : issuerV1.did.toLowerCase(),
          from: signer.address,
        } as InsertIssuerParam;
        break;
      }
      case "updateIssuer": {
        if (updateAttribute) {
          // update attribute1: change it to attribute3
          param = {
            attribute: issuerV3.attribute,
            did: tamper
              ? issuerV2.did.toLowerCase()
              : issuerV1.did.toLowerCase(),
            from: signer.address,
            prevAttributeHash: issuerV1.attribute.hash,
          } as UpdateIssuerParam;
        } else {
          // updateIssuer: add attribute2
          param = {
            attribute: issuerV2.attribute,
            did: tamper
              ? issuerV2.did.toLowerCase()
              : issuerV1.did.toLowerCase(),
            from: signer.address,
          } as UpdateIssuerParam;
        }
        break;
      }
      case "insertPolicy": {
        param = {
          from: signer.address,
          policyId: tamper ? policy2.policyId : policy1.policyId,
          policy: policy1.policy,
        } as InsertPolicyParam;
        break;
      }
      case "updatePolicy": {
        param = {
          from: signer.address,
          policyId: tamper ? policy2.policyId : policy1.policyId,
          policy: policy2.policy,
        } as UpdatePolicyParam;
        break;
      }
      default:
        throw new Error(`Test Error: Invalid method ${method}`);
    }

    return param;
  }

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      administratorsTotal: 1,
      policiesTotal: 0,
      policiesRevisionsTotal: 0,
      issuersTotal: 2, // create 2 random issuers
    });

    tirContract = testEnv.tirContract;
    administrators = testEnv.administrators;

    // Mock TIR contract
    jest.spyOn(Tir__factory, "connect").mockImplementation(() => tirContract);

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

    // Instead of calling EBSI Ledger API, use tirContract directly
    const signer = administrators[0];
    jest
      .spyOn(jsonRpcService, "callBesuAuth")
      .mockImplementation(async (_method: string, params: unknown[]) => {
        if (_method === "eth_sendRawTransaction") {
          const tx = await tirContract
            .connect(signer)
            .provider.sendTransaction(params[0] as string);

          return tx.hash;
        }

        if (_method === "eth_estimateGas") {
          return tirContract.provider.estimateGas(
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
      to: tirContract.address,
      data: tirContract.interface.encodeFunctionData("getAdministrator", [
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

    const { chainId } = await tirContract.provider.getNetwork();
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

  it("should throw an error when the sender of a transaction is not in the TIR", async () => {
    expect.assertions(3);
    const wallet = ethers.Wallet.createRandom();

    const data = Buffer.from(
      JSON.stringify({
        "@context": {
          name: { "@id": "http://tir-api-test.org/name", "@type": "@id" },
          description: "http://tir-api-test.org/description",
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
          `Administrator did:ebsi:${wallet.address.toLowerCase()} was not found in the Trusted Issuers Registry`
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
    "insertIssuer",
    "insertAdministrator",
    "insertPolicy",
    "updateIssuer",
    "updateIssuer(test update attribute)",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
    "updatePolicy",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      const signer = administrators[0];
      const param: JsonRpcParams = createParam(method, signer, updateAttribute);

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

      const param = createParam(method, signer, updateAttribute);

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

      const param1 = createParam(method, signer, updateAttribute);
      const param2 = createParam(method, signer, updateAttribute);
      const param3 = createParam(method, signer, updateAttribute);

      let expectedErrorMessage1;
      let expectedErrorMessage2;
      let expectedErrorMessage3;
      switch (method) {
        case "insertIssuer":
        case "insertAdministrator":
        case "updateIssuer":
        case "updateAdministrator":
          delete (param1 as InsertIssuerParam).attribute;
          expectedErrorMessage1 =
            "property params[0].attribute has failed the following constraints: isObject";

          delete (param2 as InsertIssuerParam).did;
          expectedErrorMessage2 =
            "property params[0].did has failed the following constraints: isDid";

          param3.from = "bad address";
          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        case "insertPolicy":
        case "updatePolicy":
          delete (param1 as InsertPolicyParam).policy;
          expectedErrorMessage1 =
            "property params[0].policy has failed the following constraints: isBase64";

          delete (param2 as InsertPolicyParam).policyId;
          expectedErrorMessage2 =
            "property params[0].policyId has failed the following constraints: isString";

          param3.from = "bad address";
          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
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
      const wallet1 = administrators[0];
      const wallet2 = ethers.Wallet.createRandom();

      const param1 = createParam(method, wallet1, updateAttribute);
      const param2 = createParam(method, wallet1, updateAttribute, true);

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

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(transaction1))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await wallet1.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // tampering signatures
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

      // tampering "from"
      transaction1.from = wallet2.address.toLowerCase();
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
          message: `The signer of the transaction (${wallet1.address.toLowerCase()}) does not match with unsignedTransaction.from (${wallet2.address.toLowerCase()}) `,
        },
      });
      expect(responseSend1.status).toBe(400);
    });
  });
});
