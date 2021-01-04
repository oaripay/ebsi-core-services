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
import JsonRpcResponseObject from "./types/jsonrpc.interface";
import UnsignedTransaction from "./dto/signedTransaction/unsigned-transaction.dto";
import paramInsertAdministrator from "./dto/insertAdministrator/param.dto";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { Tar, Tar__factory } from "../../contracts";
import { ledgerWorking } from "../../../tests/mocks/axios";
import { setupTestEnv } from "../../../tests/utils/tar";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

function createParamInsertAdministrator(
  from: string
): paramInsertAdministrator {
  const did = `did:ebsi:test-${new Date().toISOString()}`;
  const json = {
    // any object here
    any: "Any attribute here",
    type: "credential",
    data: crypto.randomBytes(16).toString("hex"),
  };
  const data = Buffer.from(JSON.stringify(json));
  const dataBase64 = data.toString("base64");
  const dataHash = ethers.utils.sha256(data);
  const attribute = {
    body: dataBase64,
    hash: dataHash,
  };
  return {
    from,
    did,
    attribute,
  };
}

function createParam(method: string, from: string) {
  switch (method) {
    case "insertAdministrator":
      return createParamInsertAdministrator(from);
    default:
      throw new Error(`Test Error: Invalid method ${method}`);
  }
}

jest.setTimeout(20000);

jest.spyOn(axios, "post").mockImplementation(ledgerWorking);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let tarContract: Tar;
  let administrators: ethers.Wallet[];

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    const testEnv = await setupTestEnv();
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
  describe.each(["insertAdministrator"])(
    "/jsonrpc with method %s",
    (testMethod: string) => {
      const method = testMethod.replace("(test update attribute)", "");

      it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
        expect.assertions(4);

        const admin = administrators[0];

        const param = createParam(method, admin.address);
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
        const sgnTx = await admin.signTransaction(uTx);
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
        const wallet = ethers.Wallet.createRandom();

        const param = createParam(method, wallet.address);

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

        const from = "0xde020FB144Bc3239C1446EB9dE73706A47D5929b";
        const param1 = createParam(method, from);
        const param2 = createParam(method, from);
        const param3 = createParam(method, from);

        let expectedErrorMessage1;
        let expectedErrorMessage2;
        let expectedErrorMessage3;
        switch (method) {
          case "insertAdministrator":
            delete param1.attribute;
            expectedErrorMessage1 =
              "property params[0].attribute has failed the following constraints: isObject";

            delete param2.did;
            expectedErrorMessage2 =
              "property params[0].did has failed the following constraints: isDid";

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
        const wallet1 = ethers.Wallet.createRandom();
        const wallet2 = ethers.Wallet.createRandom();

        const param1 = createParam(method, wallet1.address);
        const param2 = createParam(method, wallet2.address);

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
    }
  );
});
