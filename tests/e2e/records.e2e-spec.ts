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
  let adminTestWallet: ethers.Wallet;
  let blockNumber = 0;
  const firstHashValue = `0x${crypto.randomBytes(32).toString("hex")}`;

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
      const { recordId } = (respRecords.body as {
        items: RecordLink[];
      }).items[0];
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
      const { recordId } = (respRecords.body as {
        items: RecordLink[];
      }).items[0];
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
      const { recordId } = (respRecords.body as {
        items: RecordLink[];
      }).items[0];
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
            from: adminTestWallet.address,
            hashAlgorithmIds: [0, 0],
            hashValues: [
              firstHashValue,
              `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
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
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );

          param = {
            from: adminTestWallet.address,
            recordId,
            hashAlgorithmIds: [0, 0],
            hashValues: [
              firstHashValue,
              `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
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
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );
          const notBefore = new Date().getTime();
          param = {
            from: adminTestWallet.address,
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
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: adminTestWallet.address,
            recordId,
            ownerId: "myownerid",
          } as RevokeRecordOwnerParam;
          break;
        }
        case "insertRecordVersionInfo": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );

          param = {
            from: adminTestWallet.address,
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
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: adminTestWallet.address,
            recordId,
            versionId: 0,
            hashValue: firstHashValue,
          } as DetachRecordVersionHashParam;
          break;
        }
        case "appendRecordVersionHashes": {
          const recordId = ethers.utils.sha256(
            ethers.utils.defaultAbiCoder.encode(
              ["address", "uint256", "bytes"],
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: adminTestWallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [0, 0],
            hashValues: [
              firstHashValue,
              `0x${crypto.randomBytes(32).toString("hex")}`,
            ],
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
      if (method === "timestampRecordHashes") {
        // we need the blocknumber to be able to compute the recordId
        // created by timestampRecordHashes
        blockNumber = parseInt(receipt.blockNumber.substring(2), 16);
      }

      /** */
      expect(receipt.status).toBe("0x1");
    });
    it("should work with empty data", async () => {
      expect.assertions(5);

      let param: JsonRpcParams = null;
      switch (method) {
        case "timestampRecordHashes": {
          param = {
            from: adminTestWallet.address,
            hashAlgorithmIds: [0, 0],
            hashValues: [
              firstHashValue,
              `0x${crypto.randomBytes(32).toString("hex")}`,
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
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );

          param = {
            from: adminTestWallet.address,
            recordId,
            hashAlgorithmIds: [0, 0],
            hashValues: [
              firstHashValue,
              `0x${crypto.randomBytes(32).toString("hex")}`,
            ],

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
              [adminTestWallet.address, blockNumber, firstHashValue]
            )
          );
          param = {
            from: adminTestWallet.address,
            recordId,
            versionId: 0,
            hashAlgorithmIds: [0, 0],
            hashValues: [
              firstHashValue,
              `0x${crypto.randomBytes(32).toString("hex")}`,
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
      if (method === "timestampRecordHashes") {
        // we need the blocknumber to be able to compute the recordId
        // created by timestampRecordHashes
        blockNumber = parseInt(receipt.blockNumber.substring(2), 16);
      }

      /** */
      expect(receipt.status).toBe("0x1");
    });
  });
});
