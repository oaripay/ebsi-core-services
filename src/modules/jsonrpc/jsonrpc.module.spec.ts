import axios, { AxiosError } from "axios";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
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
import { createJWT, ES256KSigner } from "@cef-ebsi/did-jwt";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  UnsignedTransaction,
  InsertLedgerInfoParam,
  InsertSmartContractInfoParam,
  UpdateSmartContractInfoByIdParam,
  UpdateSmartContractInfoByNameParam,
  UpdateSmartContractNameParam,
  UpdateLedgerInfoByIdParam,
  UpdateLedgerInfoByNameParam,
  UpdateLedgerNameParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { LedgerSCRegistry } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/ledgerScRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { ApiConfig } from "../../config/configuration";
import { ContractService } from "../../shared/services/contract.service";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertLedgerInfoParam
  | UpdateLedgerInfoByIdParam
  | UpdateLedgerInfoByNameParam
  | UpdateLedgerNameParam
  | InsertSmartContractInfoParam
  | UpdateSmartContractInfoByIdParam
  | UpdateSmartContractInfoByNameParam
  | UpdateSmartContractNameParam;

jest.setTimeout(120000);

const axiosError = (status: number, message: string): AxiosError =>
  ({
    response: {
      status,
      data: message,
      statusText: message,
      headers: {},
      config: {},
    },
    isAxiosError: true,
    name: "error",
    message,
    config: {},
    toJSON: null,
  } as AxiosError);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ledgerScRegistryContract: LedgerSCRegistry;
  let configService: ConfigService<ApiConfig>;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let userAccessToken: string;
  let userAccessTokenPayload: { [x: string]: unknown };
  let adminAccessToken: string;
  let adminAccessTokenPayload: { [x: string]: unknown };
  let contractService: ContractService;

  const adminDid = "did:ebsi:admin";
  const adminWallet = ethers.Wallet.createRandom();
  const userDid = "did:ebsi:user";
  const userWallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
    ledgerScRegistryContract = testEnv.ledgerScRegistryContract;

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

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    contractService = moduleFixture.get<ContractService>(ContractService);

    // Generate JWTs
    adminAccessTokenPayload = { sub: adminDid };
    adminAccessToken = await createJWT(adminAccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(adminWallet.privateKey.replace("0x", "")),
    });
    userAccessTokenPayload = { sub: userDid };
    userAccessToken = await createJWT(userAccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(userWallet.privateKey.replace("0x", "")),
    });
  });

  beforeEach(() => {
    // Mock TLSCR contract
    jest
      .spyOn(contractService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(ledgerScRegistryContract)
      );

    // Make sure we never use axios.post or axios.get in tests ;-)
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    jest.spyOn(axios, "get").mockImplementation((url): Promise<unknown> => {
      // accessing administrators in TAR
      if (url.includes("/administrators")) {
        if (!url.includes(adminDid)) {
          throw axiosError(404, "Not found");
        }
        return Promise.resolve({
          data: {
            did: adminDid,
            attributes: [
              {
                hash: "",
                body: Buffer.from(
                  JSON.stringify({
                    validFrom: new Date().toISOString(),
                  })
                ).toString("base64"),
              },
            ],
          },
        });
      }

      // accessing did registry
      if (url.includes("/identifiers?controller")) {
        if (url.includes(adminWallet.address.toLowerCase()))
          return Promise.resolve({
            data: { items: [{ did: adminDid }] },
          });
        if (url.includes(userWallet.address.toLowerCase()))
          return Promise.resolve({
            data: { items: [{ did: userDid }] },
          });
        return Promise.resolve({ data: { items: [] } });
      }
      throw new Error("Forgot to mock an axios call?");
    });

    // And that the JWT is valid (default scenario)
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async (token) => {
        if (token === userAccessToken)
          return Promise.resolve(userAccessTokenPayload);
        if (token === adminAccessToken)
          return Promise.resolve(adminAccessTokenPayload);
        return Promise.reject(new Error("error message"));
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
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
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.reject(new Error("error message"))
      );

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
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(
      userAccessToken,
      configService.get("authorisationApiDid")
    );
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

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
    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: ledgerScRegistryContract.address,
      data: ledgerScRegistryContract.interface.encodeFunctionData(
        "insertLedgerInfo",
        ["ledger-name", Buffer.from(JSON.stringify({}))]
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
      .auth(userAccessToken, { type: "bearer" })
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

    const { chainId } = await ledgerScRegistryContract.provider.getNetwork();
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

    const param: JsonRpcParams = {
      name: "ledger-name",
      info: `0x${Buffer.from(
        JSON.stringify({
          "@context": "https://ebsi.com",
          type: "Ledger",
          name: "ledger-name",
        })
      ).toString("hex")}`,
      from: signer.address,
    } as InsertLedgerInfoParam;

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve(adminAccessTokenPayload));

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(adminAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertLedgerInfo",
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
      .auth(adminAccessToken, { type: "bearer" })
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
      error: {
        code: -32600,
        message: `The DID ${adminDid} is not controlled by the address ${signer.address.toLowerCase()}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the DID is not a TAR admin", async () => {
    expect.assertions(4);

    const param: JsonRpcParams = {
      name: "ledger-name",
      info: `0x${Buffer.from(
        JSON.stringify({
          "@context": "https://ebsi.com",
          type: "Ledger",
          name: "ledger-name",
        })
      ).toString("hex")}`,
      from: userWallet.address,
    } as InsertLedgerInfoParam;

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve(userAccessTokenPayload));

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertLedgerInfo",
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
    const sgnTx = await userWallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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
      error: {
        code: -32600,
        message: `${userDid} not found as administrator in the Trusted Apps Registry`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each([
    "insertLedgerInfo",
    "updateLedgerInfoById",
    "updateLedgerInfoByName",
    "updateLedgerName",
    "insertSmartContractInfo",
    "updateSmartContractInfoById",
    "updateSmartContractInfoByName",
    "updateSmartContractName",
  ])("/jsonrpc with method %s", (method: string) => {
    it("should return a valid unsigned transaction that we can sign and send to signedTransaction", async () => {
      expect.assertions(4);

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertLedgerInfo": {
          param = {
            from: adminWallet.address,
            name: "ledger-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            ).toString("hex")}`,
          } as InsertLedgerInfoParam;
          break;
        }
        case "updateLedgerInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            )
          );

          param = {
            from: adminWallet.address,
            ledgerInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp: "new value",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByIdParam;
          break;
        }
        case "updateLedgerInfoByName": {
          param = {
            from: adminWallet.address,
            name: "ledger-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp2: "new value2",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByNameParam;
          break;
        }
        case "updateLedgerName": {
          param = {
            from: adminWallet.address,
            oldName: "ledger-name",
            newName: "ledger-name-new",
          } as UpdateLedgerNameParam;
          break;
        }
        case "insertSmartContractInfo": {
          param = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            ).toString("hex")}`,
          } as InsertSmartContractInfoParam;
          break;
        }
        case "updateSmartContractInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            )
          );

          param = {
            from: adminWallet.address,
            smartContractInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByIdParam;
          break;
        }
        case "updateSmartContractInfoByName": {
          param = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name-2",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByNameParam;
          break;
        }
        case "updateSmartContractName": {
          param = {
            from: adminWallet.address,
            oldName: "smart-contract-name",
            newName: "smart-contract-name-new",
          } as UpdateSmartContractNameParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(adminAccessToken, { type: "bearer" })
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
      const sgnTx = await adminWallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/jsonrpc")
        .auth(adminAccessToken, { type: "bearer" })
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

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertLedgerInfo": {
          param = {
            from: adminWallet.address,
            name: "ledger-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            ).toString("hex")}`,
          } as InsertLedgerInfoParam;
          break;
        }
        case "updateLedgerInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            )
          );

          param = {
            from: adminWallet.address,
            ledgerInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp: "new value",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByIdParam;
          break;
        }
        case "updateLedgerInfoByName": {
          param = {
            from: adminWallet.address,
            name: "ledger-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp2: "new value2",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByNameParam;
          break;
        }
        case "updateLedgerName": {
          param = {
            from: adminWallet.address,
            oldName: "ledger-name",
            newName: "ledger-name-new",
          } as UpdateLedgerNameParam;
          break;
        }
        case "insertSmartContractInfo": {
          param = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            ).toString("hex")}`,
          } as InsertSmartContractInfoParam;
          break;
        }
        case "updateSmartContractInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            )
          );

          param = {
            from: adminWallet.address,
            smartContractInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByIdParam;
          break;
        }
        case "updateSmartContractInfoByName": {
          param = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name-2",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByNameParam;
          break;
        }
        case "updateSmartContractName": {
          param = {
            from: adminWallet.address,
            oldName: "smart-contract-name",
            newName: "smart-contract-name-new",
          } as UpdateSmartContractNameParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(adminAccessToken, { type: "bearer" })
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

      let param1: JsonRpcParams = null;
      let param2: JsonRpcParams = null;
      let param3: JsonRpcParams = null;

      let expectedErrorMessage1;
      let expectedErrorMessage2;
      let expectedErrorMessage3;

      switch (method) {
        case "insertLedgerInfo": {
          param1 = {
            from: adminWallet.address,
            name: 123,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            ).toString("hex")}`,
          } as unknown as InsertLedgerInfoParam;

          expectedErrorMessage1 =
            "property params[0].name has failed the following constraints: isString";

          param2 = {
            from: adminWallet.address,
            name: "ledger-name",
            info: "some random string",
          } as InsertLedgerInfoParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: adminWallet.address,
            name: "ledger-name",
            info: "0x1234",
          } as InsertLedgerInfoParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";
          break;
        }
        case "updateLedgerInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            )
          );

          param1 = {
            from: adminWallet.address,
            ledgerInfoId: "some random string",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp: "new value",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByIdParam;

          expectedErrorMessage1 =
            "property params[0].ledgerInfoId has failed the following constraints: isHexadecimal";

          param2 = {
            from: adminWallet.address,
            ledgerInfoId: id,
            info: "some random string",
          } as UpdateLedgerInfoByIdParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: adminWallet.address,
            ledgerInfoId: id,
            info: "0x1234",
          } as UpdateLedgerInfoByIdParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";
          break;
        }
        case "updateLedgerInfoByName": {
          param1 = {
            from: adminWallet.address,
            name: 123,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp2: "new value2",
              })
            ).toString("hex")}`,
          } as unknown as UpdateLedgerInfoByNameParam;

          expectedErrorMessage1 =
            "property params[0].name has failed the following constraints: isString";

          param2 = {
            from: adminWallet.address,
            name: "ledger-name",
            info: "some random string",
          } as UpdateLedgerInfoByNameParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: adminWallet.address,
            name: "ledger-name",
            info: "0x1234",
          } as UpdateLedgerInfoByNameParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          break;
        }
        case "updateLedgerName": {
          param1 = {
            from: adminWallet.address,
            oldName: 123,
            newName: "ledger-name-new",
          } as unknown as UpdateLedgerNameParam;

          expectedErrorMessage1 =
            "property params[0].oldName has failed the following constraints: isString";

          param2 = {
            from: adminWallet.address,
            oldName: "ledger-name",
            newName: 123,
          } as unknown as UpdateLedgerNameParam;

          expectedErrorMessage2 =
            "property params[0].newName has failed the following constraints: isString";

          param3 = {
            from: adminWallet.address,
            newName: "ledger-name-new",
          } as UpdateLedgerNameParam;

          expectedErrorMessage3 =
            "property params[0].oldName has failed the following constraints: isString";

          break;
        }
        case "insertSmartContractInfo": {
          param1 = {
            from: adminWallet.address,
            name: 123,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            ).toString("hex")}`,
          } as unknown as InsertSmartContractInfoParam;

          expectedErrorMessage1 =
            "property params[0].name has failed the following constraints: isString";

          param2 = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: "some random string",
          } as InsertSmartContractInfoParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: "0x1234",
          } as InsertSmartContractInfoParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";
          break;
        }
        case "updateSmartContractInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            )
          );

          param1 = {
            from: adminWallet.address,
            smartContractInfoId: "random string",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByIdParam;

          expectedErrorMessage1 =
            "property params[0].smartContractInfoId has failed the following constraints: isHexadecimal";

          param2 = {
            from: adminWallet.address,
            smartContractInfoId: id,
            info: "some random string",
          } as UpdateSmartContractInfoByIdParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: adminWallet.address,
            smartContractInfoId: id,
            info: "0x1234",
          } as UpdateSmartContractInfoByIdParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          break;
        }
        case "updateSmartContractInfoByName": {
          param1 = {
            from: adminWallet.address,
            name: 123,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name-2",
              })
            ).toString("hex")}`,
          } as unknown as UpdateSmartContractInfoByNameParam;

          expectedErrorMessage1 =
            "property params[0].name has failed the following constraints: isString";

          param2 = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: "some random string",
          } as UpdateSmartContractInfoByNameParam;

          expectedErrorMessage2 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          param3 = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: "0x1234",
          } as UpdateSmartContractInfoByNameParam;

          expectedErrorMessage3 =
            "property params[0].info has failed the following constraints: isHexadecimalJSON";

          break;
        }
        case "updateSmartContractName": {
          param1 = {
            from: adminWallet.address,
            oldName: 123,
            newName: "smart-contract-name-new",
          } as unknown as UpdateSmartContractNameParam;

          expectedErrorMessage1 =
            "property params[0].oldName has failed the following constraints: isString";

          param2 = {
            from: adminWallet.address,
            oldName: "smart-contract-name",
            newName: 123,
          } as unknown as UpdateSmartContractNameParam;

          expectedErrorMessage2 =
            "property params[0].newName has failed the following constraints: isString";

          param3 = {
            from: adminWallet.address,
            newName: "smart-contract-name-new",
          } as UpdateSmartContractNameParam;

          expectedErrorMessage3 =
            "property params[0].oldName has failed the following constraints: isString";

          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const response1 = await request(server)
        .post("/jsonrpc")
        .auth(adminAccessToken, { type: "bearer" })
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
        .auth(adminAccessToken, { type: "bearer" })
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
        .auth(adminAccessToken, { type: "bearer" })
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

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      switch (method) {
        case "insertLedgerInfo": {
          param1 = {
            from: adminWallet.address,
            name: "ledger-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            ).toString("hex")}`,
          } as InsertLedgerInfoParam;

          param2 = {
            from: adminWallet.address,
            name: "ledger-name-2",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            ).toString("hex")}`,
          } as InsertLedgerInfoParam;

          break;
        }
        case "updateLedgerInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
              })
            )
          );

          param1 = {
            from: adminWallet.address,
            ledgerInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp: "new value",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByIdParam;

          param2 = {
            from: adminWallet.address,
            ledgerInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp: "new value 2",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByIdParam;

          break;
        }
        case "updateLedgerInfoByName": {
          param1 = {
            from: adminWallet.address,
            name: "ledger-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp2: "new value2",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByNameParam;

          param2 = {
            from: adminWallet.address,
            name: "ledger-name-2",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp2: "new value2",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByNameParam;

          break;
        }
        case "updateLedgerName": {
          param1 = {
            from: adminWallet.address,
            oldName: "ledger-name",
            newName: "ledger-name-new",
          } as UpdateLedgerNameParam;

          param2 = {
            from: adminWallet.address,
            oldName: "ledger-name",
            newName: "ledger-name-new-2",
          } as UpdateLedgerNameParam;
          break;
        }
        case "insertSmartContractInfo": {
          param1 = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            ).toString("hex")}`,
          } as InsertSmartContractInfoParam;

          param2 = {
            from: adminWallet.address,
            name: "smart-contract-name-2",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            ).toString("hex")}`,
          } as InsertSmartContractInfoParam;

          break;
        }
        case "updateSmartContractInfoById": {
          const id = ethers.utils.sha256(
            Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-name",
              })
            )
          );

          param1 = {
            from: adminWallet.address,
            smartContractInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByIdParam;

          param2 = {
            from: adminWallet.address,
            smartContractInfoId: id,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name-alt",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByIdParam;
          break;
        }
        case "updateSmartContractInfoByName": {
          param1 = {
            from: adminWallet.address,
            name: "smart-contract-name",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name-2",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByNameParam;

          param2 = {
            from: adminWallet.address,
            name: "smart-contract-name-2",
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: "smart-contract-new-name-2",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByNameParam;

          break;
        }
        case "updateSmartContractName": {
          param1 = {
            from: adminWallet.address,
            oldName: "smart-contract-name",
            newName: "smart-contract-name-new",
          } as UpdateSmartContractNameParam;

          param2 = {
            from: adminWallet.address,
            oldName: "smart-contract-name",
            newName: "smart-contract-name-new-2",
          } as UpdateSmartContractNameParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(adminAccessToken, { type: "bearer" })
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
        .auth(adminAccessToken, { type: "bearer" })
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
        .auth(adminAccessToken, { type: "bearer" })
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
        .auth(adminAccessToken, { type: "bearer" })
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
