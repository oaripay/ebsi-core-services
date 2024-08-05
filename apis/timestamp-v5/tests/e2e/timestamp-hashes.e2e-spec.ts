import { describe, beforeAll, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  prefixWith0x,
  multibase,
  multihashEncode,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { describeWriteOps, writeOps } from "../utils/writeOps.js";
import { getServer } from "../utils/getServer.js";
import { getTimestampWriteAccessToken } from "../utils/getAccessToken.js";
import { getEbsiIssuer } from "../utils/getEbsiIssuer.js";

import type { InsertHashAlgorithmSchema } from "../../src/modules/jsonrpc/validators/RequestInsertHashAlgorithm.js";
import type { TimestampHashesSchema } from "../../src/modules/jsonrpc/validators/RequestTimestampHashes.js";
import type { UpdateHashAlgorithmSchema } from "../../src/modules/jsonrpc/validators/RequestUpdateHashAlgorithm.js";
import type { UnsignedTransactionSchema } from "../../src/modules/jsonrpc/validators/UnsignedTransaction.js";
import { HashAlgorithmLink } from "../../src/modules/hash-algorithms/hash-algorithms.interface.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertHashAlgorithmSchema
  | UpdateHashAlgorithmSchema
  | TimestampHashesSchema
  | UnsignedTransactionSchema;

interface TestUser {
  info: EbsiIssuer;
  token: string;
  wallet: ethers.Wallet;
}

const multihashToNodeHashAlg = {
  "sha2-256": "sha256",
  "sha2-512": "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
} as const;

describe("Timestamp API v4 - Timestamp (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let hashAlgorithmId: number;
  let hashAlgorithmMultihash: keyof typeof multihashToNodeHashAlg;
  let hashValue1: string;
  let hashValue2: string;
  let ledgerApi: string;
  let sampleTransaction: string;
  let authorisationApiUrl: string;
  let trustedHostnames: string[];
  let adminUser: TestUser;
  let testUser: TestUser;

  let blockscout: {
    url: string;
    bearerToken: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    const configBlockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");

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

      const ebsiAuthority = configService
        .get<string>("domain")
        .replace(/^https?:\/\//, "");
      ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
      const ebsiEnvConfig = {
        network: configService.get("network", { infer: true }),
        hosts: [ebsiAuthority, ...trustedHostnames],
        services: {
          "did-registry": "v5",
          "trusted-issuers-registry": "v5",
          "trusted-policies-registry": "v3",
          "trusted-schemas-registry": "v3",
        },
      } satisfies EbsiEnvConfiguration;

      try {
        adminUser = {
          info: adminIssuerInfo,
          token: await getTimestampWriteAccessToken(
            authorisationApiUrl,
            adminIssuerInfo,
            ebsiEnvConfig,
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
            ebsiEnvConfig,
          ),
          wallet: userWallet,
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    }

    blockscout = configBlockscout;

    // During the tests, we'll use the last hash algorithm
    const getHashAlgorithmsResponse =
      await request(server).get("/hash-algorithms");
    const { items } = getHashAlgorithmsResponse.body as {
      items: HashAlgorithmLink[];
    };
    hashAlgorithmId = items[items.length - 1]!.hashAlgorithmId;

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

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  afterAll(async () => {
    await app.close();
  });

  describeWriteOps().each(["timestampHashes"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let param: JsonRpcParams | null = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testUser.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
              timestampData: [
                `0x${Buffer.from(
                  JSON.stringify({ test: 742 }),
                  "utf8",
                ).toString("hex")}`,
                `0x${Buffer.from(
                  JSON.stringify({ test: 842 }),
                  "utf8",
                ).toString("hex")}`,
              ],
            } satisfies TimestampHashesSchema;
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
          ) as unknown as UnsignedTransactionSchema,
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
        expect(receipt.status).toBe(1);
        sampleTransaction = responseSend.body.result as string;
      });

      it("should work with empty data", async () => {
        expect.assertions(5);

        let param: JsonRpcParams | null = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: testUser.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
            } satisfies TimestampHashesSchema;
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
          ) as unknown as UnsignedTransactionSchema,
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
        expect(receipt.status).toBe(1);
      });

      it("should reject impersonating transactions: admin wallet using jwt from user", async () => {
        expect.assertions(2);

        let param: JsonRpcParams | null = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: adminUser.wallet.address,
              hashAlgorithmIds: [hashAlgorithmId, hashAlgorithmId],
              hashValues: [hashValue1, hashValue2],
              timestampData: [
                `0x${Buffer.from(
                  JSON.stringify({ test: 742 }),
                  "utf8",
                ).toString("hex")}`,
                `0x${Buffer.from(
                  JSON.stringify({ test: 842 }),
                  "utf8",
                ).toString("hex")}`,
              ],
            } satisfies TimestampHashesSchema;
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
            JSON.stringify(unsignedTransaction),
          ) as unknown as UnsignedTransactionSchema,
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
      });

      it("should return transaction data from blockscout", async () => {
        if (!blockscout.url || !sampleTransaction) return;

        expect.assertions(1);

        await new Promise((f) => {
          setTimeout(f, 5000);
        });

        // check if blockscout is working properly
        const blockscoutCheck = await request(blockscout.url)
          .get(`/tx/${sampleTransaction}`)
          .set({ Authorization: blockscout.bearerToken });

        expect(blockscoutCheck.status).toBe(200);
      });
    },
  );

  describe("GET /timestamps", () => {
    it("should return a paginated collection of timestamps", async () => {
      expect.assertions(2);

      const response = await request(server).get("/timestamps");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/timestamps?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/timestamps?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining("/timestamps?page[after]="),
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
            32,
          ),
        );

        const response = await request(server).get(
          `/timestamps/${timestampId}`,
        );

        expect(response.body).toStrictEqual({
          blockNumber: expect.any(Number),
          timestamp: expect.any(String),
          data: expect.stringContaining("0x"),
          hash: expect.any(String),
          timestampedBy: expect.stringContaining("0x"),
          transactionHash: expect.stringContaining("0x"),
        });
        expect(response.status).toBe(200);
      });
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const timestampId = multibase.base64url.encode(
        multihashEncode(crypto.randomBytes(32).toString("hex"), "sha2-256", 32),
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
