import { randomInt } from "node:crypto";
import { describe, beforeAll, it, expect, afterAll } from "vitest";
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
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import type { HashName } from "multihashes";
import {
  methodNotAllowed,
  prefixWith0x,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import type { UpdateHashAlgorithmSchema } from "../../src/modules/jsonrpc/validators/RequestUpdateHashAlgorithm.js";
import type { UnsignedTransactionSchema } from "../../src/modules/jsonrpc/validators/UnsignedTransaction.js";
import type { InsertHashAlgorithmSchema } from "../../src/modules/jsonrpc/validators/RequestInsertHashAlgorithm.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import type { HashAlgorithmLink } from "../../src/modules/hash-algorithms/hash-algorithms.interface.js";
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
  | InsertHashAlgorithmSchema
  | UpdateHashAlgorithmSchema
  | UnsignedTransactionSchema;

interface TestUser {
  info: EbsiIssuer;
  token: string;
  wallet: ethers.Wallet;
}

const newHashAlgorithm = {
  ianaName: `test-${Date.now()}`,
  outputLength: 256,
  multiHash: "sha2-256",
  oid: "2.16.840.1.101.3.4.2.1",
} as const satisfies {
  ianaName: string;
  outputLength: number;
  multiHash: HashName;
  oid: string;
};

describe("Timestamp API v4 - HashAlgorithms (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let authorisationApiUrl: string;
  let trustedHostnames: string[];
  let adminUser: TestUser;
  let testUser: TestUser;

  let ledgerApi: string;

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

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

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

      const ebsiAuthority = configService
        .get<string>("domain")
        .replace(/^https?:\/\//, "");
      const ebsiEnvConfig = {
        network: configService.get("network", { infer: true }),
        hosts: [ebsiAuthority, ...trustedHostnames],
        services: {
          "did-registry": "v6",
          "trusted-issuers-registry": "v6",
          "trusted-policies-registry": "v4",
          "trusted-schemas-registry": "v4",
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

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /hash-algorithms", () => {
    it("should return a paginated collection of hash algorithms", async () => {
      expect.assertions(2);

      const response = await request(server).get("/hash-algorithms");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining("/hash-algorithms?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /hash-algorithms/{hashAlgorithmId}", () => {
    it("should return a specific hash algorithm", async () => {
      expect.assertions(2);

      const respHashAlgorithms = await request(server).get("/hash-algorithms");
      const { hashAlgorithmId } = (
        respHashAlgorithms.body as {
          items: HashAlgorithmLink[];
        }
      ).items[0]!;

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`,
      );

      expect(response.body).toStrictEqual({
        ianaName: expect.any(String),
        oid: expect.any(String),
        outputLengthBits: expect.any(Number),
        status: expect.any(String),
        multihash: expect.any(String),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the hash algorithm is not found", async () => {
      expect.assertions(2);

      const hashAlgorithmId = randomInt(10000) + 10000; // some random number between 10,000 and 20,000

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Hash algorithm Not Found",
        status: 404,
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describeWriteOps().each([
    "insertHashAlgorithm",
    "updateHashAlgorithm",
  ] as const)(
    "/jsonrpc - send transaction for %s",
    (method: "insertHashAlgorithm" | "updateHashAlgorithm") => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams | null = null;
        const { outputLength, ianaName, oid, multiHash } = newHashAlgorithm;

        switch (method) {
          case "insertHashAlgorithm": {
            params = {
              from: adminUser.wallet.address,
              outputLength,
              ianaName,
              oid,
              status: 1,
              multiHash,
            } satisfies InsertHashAlgorithmSchema;
            break;
          }
          case "updateHashAlgorithm": {
            const response = await request(server).get("/hash-algorithms");
            const { items } = response.body as { items: HashAlgorithmLink[] };
            const { hashAlgorithmId } = items[items.length - 1]!;

            params = {
              from: adminUser.wallet.address,
              hashAlgorithmId,
              outputLength,
              ianaName,
              oid,
              status: 1,
              multiHash,
            } satisfies UpdateHashAlgorithmSchema;
            break;
          }
          default:
            // Never happens
            break;
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(adminUser.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [params],
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
          ) as unknown as UnsignedTransactionSchema,
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
        expect(receipt.status).toBe(1);
      });
    },
  );

  describeWriteOps().each([
    "insertHashAlgorithm",
    "updateHashAlgorithm",
  ] as const)(
    "/jsonrpc - send transaction for %s",
    (method: "insertHashAlgorithm" | "updateHashAlgorithm") => {
      it("should not work with testUser data", async () => {
        expect.assertions(6);

        let params: JsonRpcParams | null = null;
        const { outputLength, ianaName, oid, multiHash } = newHashAlgorithm;

        switch (method) {
          case "insertHashAlgorithm": {
            params = {
              from: testUser.wallet.address,
              outputLength,
              ianaName,
              oid,
              status: 1,
              multiHash,
            } satisfies InsertHashAlgorithmSchema;
            break;
          }
          case "updateHashAlgorithm": {
            const response = await request(server).get("/hash-algorithms");
            const { items } = response.body as { items: HashAlgorithmLink[] };
            const { hashAlgorithmId } = items[items.length - 1]!;

            params = {
              from: testUser.wallet.address,
              hashAlgorithmId,
              outputLength,
              ianaName,
              oid,
              status: 1,
              multiHash,
            } satisfies UpdateHashAlgorithmSchema;
            break;
          }
          default:
            // Never happens
            break;
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUser.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [params],
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

        expect(receipt.revertReason).toBe(
          `Policy error: sender doesn't have the attribute TS:${method}`,
        );
        expect(receipt.status).toBe(0);
      });
    },
  );

  itWriteOps()(
    "should reject impersonating transactions: admin wallet using jwt from user",
    async () => {
      expect.assertions(2);

      const { outputLength, ianaName, oid, multiHash } = newHashAlgorithm;

      const param = {
        from: adminUser.wallet.address,
        outputLength,
        ianaName,
        oid,
        status: 1,
        multiHash,
      } satisfies InsertHashAlgorithmSchema;

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUser.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "insertHashAlgorithm",
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
    },
  );
});
