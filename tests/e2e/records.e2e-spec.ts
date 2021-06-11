import crypto from "crypto";
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
  TimestampRecordHashesParam,
  TimestampRecordVersionHashesParam,
  AppendRecordVersionHashesParam,
  DetachRecordVersionHashParam,
  InsertRecordOwnerParam,
  InsertRecordVersionInfoParam,
  RevokeRecordOwnerParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import {
  InfoObject,
  RecordLink,
} from "../../src/modules/records/records.interface";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x, multibase64Encode } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import { siopAuthentication } from "../utils/auth";
import { LedgerService } from "../../src/shared/services/ledger.service";

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

describe("Records (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ledgerService: LedgerService;
  let hashAlgorithmId: number;
  let hashAlgorithmIanaName: string;
  let hashValue1: string;
  let hashValue2: string;
  let blockNumber = 0;

  let testAdmin: {
    did: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token?: string;
  };

  let testUser: {
    did: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token?: string;
  };

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

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    const configAdmin = configService.get<{
      did: string;
      privateKey: string;
    }>("testAdmin");
    const configUser = configService.get<{
      did: string;
      privateKey: string;
    }>("testUser");
    testAdmin = {
      ...configAdmin,
      wallet: new ethers.Wallet(prefixWith0x(configAdmin.privateKey)),
    };
    testUser = {
      ...configUser,
      wallet: new ethers.Wallet(prefixWith0x(configUser.privateKey)),
    };

    testUser.token = await siopAuthentication(testUser);
    testAdmin.token = await siopAuthentication(testAdmin);

    // During the tests, we'll use the last hash algorithm
    const getHashAlgorithmsResponse = await request(server).get(
      "/hash-algorithms"
    );
    hashAlgorithmId =
      (getHashAlgorithmsResponse.body as { total: number }).total - 1;

    // Get info about the hash algorithm
    const getHashAlgorithmResponse = await request(server).get(
      `/hash-algorithms/${hashAlgorithmId}`
    );
    hashAlgorithmIanaName = (
      getHashAlgorithmResponse.body as { ianaName: string }
    ).ianaName.toLowerCase();

    const ianaToNodeHashAlg = {
      "sha-256": "sha256",
      "sha-512": "sha512",
      "sha3-224": "sha3-224",
      "sha3-256": "sha3-256",
      "sha3-384": "sha3-384",
      "sha3-512": "sha3-512",
    };

    // Compute 2 hashes with the last hash algorithm
    hashValue1 = `0x${crypto
      .createHash(ianaToNodeHashAlg[hashAlgorithmIanaName])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    hashValue2 = `0x${crypto
      .createHash(ianaToNodeHashAlg[hashAlgorithmIanaName])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;
  });

  describe("GET /records", () => {
    it("should return a paginated collection of records", async () => {
      expect.assertions(2);

      const response = await request(server).get("/records");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/records?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/records?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining("/records?page[after]=") as string,
          last: expect.stringContaining("/records?page[after]=") as string,
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
      ).items[0];
      const response = await request(server).get(`/records/${recordId}`);

      expect(response.body).toStrictEqual({
        ownerIds: expect.arrayContaining([]) as string[],
        revokedOwnerIds: expect.arrayContaining([]) as string[],
        firstVersionTimestamps: expect.arrayContaining([]) as string[],
        lastVersionTimestamps: expect.arrayContaining([]) as string[],
        totalVersions: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const recordId = multibase64Encode(
        `0x${crypto.randomBytes(32).toString("hex")}`
      );

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
      ).items[0];
      return recordId;
    };

    it("should return a paginated collection of versions", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/records/${recordId}/versions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=`
          ) as string,
          last: expect.stringContaining(
            `/records/${recordId}/versions?page[after]=`
          ) as string,
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
      ).items[0];
      return recordId;
    };

    it("should return a specific version", async () => {
      expect.assertions(2);

      const recordId = await getFirstRecordId();

      const response = await request(server).get(
        `/records/${recordId}/versions/0`
      );

      expect(response.body).toStrictEqual({
        hashes: expect.arrayContaining([]) as string[],
        info: expect.arrayContaining([]) as InfoObject[],
      });
      expect(response.status).toBe(200);
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "timestampRecordHashes",
    "timestampRecordVersionHashes",
    "insertRecordOwner",
    "revokeRecordOwner",
    "insertRecordVersionInfo",
    "detachRecordVersionHash",
    "appendRecordVersionHashes",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let param: JsonRpcParams = null;
      switch (method) {
        case "timestampRecordHashes": {
          param = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex"
              )}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber, hashValue1]
            )
          );

          param = {
            from: testUser.wallet.address,
            recordId,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
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
        case "insertRecordOwner": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber, hashValue1]
            )
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
              [testUser.wallet.address, blockNumber, hashValue1]
            )
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
              [testUser.wallet.address, blockNumber, hashValue1]
            )
          );

          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ test: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as InsertRecordVersionInfoParam;
          break;
        }
        case "detachRecordVersionHash": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber, hashValue1]
            )
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
              [testUser.wallet.address, blockNumber, hashValue1]
            )
          );
          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            timestampData: [
              `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
                "hex"
              )}`,
              `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
                "hex"
              )}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
              // `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
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
          chainId: expect.any(String) as string,
          data: expect.any(String) as string,
          from: testUser.wallet.address,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: expect.any(String) as string,
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
      const receipt = await waitToBeMined(
        ledgerService,
        responseSend.body.result as string
      );

      if (method === "timestampRecordHashes") {
        // we need the blocknumber to be able to compute the recordId
        // created by timestampRecordHashes
        blockNumber = receipt.blockNumber;
      }
      expect(receipt.status).toBe(1);
    });
    it("should work with empty data", async () => {
      expect.assertions(5);

      let param: JsonRpcParams = null;
      switch (method) {
        case "timestampRecordHashes": {
          param = {
            from: testUser.wallet.address,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8"
            ).toString("hex")}`,
          } as TimestampRecordHashesParam;
          break;
        }
        case "timestampRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [testUser.wallet.address, blockNumber, hashValue1]
            )
          );

          param = {
            from: testUser.wallet.address,
            recordId,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],

            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
              "utf8"
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
              [testUser.wallet.address, blockNumber, hashValue1]
            )
          );
          param = {
            from: testUser.wallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
            hashValues: [hashValue1, hashValue2],
            versionInfo: `0x${Buffer.from(
              JSON.stringify({ info: 42 }),
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
          chainId: expect.any(String) as string,
          data: expect.any(String) as string,
          from: testUser.wallet.address,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: expect.any(String) as string,
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
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
      const receipt = await waitToBeMined(
        ledgerService,
        responseSend.body.result as string
      );
      if (method === "timestampRecordHashes") {
        // we need the blocknumber to be able to compute the recordId
        // created by timestampRecordHashes
        blockNumber = receipt.blockNumber;
      }
      expect(receipt.status).toBe(1);
    });
  });

  it("should reject impersonating transactions: admin wallet using jwt from user", async () => {
    expect.assertions(2);

    const param = {
      from: testAdmin.wallet.address,
      hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
      hashValues: [hashValue1, hashValue2],
      timestampData: [
        `0x${Buffer.from(JSON.stringify({ test: 42 }), "utf8").toString(
          "hex"
        )}`,
        `0x${Buffer.from(JSON.stringify({ test: 82 }), "utf8").toString(
          "hex"
        )}`,
      ],
      versionInfo: `0x${Buffer.from(
        JSON.stringify({ info: 42 }),
        "utf8"
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
      JSON.parse(JSON.stringify(unsignedTransaction))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await testAdmin.wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(testUser.token, { type: "bearer" })
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
      error: {
        code: -32600,
        message: `The DID ${testUser.did.toLowerCase()} is not controlled by the address ${testAdmin.wallet.address.toLowerCase()}`,
      },
    });
    expect(responseSend.status).toBe(400);
  });
});
