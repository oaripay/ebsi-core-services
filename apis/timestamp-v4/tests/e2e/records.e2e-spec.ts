import { describe, beforeAll, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpStatus } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  prefixWith0x,
  multibase,
  PaginatedList,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import {
  TimestampRecordHashesParam,
  TimestampRecordVersionHashesParam,
  AppendRecordVersionHashesParam,
  DetachRecordVersionHashParam,
  InsertRecordOwnerParam,
  InsertRecordVersionInfoParam,
  RevokeRecordOwnerParam,
  TimestampVersionHashesParam,
  UnsignedTransaction,
} from "../../src/modules/jsonrpc/dto/index.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import type {
  RecordLink,
  VersionLink,
} from "../../src/modules/records/records.interface.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { describeWriteOps, itWriteOps, writeOps } from "../utils/writeOps.js";
import { getServer } from "../utils/getServer.js";
import { getTimestampWriteAccessToken } from "../utils/getAccessToken.js";
import { getEbsiIssuer } from "../utils/getEbsiIssuer.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | TimestampRecordHashesParam
  | TimestampRecordVersionHashesParam
  | AppendRecordVersionHashesParam
  | DetachRecordVersionHashParam
  | RevokeRecordOwnerParam
  | InsertRecordOwnerParam
  | InsertRecordVersionInfoParam;

const multihashToNodeHashAlg = {
  "sha2-256": "sha256",
  "sha2-512": "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
} as const;

type TestUser = {
  info: EbsiIssuer;
  token: string;
  wallet: ethers.Wallet;
};

describe("Timestamp API v4 - Records (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let hashAlgorithmId: number;
  let hashAlgorithmMultihash: keyof typeof multihashToNodeHashAlg;
  let hashValue1: string;
  let hashValue2: string;
  let hashValue3: string;
  let blockNumber1 = 0;
  let blockNumber2 = 0;
  let authorisationApiUrl: string;
  let trustedHostnames: string[];
  let adminUser: TestUser;
  let testUser: TestUser;

  let ledgerApi: string;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    authorisationApiUrl = configService.get<string>("authorisationApiUrl");
    trustedHostnames = configService.get<string[]>("trustedHostnames");

    if (writeOps()) {
      const configTestAdmin = configService.get<{
        kid: string;
        privateKey: string;
      }>("testAdmin");
      const adminKid = configTestAdmin.kid;
      const adminPrivateKeyHex = configTestAdmin.privateKey;
      const adminDid = adminKid.split("#")[0]!;
      const adminWallet = new ethers.Wallet(prefixWith0x(adminPrivateKeyHex));
      const adminIssuerInfo = await getEbsiIssuer(
        adminPrivateKeyHex,
        adminDid,
        adminKid,
      );

      try {
        adminUser = {
          info: adminIssuerInfo,
          token: await getTimestampWriteAccessToken(
            authorisationApiUrl,
            adminIssuerInfo,
            trustedHostnames,
          ),
          wallet: adminWallet,
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }

      const configTestUser = configService.get<{
        kid: string;
        privateKey: string;
      }>("testUser");
      const userKid = configTestUser.kid;
      const userDid = userKid.split("#")[0]!;
      const userPrivateKeyHex = configTestUser.privateKey;
      const userWallet = new ethers.Wallet(prefixWith0x(userPrivateKeyHex));
      const userInfo = await getEbsiIssuer(userPrivateKeyHex, userDid, userKid);

      try {
        testUser = {
          info: userInfo,
          token: await getTimestampWriteAccessToken(
            authorisationApiUrl,
            userInfo,
            trustedHostnames,
          ),
          wallet: userWallet,
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    }

    // During the tests, we'll use the last hash algorithm
    const getHashAlgorithmsResponse =
      await request(server).get("/hash-algorithms");
    hashAlgorithmId =
      (getHashAlgorithmsResponse.body as { total: number }).total - 1;

    // Get info about the hash algorithm
    const getHashAlgorithmResponse = await request(server).get(
      `/hash-algorithms/${hashAlgorithmId}`,
    );
    hashAlgorithmMultihash = (
      getHashAlgorithmResponse.body as {
        multihash: keyof typeof multihashToNodeHashAlg;
      }
    ).multihash;

    // Compute 2 hashes with the last hash algorithm
    hashValue1 = `0x${crypto
      .createHash(multihashToNodeHashAlg[hashAlgorithmMultihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    hashValue2 = `0x${crypto
      .createHash(multihashToNodeHashAlg[hashAlgorithmMultihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    hashValue3 = `0x${crypto
      .createHash(multihashToNodeHashAlg[hashAlgorithmMultihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /records", () => {
    it("should return a paginated collection of records", async () => {
      expect.assertions(2);

      const response = await request(server).get("/records");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/records?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining("/records?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/records?page[after]="),
          last: expect.stringContaining("/records?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /records/{recordId}", () => {
    it("should return a specific record", async () => {
      expect.assertions(2);

      const respRecords = await request(server).get("/records");
      const { recordId } = (
        respRecords.body as {
          items: RecordLink[];
        }
      ).items[0]!;
      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        ownerIds: expect.arrayContaining([]),
        revokedOwnerIds: expect.arrayContaining([]),
        firstVersionTimestamps: expect.arrayContaining([]),
        lastVersionTimestamps: expect.arrayContaining([]),
        totalVersions: expect.any(Number),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const recordId = multibase.base64url.encode(crypto.randomBytes(32));

      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        title: "Record Not Found",
        status: 404,
        detail: `Record ${recordId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /records/{recordId}/versions", () => {
    const getFirstRecordId = async () => {
      const respRecords = await request(server).get("/records");
      const { recordId } = (
        respRecords.body as {
          items: RecordLink[];
        }
      ).items[0]!;
      return recordId;
    };

    it("should return a paginated collection of versions", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`,
        ),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`,
          ),
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=`,
          ),
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=`,
          ),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /records/{recordId}/versions/{versionId}", () => {
    const getFirstRecordId = async () => {
      const respRecords = await request(server).get("/records");
      const { recordId } = (
        respRecords.body as {
          items: RecordLink[];
        }
      ).items[0]!;
      return recordId;
    };

    const getRecordVersions = async (recordId: string) => {
      const respRecords = await request(server).get(
        `/records/${recordId}/versions`,
      );
      const { items, total } = respRecords.body as {
        items: VersionLink[];
        total: number;
      };
      return { items, total };
    };

    it("should return a specific version", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions/0`,
      );

      expect(response.body).toStrictEqual({
        hashes: expect.arrayContaining([]),
        info: expect.arrayContaining([]),
      });
      expect(response.status).toBe(200);
    });

    it("should return an error when the record doesn't exist", async () => {
      expect.assertions(2);

      const randomRecordId = multibase.base64url.encode(crypto.randomBytes(32));

      const response = await request(server).get(
        `/records/${randomRecordId}/versions/0`,
      );

      expect(response.body).toStrictEqual({
        title: "Record Not Found",
        status: 404,
        detail: `Record ${randomRecordId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return an error when the version doesn't exist", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();
      const versions = await getRecordVersions(recordId);
      const versionId = versions.total;

      const response = await request(server).get(
        `/records/${recordId}/versions/${versionId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Version Not Found",
        status: 404,
        detail: `Version ${versionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describeWriteOps().each([
    "timestampRecordHashes",
    "timestampVersionHashes",
    "timestampRecordVersionHashes",
    "insertRecordOwner",
    "revokeRecordOwner",
    "insertRecordVersionInfo",
    "detachRecordVersionHash",
    "appendRecordVersionHashes",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let param: JsonRpcParams | null = null;
      switch (method) {
        case "timestampRecordHashes": {
          param = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;
          break;
        }
        case "timestampVersionHashes": {
          param = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
            ],
            versionHash: hashValue1,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );

          param = {
            from: testUser.wallet.address,
            recordId,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "insertRecordOwner": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );
          const notBefore = new Date().getTime();
          param = {
            from: testUser.wallet.address,
            recordId,
            ownerId: "myownerid",
            notBefore,
            notAfter: notBefore + 1000000,
          } as InsertRecordOwnerParam;
          break;
        }
        case "revokeRecordOwner": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );
          param = {
            from: testUser.wallet.address,
            recordId,
            ownerId: "myownerid",
          } as RevokeRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );

          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        case "detachRecordVersionHash": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );
          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            hashValue: hashValue1,
          } as DetachRecordVersionHashParam;
          break;
        }
        case "appendRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );
          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
          chainId: expect.any(String),
          data: expect.any(String),
          from: testUser.wallet.address,
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(
        uTx as TransactionRequest,
      );
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
        responseSend.body.result as string,
      );

      if (method === "timestampRecordHashes") {
        // we need the blocknumber to be able to compute the recordId
        // created by timestampRecordHashes
        blockNumber1 = receipt.blockNumber;
      }
      expect(receipt.status).toBe(1);
    });

    it("should work with empty data", async () => {
      expect.assertions(5);

      let param: JsonRpcParams | null = null;

      switch (method) {
        case "timestampRecordHashes": {
          param = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [hashAlgorithmId],
            hashValues: [hashValue3],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;
          break;
        }
        case "timestampVersionHashes": {
          param = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [hashAlgorithmId],
            hashValues: [hashValue3],
            versionHash: hashValue3,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampVersionHashesParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber2, hashValue3],
            ),
          );

          param = {
            from: testUser.wallet.address,
            recordId,
            hashAlgorithmIds: [hashAlgorithmId],
            hashValues: [hashValue3],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "insertRecordOwner": {
          expect.assertions(0);
          return;
        }
        case "revokeRecordOwner": {
          expect.assertions(0);
          return;
        }
        case "insertRecordVersionInfo": {
          expect.assertions(0);
          return;
        }
        case "detachRecordVersionHash": {
          expect.assertions(0);
          return;
        }
        case "appendRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber2, hashValue3],
            ),
          );
          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [hashAlgorithmId],
            hashValues: [hashValue3],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
          chainId: expect.any(String),
          data: expect.any(String),
          from: testUser.wallet.address,
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(
        uTx as TransactionRequest,
      );
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
        responseSend.body.result as string,
      );
      if (method === "timestampRecordHashes") {
        // we need the blocknumber to be able to compute the recordId
        // created by timestampRecordHashes
        blockNumber2 = receipt.blockNumber;
      }
      expect(receipt.status).toBe(1);
    });
  });

  describeWriteOps().each([
    "timestampRecordVersionHashes",
    "appendRecordVersionHashes",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should fail with admin using an user recordId", async () => {
      expect.assertions(6);

      let param: JsonRpcParams | null = null;
      switch (method) {
        case "timestampRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );

          param = {
            from: adminUser.wallet.address,
            recordId,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "appendRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber1, hashValue1],
            ),
          );
          param = {
            from: adminUser.wallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(adminUser.token, { type: "bearer" })
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
          chainId: expect.any(String),
          data: expect.any(String),
          from: adminUser.wallet.address,
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await adminUser.wallet.signTransaction(
        uTx as TransactionRequest,
      );
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(adminUser.token, { type: "bearer" })
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
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
        responseSend.body.result as string,
      );

      expect(receipt.revertReason).toBe(`sender is not listed as owner`);
      expect(receipt.status).toBe(0);
    });
  });

  itWriteOps()(
    "should reject impersonating transactions: admin wallet using jwt from user",
    async () => {
      expect.assertions(2);

      const param = {
        from: adminUser.wallet.address,
        hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
        hashValues: [hashValue1, hashValue2],
        timestampData: [
          `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
            "hex",
          )}`,
          `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
            "hex",
          )}`,
        ],
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ info: 42 }),
          "utf8",
        ).toString("hex")}`,
      } as TimestampRecordHashesParam;

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "timestampRecordHashes",
          params: [param],
          id: 231,
        });

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await adminUser.wallet.signTransaction(
        uTx as TransactionRequest,
      );
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
          message: `The DID ${
            testUser.info.did
          } is not controlled by the address ${adminUser.wallet.address.toLowerCase()}`,
        },
      });

      expect(responseSend.status).toBe(400);
    },
  );

  // Tests to verify that only record owners can update the records
  describeWriteOps().each([
    "insertRecordOwner",
    "insertRecordVersionInfo",
    "detachRecordVersionHash",
    "timestampRecordVersionHashes",
    "appendRecordVersionHashes",
    "revokeRecordOwner",
  ])("record owners test suite for method %s", (method: string) => {
    it("should fail when trying to perform a signedTransaction", async () => {
      expect.assertions(6);
      const insertParam: JsonRpcParams = {
        from: adminUser.wallet.address,
        hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
        hashValues: [hashValue1, hashValue2],
        timestampData: [
          `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
            "hex",
          )}`,
          `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
            "hex",
          )}`,
        ],
        versionInfo: `0x${Buffer.from(
          JSON.stringify({ info: 42 }),
          "utf8",
        ).toString("hex")}`,
      } as TimestampRecordHashesParam;

      const insertResponseBuild: SupertestJsonRpcResponse = await request(
        server,
      )
        .post("/jsonrpc")
        .auth(adminUser.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "timestampRecordHashes",
          params: [insertParam],
          id: 231,
        });

      const insertUnsignedTransaction = insertResponseBuild.body.result;
      const insertUTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(insertUnsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );
      insertUTx.chainId = Number(insertUTx.chainId);
      const insertSgnTx = await adminUser.wallet.signTransaction(
        insertUTx as TransactionRequest,
      );
      const parseTransactionResponse =
        ethers.utils.parseTransaction(insertSgnTx);

      const insertResponseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(adminUser.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: insertUnsignedTransaction,
              r: parseTransactionResponse.r,
              s: parseTransactionResponse.s,
              v: `0x${Number(parseTransactionResponse.v).toString(16)}`,
              signedRawTransaction: insertSgnTx,
            },
          ],
          id: "45",
        });
      expect(insertResponseSend.status).toBe(HttpStatus.OK);
      let param: JsonRpcParams | null = null;

      // wait to be mined
      await waitToBeMined(ledgerApi, insertResponseSend.body.result as string);

      const response = await request(server).get("/records");
      expect((response.body as { items: string }).items).not.toHaveLength(0);
      expect(response.status).toBe(200);
      const responseLast = await request(server).get(
        (response.body as PaginatedList<unknown>).links?.last.split("v4")[1] ||
          "",
      );

      const { recordId } = (responseLast.body as { items: string }).items[
        (responseLast.body as { items: string }).items.length - 1
      ] as unknown as RecordLink;

      const decodedRecordId = `0x${Buffer.from(
        multibase.base64url.decode(recordId),
      ).toString("hex")}`;

      switch (method) {
        case "timestampRecordVersionHashes": {
          param = {
            from: testUser.wallet.address,
            recordId: decodedRecordId,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as TimestampRecordVersionHashesParam;
          break;
        }
        case "insertRecordOwner": {
          const notBefore = new Date().getTime();
          param = {
            from: testUser.wallet.address,
            recordId: decodedRecordId,
            ownerId: "myownerid",
            notBefore,
            notAfter: notBefore + 1000000,
          } as InsertRecordOwnerParam;
          break;
        }
        case "revokeRecordOwner": {
          param = {
            from: testUser.wallet.address,
            recordId: decodedRecordId,
            ownerId: "myownerid",
          } as RevokeRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          param = {
            from: testUser.wallet.address,
            recordId: decodedRecordId,
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        case "detachRecordVersionHash": {
          param = {
            from: testUser.wallet.address,
            recordId: decodedRecordId,
            versionId: 0,
            hashValue: hashValue1,
          } as DetachRecordVersionHashParam;
          break;
        }
        case "appendRecordVersionHashes": {
          param = {
            from: testUser.wallet.address,
            recordId: decodedRecordId,
            versionId: 0,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex",
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex",
              )}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8",
            ).toString("hex")}`,
          } as AppendRecordVersionHashesParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
          chainId: expect.any(String),
          data: expect.any(String),
          from: testUser.wallet.address,
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(
        uTx as TransactionRequest,
      );
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
        ledgerApi,
        responseSend.body.result as string,
      );
      expect(receipt).toStrictEqual(
        expect.objectContaining({
          status: 0,
          revertReason: expect.stringContaining(
            `sender is not listed as owner`,
          ),
        }),
      );
    });
  });
});
