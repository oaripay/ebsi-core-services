import { describe, beforeAll, it, expect } from "vitest";
import { randomInt } from "node:crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { ConfigService } from "@nestjs/config";
import { HashName } from "multihashes";
import { prefixWith0x, waitToBeMined } from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import {
  InsertHashAlgorithmParam,
  UnsignedTransaction,
  UpdateHashAlgorithmParam,
} from "../../src/modules/jsonrpc/dto/index.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { HashAlgorithmLink } from "../../src/modules/hash-algorithms/hash-algorithms.interface.js";
import { requestSiopJwt } from "../utils/siopJwt.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { getServer } from "../utils/getServer.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams = InsertHashAlgorithmParam;

const validHashAlgorithms: Record<
  string,
  { outputLength: number; multihash: HashName; oid: string }
> = {
  "sha-256": {
    outputLength: 256,
    multihash: "sha2-256",
    oid: "2.16.840.1.101.3.4.2.1",
  },
  "sha-512": {
    outputLength: 512,
    multihash: "sha2-512",
    oid: "2.16.840.1.101.3.4.2.3",
  },
  "sha3-224": {
    outputLength: 224,
    multihash: "sha3-224",
    oid: "2.16.840.1.101.3.4.2.7",
  },
  "sha3-256": {
    outputLength: 256,
    multihash: "sha3-256",
    oid: "2.16.840.1.101.3.4.2.8",
  },
  "sha3-384": {
    outputLength: 384,
    multihash: "sha3-384",
    oid: "2.16.840.1.101.3.4.2.9",
  },
  "sha3-512": {
    outputLength: 512,
    multihash: "sha3-512",
    oid: "2.16.840.1.101.3.4.2.10",
  },
} as const;

describe("HashAlgorithms (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let testClientWallet: ethers.Wallet;
  let configService: ConfigService<ApiConfig, true>;
  let testUserAccessToken: string;
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

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    testClientWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testClientPrivateKey")),
    );

    try {
      // Generate a valid Client JWT (SIOP) for the tests
      testUserAccessToken = await requestSiopJwt({ configService });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  describeWriteOps().each(["insertHashAlgorithm", "updateHashAlgorithm"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams | null = null;

        switch (method) {
          case "insertHashAlgorithm": {
            const hashes = Object.keys(validHashAlgorithms);
            const randomHash = hashes[randomInt(0, hashes.length)]!;

            params = {
              from: testClientWallet.address,
              outputLength: validHashAlgorithms[randomHash].outputLength,
              ianaName: randomHash,
              oid: validHashAlgorithms[randomHash].oid,
              status: 1,
              multihash: validHashAlgorithms[randomHash].multihash,
            } as InsertHashAlgorithmParam;
            break;
          }
          case "updateHashAlgorithm": {
            const response = await request(server).get("/hash-algorithms");
            const hashAlgorithmId =
              (response.body as { total: number }).total - 1;

            const hashes = Object.keys(validHashAlgorithms);
            const randomHash = hashes[randomInt(0, hashes.length)]!;

            params = {
              from: testClientWallet.address,
              hashAlgorithmId,
              outputLength: validHashAlgorithms[randomHash].outputLength,
              ianaName: randomHash,
              oid: validHashAlgorithms[randomHash].oid,
              status: 1,
              multihash: validHashAlgorithms[randomHash].multihash,
            } as UpdateHashAlgorithmParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUserAccessToken, { type: "bearer" })
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
            from: testClientWallet.address,
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
        const sgnTx = await testClientWallet.signTransaction(
          uTx as TransactionRequest,
        );
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUserAccessToken, { type: "bearer" })
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

  describe("GET /hash-algorithms", () => {
    it("should return a paginated collection of hash algorithms", async () => {
      expect.assertions(2);

      const response = await request(server).get("/hash-algorithms");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10",
        ),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10",
          ),
          next: expect.stringContaining("/hash-algorithms?page[after]="),
          last: expect.stringContaining("/hash-algorithms?page[after]="),
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
      ).items[0];

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

      const hashAlgorithmId = randomInt(10_000, 20_000); // some random number between 10,000 and 20,000

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
});
