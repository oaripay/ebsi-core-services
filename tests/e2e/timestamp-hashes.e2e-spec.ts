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
import type { FastifyInstance } from "fastify";
import { HashName } from "multihashes";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  InsertHashAlgorithmParam,
  UpdateHashAlgorithmParam,
  TimestampHashesParam,
  UnsignedTransaction,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import {
  prefixWith0x,
  multibase,
  multihashEncode,
} from "../../src/shared/utils";
import { getAccessToken, waitToBeMined } from "../utils/waitToBeMined";
import { requestOAuth2Jwt, requestSiopJwt } from "../utils/auth";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertHashAlgorithmParam
  | UpdateHashAlgorithmParam
  | TimestampHashesParam;

describe("Timestamp (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let hashAlgorithmId: number;
  let hashAlgorithMultihash: HashName;
  let hashValue1: string;
  let hashValue2: string;
  let apiAccessToken: string;
  let ledgerApi: string;
  let sampleTransaction: string;

  let testAdmin: {
    kid: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token?: string;
  };

  let testUser: {
    kid: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token?: string;
  };

  let testApp: {
    name: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token?: string;
  };

  let blockscout: {
    url: string;
    bearerToken: string;
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

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);
    const authorisationApiUrl = configService.get<string>(
      "authorisationApiUrl"
    );
    const trustedAppsRegistryApiUrl = configService.get<string>(
      "trustedAppsRegistryApiUrl"
    );

    const configAdmin = configService.get<{
      kid: string;
      privateKey: string;
    }>("testAdmin");
    const configUser = configService.get<{
      kid: string;
      privateKey: string;
    }>("testUser");
    const configApp = configService.get<{
      name: string;
      privateKey: string;
    }>("testApp");
    const configBlockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");
    testAdmin = {
      ...configAdmin,
      wallet: new ethers.Wallet(prefixWith0x(configAdmin.privateKey)),
    };
    testUser = {
      ...configUser,
      wallet: new ethers.Wallet(prefixWith0x(configUser.privateKey)),
    };
    testApp = {
      ...configApp,
      wallet: new ethers.Wallet(prefixWith0x(configApp.privateKey)),
    };
    blockscout = configBlockscout;

    testUser.token = await requestSiopJwt({
      clientKid: testUser.kid,
      clientPrivateKey: testUser.privateKey,
      authorisationApiUrl,
      trustedAppsRegistryApiUrl,
    });

    testAdmin.token = await requestSiopJwt({
      clientKid: testAdmin.kid,
      clientPrivateKey: testAdmin.privateKey,
      authorisationApiUrl,
      trustedAppsRegistryApiUrl,
    });

    testApp.token = await requestOAuth2Jwt({
      trustedAppPrivateKey: testApp.privateKey,
      trustedAppName: testApp.name,
      trustedAppsRegistryApiUrl,
      authorisationApiUrl,
    });

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
    hashAlgorithMultihash = (
      getHashAlgorithmResponse.body as { multihash: HashName }
    ).multihash;

    const multihashToNodeHashAlg: { [Key in HashName]?: string } = {
      "sha2-256": "sha256",
      "sha2-512": "sha512",
      "sha3-224": "sha3-224",
      "sha3-256": "sha3-256",
      "sha3-384": "sha3-384",
      "sha3-512": "sha3-512",
    };

    // Compute 2 hashes with the last hash algorithm
    hashValue1 = `0x${crypto
      .createHash(multihashToNodeHashAlg[hashAlgorithMultihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    hashValue2 = `0x${crypto
      .createHash(multihashToNodeHashAlg[hashAlgorithMultihash])
      .update(crypto.randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`;

    apiAccessToken = await getAccessToken(configService);

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  describeWriteOps().each(["timestampHashes"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testUser.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
              timestampData: [
                `0x${Buffer.from(
                  JSON.stringify({ test: 742 }),
                  "utf8"
                ).toString("hex")}`,
                `0x${Buffer.from(
                  JSON.stringify({ test: 842 }),
                  "utf8"
                ).toString("hex")}`,
              ],
            } as TimestampHashesParam;
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
          JSON.parse(
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await testUser.wallet.signTransaction(uTx);
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
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          apiAccessToken,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);
        sampleTransaction = responseSend.body.result as string;
      });

      it("should work with empty data", async () => {
        expect.assertions(5);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testUser.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
            } as TimestampHashesParam;
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
          JSON.parse(
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await testUser.wallet.signTransaction(uTx);
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
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          apiAccessToken,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);
      });

      it("should reject impersonating transactions: admin wallet using jwt from user", async () => {
        expect.assertions(2);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testAdmin.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
              timestampData: [
                `0x${Buffer.from(
                  JSON.stringify({ test: 742 }),
                  "utf8"
                ).toString("hex")}`,
                `0x${Buffer.from(
                  JSON.stringify({ test: 842 }),
                  "utf8"
                ).toString("hex")}`,
              ],
            } as TimestampHashesParam;
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

        const unsignedTransaction = responseBuild.body.result;
        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await testAdmin.wallet.signTransaction(uTx);
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
              testUser.kid.split("#")[0]
            } is not controlled by the address ${testAdmin.wallet.address.toLowerCase()}`,
          },
        });
        expect(responseSend.status).toBe(400);
      });

      it("should work with a trusted app", async () => {
        expect.assertions(5);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testApp.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
              timestampData: [
                `0x${Buffer.from(
                  JSON.stringify({ test: 742 }),
                  "utf8"
                ).toString("hex")}`,
                `0x${Buffer.from(
                  JSON.stringify({ test: 842 }),
                  "utf8"
                ).toString("hex")}`,
              ],
            } as TimestampHashesParam;
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
            from: testApp.wallet.address,
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
          JSON.parse(
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await testApp.wallet.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
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

        expect(responseSend.body).toStrictEqual({
          jsonrpc: "2.0",
          id: "45",
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          apiAccessToken,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);
      });
      it("should return transaction data from blockscout", async () => {
        if (!blockscout.url || !sampleTransaction) return;
        expect.assertions(1);
        // check if blockscout is working properly
        const blockscoutCheck: SupertestJsonRpcResponse = await request(
          blockscout.url
        )
          .post("")
          .set({ Authorization: blockscout.bearerToken })
          .send({
            query: `{transaction(hash: "${sampleTransaction}") { hash, blockNumber, value, gasUsed }}`,
            variables: null,
            operationName: null,
          });

        expect(blockscoutCheck.body).toStrictEqual({
          data: {
            transaction: {
              blockNumber: expect.any(Number) as number,
              gasUsed: expect.any(String) as string,
              hash: sampleTransaction,
              value: expect.any(String) as string,
            },
          },
        });
      });
    }
  );

  describe("GET /timestamps", () => {
    it("should return a paginated collection of timestamps", async () => {
      expect.assertions(2);

      const response = await request(server).get("/timestamps");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining("/timestamps?page[after]=") as string,
          last: expect.stringContaining("/timestamps?page[after]=") as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /timestamps/{timestampId}", () => {
    describeWriteOps()("Test requiring actual data", () => {
      it("should return a specific timestamp", async () => {
        expect.assertions(2);

        const timestampId = multibase.base64url.encode(
          multihashEncode(
            ethers.utils.sha256(hashValue1).replace(/^0x/, ""),
            "sha2-256",
            32
          )
        );

        const response = await request(server).get(
          `/timestamps/${timestampId}`
        );

        expect(response.body).toStrictEqual({
          blockNumber: expect.any(Number) as number,
          timestamp: expect.any(String) as string,
          data: expect.stringContaining("0x") as string,
          hash: expect.any(String) as string,
          timestampedBy: expect.stringContaining("0x") as string,
          transactionHash: expect.stringContaining("0x") as string,
        });
        expect(response.status).toBe(200);
      });
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const timestampId = multibase.base64url.encode(
        multihashEncode(crypto.randomBytes(32).toString("hex"), "sha2-256", 32)
      );

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        title: "Timestamp Not Found",
        status: 404,
        detail: `Timestamp ${timestampId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
