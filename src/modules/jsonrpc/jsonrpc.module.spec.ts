import crypto from "node:crypto";
import axios, { AxiosError } from "axios";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import type { FastifyInstance } from "fastify";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JwtTarVefifyResult } from "@cef-ebsi/oauth2-auth";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { JWTVerifyResult } from "jose";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { HashName } from "multihashes";
import { multibase } from "../../shared/utils";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  DetachRecordVersionHashParam,
  InsertRecordOwnerParam,
  RevokeRecordOwnerParam,
  InsertHashAlgorithmParam,
  InsertRecordVersionInfoParam,
  TimestampHashesParam,
  TimestampRecordHashesParam,
  TimestampRecordVersionHashesParam,
  AppendRecordVersionHashesParam,
  UnsignedTransaction,
  UpdateHashAlgorithmParam,
  TimestampVersionHashesParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { Timestamp, Timestamp__factory } from "../../contracts/timestamp";
import { setupTestEnv } from "../../../tests/utils/timestamp";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerService } from "../../shared/services/ledger.service";
import { ApiConfig } from "../../config/configuration";

jest.mock("@cef-ebsi/oauth2-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/oauth2-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

jest.mock("@cef-ebsi/siop-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/siop-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertHashAlgorithmParam
  | UpdateHashAlgorithmParam
  | TimestampHashesParam
  | DetachRecordVersionHashParam
  | RevokeRecordOwnerParam
  | InsertRecordOwnerParam
  | TimestampRecordHashesParam
  | InsertRecordVersionInfoParam
  | TimestampRecordVersionHashesParam
  | AppendRecordVersionHashesParam
  | TimestampRecordHashesParam;

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
  let configService: ConfigService<ApiConfig, true>;
  let server: HttpServer;
  let timestampContract: Timestamp;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let ledgerService: LedgerService;
  let firstHashValue: string;
  let secondHashValue: string;
  let recordId: string;
  let blockNumber = 0;
  let provider: ethers.providers.JsonRpcProvider;
  const genToken = (sub: string, siop = true) =>
    `${multibase.base64url.baseEncode(
      Buffer.from(
        JSON.stringify({
          alg: "ES256K",
          typ: "JWT",
        })
      )
    )}.${multibase.base64url.baseEncode(
      Buffer.from(
        JSON.stringify({
          sub,
          ...(siop && { login_hint: "did_siop" }),
        })
      )
    )}.${multibase.base64url.baseEncode(Buffer.from("signature"))}`;
  const testAdmin = {
    token: genToken("admin"),
    did: "did:ebsi:admin",
    wallet: ethers.Wallet.createRandom(),
  };
  const testUser = {
    token: genToken("user"),
    did: "did:ebsi:user",
    wallet: ethers.Wallet.createRandom(),
  };
  const testFakeUser = {
    token: genToken("fake user"),
    did: "did:ebsi:fakeuser",
    wallet: ethers.Wallet.createRandom(),
  };

  const walletApp = ethers.Wallet.createRandom();
  const publicKeyPemApp = new EbsiWallet(walletApp.privateKey).getPublicKey({
    format: "pem",
  }) as string;
  const testApp = {
    token: genToken("trusted app", false),
    name: "my-trusted-app",
    id: `0x${crypto.randomBytes(32).toString("hex")}`,
    wallet: walletApp,
    publicKeys: [
      Buffer.from(publicKeyPemApp).toString("base64"),
      crypto.randomBytes(50).toString("base64"), // bad format
    ],
  };

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv();
    timestampContract = testEnv.timestampContract;
    provider = testEnv.provider;

    jest
      .spyOn(LedgerService.prototype, "getContractAddress")
      .mockImplementation(() => timestampContract.address);

    const multihashToNodeHashAlg: Partial<Record<HashName, string>> = {
      "sha2-256": "sha256",
      "sha2-512": "sha512",
      "sha3-224": "sha3-224",
      "sha3-256": "sha3-256",
      "sha3-384": "sha3-384",
      "sha3-512": "sha3-512",
    };

    firstHashValue = `0x${crypto
      .createHash(multihashToNodeHashAlg[testEnv.hashAlgorithms[0].multihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    secondHashValue = `0x${crypto
      .createHash(multihashToNodeHashAlg[testEnv.hashAlgorithms[0].multihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    // Mock Timestamp contract
    jest
      .spyOn(Timestamp__factory, "connect")
      .mockImplementation(() => timestampContract);

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    // Make sure we never use axios.post in tests ;-)
    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios post call?");
    });

    jest.spyOn(axios, "get").mockImplementation((url): Promise<unknown> => {
      // accessing administrators in TAR
      if (url.includes("/administrators")) {
        if (!url.includes(testAdmin.did)) {
          throw axiosError(404, "Not found");
        }
        return Promise.resolve({
          data: {
            did: testAdmin.did,
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

      // accessing apps in TAR by id
      if (url.includes("/apps/")) {
        if (!url.includes(testApp.name)) {
          throw new Error("App not found");
        }
        return Promise.resolve({
          data: {
            applicationId: testApp.id,
            name: testApp.name,
            domain: "ebsi",
            publicKeys: testApp.publicKeys,
          },
        });
      }

      // accessing did registry
      if (url.includes("/identifiers?controller")) {
        if (url.includes(testAdmin.wallet.address.toLowerCase()))
          return Promise.resolve({
            data: { items: [{ did: testAdmin.did }] },
          });
        if (url.includes(testUser.wallet.address.toLowerCase()))
          return Promise.resolve({
            data: { items: [{ did: testUser.did }] },
          });
        return Promise.resolve({ data: { items: [] } });
      }
      throw new Error("Forgot to mock an axios call?");
    });

    jest
      .spyOn(SiopLib, "verifyJwtTar")
      .mockImplementation((token: string): Promise<JWTVerifyResult> => {
        if (token === testAdmin.token) {
          return Promise.resolve({
            payload: {
              sub: testAdmin.did,
              login_hint: "did_siop",
            },
          } as unknown as JWTVerifyResult);
        }

        if (token === testUser.token) {
          return Promise.resolve({
            payload: { sub: testUser.did, login_hint: "did_siop" },
          } as unknown as JWTVerifyResult);
        }

        return Promise.reject(new Error("verifyJwtTar failed (siop)"));
      });

    jest
      .spyOn(OAuth2Lib, "verifyJwtTar")
      .mockImplementation((token: string): Promise<JwtTarVefifyResult> => {
        if (token === testApp.token) {
          return Promise.resolve({
            payload: { sub: testApp.name },
          } as JwtTarVefifyResult);
        }

        return Promise.reject(new Error("verifyJwtTar failed (siop)"));
        throw new Error("verifyAccessToken failed (oauth2)");
      });

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(timestampContract));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("JWT Authentication", () => {
    it("should reject bad authentication", async () => {
      expect.assertions(4);
      let response = await request(server)
        .post("/jsonrpc")
        .auth(testFakeUser.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        status: 401,
        detail: "verifyJwtTar failed (siop)",
        type: "about:blank",
      });
      expect(response.status).toBe(401);

      response = await request(server).post("/jsonrpc").send();

      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        status: 401,
        detail: "Missing JWT",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should reject impersonating requests", async () => {
      expect.assertions(2);

      const param: TimestampHashesParam = {
        from: testUser.wallet.address, // test user in the transaction
        hashAlgorithmIds: [0],
        hashValues: [firstHashValue],
        timestampData: [
          `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
            "hex"
          )}`,
        ],
      };

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        // admin in the jwt
        .auth(testAdmin.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "timestampHashes",
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
      // user in the transaction
      const sgnTx = await testUser.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/jsonrpc")
        // admin in the jwt
        .auth(testAdmin.token, { type: "bearer" })
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
        error: {
          code: -32600,
          message: expect.stringContaining(
            "The DID did:ebsi:admin is not controlled by the address 0x"
          ) as string,
        },
      });
      expect(responseSend.status).toBe(400);
    });
  });

  // Generic tests
  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/jsonrpc")
      .auth(testUser.token, { type: "bearer" })
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

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);

    const transaction = {
      from: testUser.wallet.address,
      to: timestampContract.address,
      data: timestampContract.interface.encodeFunctionData(
        "getHashAlgorithms",
        [1, 10]
      ),
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
    const sgnTx = await testUser.wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(testUser.token, { type: "bearer" })
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

    const { chainId } = await timestampContract.provider.getNetwork();
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
      .auth(testUser.token, { type: "bearer" })
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

  // Tests to be repeated for every method
  describe.each([
    "insertHashAlgorithm",
    "updateHashAlgorithm",
    "timestampHashes",
    "timestampRecordHashes",
    "timestampVersionHashes",
    "insertRecordOwner",
    "insertRecordVersionInfo",
    "detachRecordVersionHash",
    "timestampRecordVersionHashes",
    "appendRecordVersionHashes",
    "revokeRecordOwner",
  ])("/jsonrpc with method %s", (method: string) => {
    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      let param: JsonRpcParams = null;

      switch (method) {
        case "insertHashAlgorithm": {
          param = {
            from: testAdmin.wallet.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmId: 1, // "1" is the ID of the hash we've just inserted
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;
          break;
        }
        case "timestampHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
          } as TimestampHashesParam;
          break;
        }
        case "timestampVersionHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;
          break;
        }
        case "timestampRecordHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;
          break;
        }
        case "detachRecordVersionHash": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: testAdmin.wallet.address,
            recordId,
            versionId: 0,
            hashValue: firstHashValue,
          } as DetachRecordVersionHashParam;
          break;
        }
        case "insertRecordOwner": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: testAdmin.wallet.address,
            recordId,
            ownerId: "owner",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;
          break;
        }
        case "revokeRecordOwner": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: testAdmin.wallet.address,
            recordId,
            ownerId: "owner",
          } as RevokeRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: testAdmin.wallet.address,
            recordId,
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: testAdmin.wallet.address,
            recordId,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "appendRecordVersionHashes": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: testAdmin.wallet.address,
            recordId,
            versionId: 1,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testAdmin.token, { type: "bearer" })
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
      const sgnTx = await testAdmin.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/jsonrpc")
        .auth(testAdmin.token, { type: "bearer" })
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
      // blocknumber needed to compute the recordid
      if (method === "timestampRecordHashes") {
        blockNumber = await provider.getBlockNumber();
      }
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
        case "insertHashAlgorithm": {
          param = {
            from: testAdmin.wallet.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;
          break;
        }
        case "timestampHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
          } as TimestampHashesParam;
          break;
        }
        case "timestampVersionHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;
          break;
        }
        case "timestampRecordHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;
          break;
        }
        case "detachRecordVersionHash": {
          param = {
            from: testAdmin.wallet.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            versionId: 0,
            hashValue: "0x1234567890",
          } as DetachRecordVersionHashParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "appendRecordVersionHashes": {
          param = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            versionId: 0,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;
          break;
        }
        case "insertRecordOwner": {
          param = {
            from: testAdmin.wallet.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            ownerId: "owner",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;
          break;
        }
        case "revokeRecordOwner": {
          param = {
            from: testAdmin.wallet.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            ownerId: "owner",
          } as RevokeRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          param = {
            from: testAdmin.wallet.address,
            recordId:
              "0x011742226f9fad758490f98ba3d3a7c841db6ce3b6a889748b419e50eb63513d",
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(testAdmin.token, { type: "bearer" })
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

      let expectedErrorMessage1: string;
      let expectedErrorMessage2: string;
      let expectedErrorMessage3: string;

      switch (method) {
        case "insertHashAlgorithm": {
          param1 = {
            from: testAdmin.wallet.address,
            outputLength: -12,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          expectedErrorMessage1 =
            "property params[0].outputLength has failed the following constraints: min";

          param2 = {
            from: testAdmin.wallet.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 3,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          expectedErrorMessage2 =
            "property params[0].status has failed the following constraints: max";

          param3 = {
            from: testAdmin.wallet.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: 1,
            status: 1,
            multihash: "sha-sha-sha-256",
          } as unknown as InsertHashAlgorithmParam;

          expectedErrorMessage3 =
            "property params[0].multihash has failed the following constraints: isMultihash";
          break;
        }
        case "updateHashAlgorithm": {
          param1 = {
            from: testAdmin.wallet.address,
            hashAlgorithmId: -1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmId has failed the following constraints: min";

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmId: 1,
            outputLength: -1,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          expectedErrorMessage2 =
            "property params[0].outputLength has failed the following constraints: min";

          param3 = {
            from: testAdmin.wallet.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 0,
            multihash: "sha-sha-sha-256",
          } as UpdateHashAlgorithmParam;

          expectedErrorMessage3 =
            "property params[0].multihash has failed the following constraints: isMultihash";
          break;
        }
        case "timestampHashes": {
          param1 = {
            from: testAdmin.wallet.address,
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
          } as TimestampHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: min, isInt";

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
          } as TimestampHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [`this is not hex`],
          } as TimestampHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "timestampVersionHashes": {
          param1 = {
            from: testAdmin.wallet.address,
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: min, isInt";

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [`this is not hex`],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "timestampRecordHashes": {
          param1 = {
            from: testAdmin.wallet.address,
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 52 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as TimestampRecordHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: min, isInt";

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 425 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as TimestampRecordHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [`this is not hex`],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 82 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as TimestampRecordHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "detachRecordVersionHash": {
          param1 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId:
              "0xec45567890123456789012345678901fa456789012345678901234567890abfe",
            hashValue: "0x1234567890",
          } as unknown as DetachRecordVersionHashParam;

          expectedErrorMessage1 =
            "property params[0].versionId has failed the following constraints: min, isInt";

          param2 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: 0,
          } as unknown as DetachRecordVersionHashParam;

          expectedErrorMessage2 =
            "property params[0].hashValue has failed the following constraints: isHexadecimal";

          param3 = {
            from: testAdmin.wallet.address,
            versionId: 12,
            hashValue: "0x1234567890",
          } as unknown as DetachRecordVersionHashParam;

          expectedErrorMessage3 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";
          break;
        }
        case "timestampRecordVersionHashes": {
          param1 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 482 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as TimestampRecordVersionHashesParam;

          expectedErrorMessage1 =
            "property params[0].hashAlgorithmIds has failed the following constraints: min, isInt";

          param2 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashAlgorithmIds: [0],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ infotest: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as TimestampRecordVersionHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [`this is not hex`],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 842 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as TimestampRecordVersionHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "appendRecordVersionHashes": {
          param1 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: "o",
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 842 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as AppendRecordVersionHashesParam;

          expectedErrorMessage1 =
            "property params[0].versionId has failed the following constraints: min, isInt";

          param2 = {
            from: testAdmin.wallet.address,
            versionId: 12,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashAlgorithmIds: [0],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 492 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as AppendRecordVersionHashesParam;

          expectedErrorMessage2 =
            "property params[0].hashValues has failed the following constraints: isHexadecimal";

          param3 = {
            from: testAdmin.wallet.address,
            versionId: 0,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            hashAlgorithmIds: [0],
            timestampData: [`this is not hex`],
            hashValues: [firstHashValue],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as unknown as AppendRecordVersionHashesParam;

          expectedErrorMessage3 =
            "property params[0].timestampData has failed the following constraints: isHexadecimal";
          break;
        }
        case "insertRecordOwner": {
          param1 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ownerId: 0,
            notBefore: 1,
            notAfter: 12,
          } as unknown as InsertRecordOwnerParam;

          expectedErrorMessage1 =
            "property params[0].ownerId has failed the following constraints: isString";

          param2 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ownerId: "owner",
            notBefore: "1",
            notAfter: 12,
          } as unknown as InsertRecordOwnerParam;

          expectedErrorMessage2 =
            "property params[0].notBefore has failed the following constraints: min, isInt";

          param3 = {
            from: testAdmin.wallet.address,
            ownerId: "owner",
            notBefore: 1,
            notAfter: 12,
          } as unknown as InsertRecordOwnerParam;

          expectedErrorMessage3 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";
          break;
        }
        case "revokeRecordOwner": {
          param1 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            ownerId: 0,
          } as unknown as RevokeRecordOwnerParam;

          expectedErrorMessage1 =
            "property params[0].ownerId has failed the following constraints: isString";

          param2 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
          } as unknown as RevokeRecordOwnerParam;

          expectedErrorMessage2 =
            "property params[0].ownerId has failed the following constraints: isString";

          param3 = {
            from: testAdmin.wallet.address,
            ownerId: "owner",
          } as unknown as RevokeRecordOwnerParam;

          expectedErrorMessage3 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";
          break;
        }
        case "insertRecordVersionInfo": {
          param1 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x123456789012345678901234567890123456789012345678901234567890123X",
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;

          expectedErrorMessage1 =
            "property params[0].recordId has failed the following constraints: isHexadecimal";

          param2 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: -1,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;

          expectedErrorMessage2 =
            "property params[0].versionId has failed the following constraints: min";

          param3 = {
            from: testAdmin.wallet.address,
            recordId:
              "0x1234567890123456789012345678901234567890123456789012345678901234",
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}f`,
          } as InsertRecordVersionInfoParam;

          expectedErrorMessage3 =
            "property params[0].versionInfo has failed the following constraints: isHexadecimalJSON";
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const response1 = await request(server)
        .post("/jsonrpc")
        .auth(testAdmin.token, { type: "bearer" })
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
        .auth(testAdmin.token, { type: "bearer" })
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
        .auth(testAdmin.token, { type: "bearer" })
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
        case "insertHashAlgorithm": {
          param1 = {
            from: testUser.wallet.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          param2 = {
            from: testAdmin.wallet.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          break;
        }
        case "updateHashAlgorithm": {
          param1 = {
            from: testUser.wallet.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          break;
        }
        case "timestampHashes": {
          param1 = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
          } as TimestampHashesParam;

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 43 }), "utf8").toString(
                "hex"
              )}`,
            ],
          } as TimestampHashesParam;

          break;
        }
        case "timestampVersionHashes": {
          param1 = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 43 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionHash: firstHashValue,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 54 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;

          break;
        }
        case "timestampRecordHashes": {
          param1 = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 742 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;

          param2 = {
            from: testAdmin.wallet.address,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 43 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 742 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;

          break;
        }
        case "timestampRecordVersionHashes": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );

          param1 = {
            from: testUser.wallet.address,
            recordId,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;

          param2 = {
            from: testAdmin.wallet.address,
            recordId,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 24 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;

          break;
        }
        case "appendRecordVersionHashes": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );

          param1 = {
            from: testUser.wallet.address,
            recordId,
            versionId: 1,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ infos: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;

          param2 = {
            from: testAdmin.wallet.address,
            recordId,
            versionId: 1,
            hashAlgorithmIds: [0],
            hashValues: [firstHashValue],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 24 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;

          break;
        }
        case "detachRecordVersionHash": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );

          param1 = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            hashValue: "0x125345568a",
          } as DetachRecordVersionHashParam;

          param2 = {
            from: testAdmin.wallet.address,
            recordId,
            versionId: 0,
            hashValue: "0x1234567890",
          } as DetachRecordVersionHashParam;

          break;
        }
        case "insertRecordOwner": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );

          param1 = {
            from: testUser.wallet.address,
            recordId,
            ownerId: "owner",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;

          param2 = {
            from: testAdmin.wallet.address,
            recordId,
            ownerId: "ownerchanged",
            notBefore: 1042,
            notAfter: 1021201545,
          } as InsertRecordOwnerParam;

          break;
        }
        case "revokeRecordOwner": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );

          param1 = {
            from: testUser.wallet.address,
            recordId,
            ownerId: "owner",
          } as RevokeRecordOwnerParam;

          param2 = {
            from: testAdmin.wallet.address,
            recordId,
            ownerId: "ownerchanged",
          } as RevokeRecordOwnerParam;

          break;
        }
        case "insertRecordVersionInfo": {
          recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testAdmin.wallet.address, blockNumber, firstHashValue]
            )
          );

          const versionInfo = `0x${Buffer.from(
            JSON.stringify({ test: 42 }),
            "utf8"
          ).toString("hex")}`;

          param1 = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            versionInfo,
          } as InsertRecordVersionInfoParam;

          param2 = {
            from: testAdmin.wallet.address,
            recordId,
            versionId: 1,
            versionInfo,
          } as InsertRecordVersionInfoParam;

          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
        .auth(testAdmin.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param2],
          id: 232,
        });
      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(transaction1)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await testUser.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
        .auth(testAdmin.token, { type: "bearer" })
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

  // Tests to be repeated for every method
  describe.each([
    "timestampHashes",
    "timestampRecordHashes",
    "timestampRecordVersionHashes",
    "timestampVersionHashes",
    "appendRecordVersionHashes",
  ])(
    "/jsonrpc with method %s even if timestamp data is empty",
    (method: string) => {
      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction even if timestamp data is empty", async () => {
        expect.assertions(4);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testAdmin.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [secondHashValue],
            } as TimestampHashesParam;
            break;
          }
          case "timestampRecordHashes": {
            param = {
              from: testAdmin.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [secondHashValue],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordHashesParam;
            break;
          }
          case "timestampRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testAdmin.wallet.address, blockNumber, secondHashValue]
              )
            );
            param = {
              from: testAdmin.wallet.address,
              recordId,
              hashAlgorithmIds: [0],
              hashValues: [secondHashValue],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordVersionHashesParam;
            break;
          }
          case "timestampVersionHashes": {
            param = {
              from: testAdmin.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [secondHashValue],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
              versionHash: secondHashValue,
            } as TimestampVersionHashesParam;
            break;
          }
          case "appendRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testAdmin.wallet.address, blockNumber, secondHashValue]
              )
            );
            param = {
              from: testAdmin.wallet.address,
              recordId,
              versionId: 1,
              hashAlgorithmIds: [0],
              hashValues: [secondHashValue],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as AppendRecordVersionHashesParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testAdmin.token, { type: "bearer" })
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
        const sgnTx = await testAdmin.wallet.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend = await request(server)
          .post("/jsonrpc")
          .auth(testAdmin.token, { type: "bearer" })
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
        // blocknumber needed to compute the recordid
        if (method === "timestampRecordHashes") {
          blockNumber = await provider.getBlockNumber();
        }
        expect(responseSend.body).toStrictEqual({
          jsonrpc: "2.0",
          id: "45",
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);
      });
    }
  );

  // Tests using trusted apps
  describe.each([
    "timestampHashes",
    "timestampRecordHashes",
    "timestampRecordVersionHashes",
    "appendRecordVersionHashes",
  ])(
    "/jsonrpc with method %s using a Trusted App as user",
    (method: string) => {
      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(4);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
            } as TimestampHashesParam;
            break;
          }
          case "timestampRecordHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordHashesParam;
            break;
          }
          case "timestampRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, firstHashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordVersionHashesParam;
            break;
          }
          case "appendRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, firstHashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              versionId: 1,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as AppendRecordVersionHashesParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testApp.token, { type: "bearer" })
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
        const sgnTx = await testApp.wallet.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend = await request(server)
          .post("/jsonrpc")
          .auth(testApp.token, { type: "bearer" })
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

        // blocknumber needed to compute the recordid
        if (method === "timestampRecordHashes") {
          blockNumber = await provider.getBlockNumber();
        }

        expect(responseSend.body).toStrictEqual({
          jsonrpc: "2.0",
          id: "45",
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);
      });

      it("should return an error if the hash length doesn't match with the hash algorithm output length", async () => {
        expect.assertions(2);

        let param: JsonRpcParams = null;

        const hashValue = `0x${crypto.randomBytes(37).toString("hex")}`;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [hashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
            } as TimestampHashesParam;
            break;
          }
          case "timestampRecordHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [hashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordHashesParam;
            break;
          }
          case "timestampRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, hashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              hashAlgorithmIds: [0],
              hashValues: [hashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordVersionHashesParam;
            break;
          }
          case "appendRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, hashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              versionId: 1,
              hashAlgorithmIds: [0],
              hashValues: [hashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as AppendRecordVersionHashesParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testApp.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param],
            id: 231,
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: `Hash ${hashValue}'s length (296 bits) is different from the expected length (${testEnv.hashAlgorithms[0].outputLength} bits)`,
          },
        });
        expect(responseBuild.status).toBe(400);
      });

      it("should return an error if the hash algorithm ID doesn't exist", async () => {
        expect.assertions(2);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [193],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
            } as TimestampHashesParam;
            break;
          }
          case "timestampRecordHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [193],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordHashesParam;
            break;
          }
          case "timestampRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, firstHashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              hashAlgorithmIds: [193],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordVersionHashesParam;
            break;
          }
          case "appendRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, firstHashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              versionId: 1,
              hashAlgorithmIds: [193],
              hashValues: [firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as AppendRecordVersionHashesParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testApp.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param],
            id: 231,
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: "Can't find hash algorithm with ID: 193",
          },
        });
        expect(responseBuild.status).toBe(400);
      });

      it("should return an error if there are more hashValues than hashAlgorithmIds", async () => {
        expect.assertions(2);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue, firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
            } as TimestampHashesParam;
            break;
          }
          case "timestampRecordHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue, firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordHashesParam;
            break;
          }
          case "timestampRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, firstHashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue, firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as TimestampRecordVersionHashesParam;
            break;
          }
          case "appendRecordVersionHashes": {
            recordId = ethers.utils.sha256(
              ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes"],
                [testApp.wallet.address, blockNumber, firstHashValue]
              )
            );
            param = {
              from: testApp.wallet.address,
              recordId,
              versionId: 1,
              hashAlgorithmIds: [0],
              hashValues: [firstHashValue, firstHashValue],
              timestampData: [
                `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                  "hex"
                )}`,
              ],
              versionInfo: `0x${Buffer.from(
                JSON.stringify({ test: 54 }),
                "utf8"
              ).toString("hex")}`,
            } as AppendRecordVersionHashesParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testApp.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param],
            id: 231,
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message:
              "hashAlgorithmIds and hashValues don't have the same length",
          },
        });
        expect(responseBuild.status).toBe(400);
      });
    }
  );
});
