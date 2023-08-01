import { randomInt } from "node:crypto";
import { describe, beforeAll, it, expect } from "@jest/globals";
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
import { prefixWith0x } from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  InsertHashAlgorithmParam,
  UnsignedTransaction,
  UpdateHashAlgorithmParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { HashAlgorithmLink } from "../../src/modules/hash-algorithms/hash-algorithms.interface";
import { ApiConfig } from "../../src/config/configuration";
import { waitToBeMined } from "../utils/waitToBeMined";
import { requestSiopJwt } from "../utils/auth";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams = InsertHashAlgorithmParam | UpdateHashAlgorithmParam;

const newHashAlgorithm: {
  ianaName: string;
  outputLength: number;
  multihash: HashName;
  oid: string;
} = {
  ianaName: `test-${Date.now()}`,
  outputLength: 256,
  multihash: "sha2-256",
  oid: "2.16.840.1.101.3.4.2.1",
} as const;

describe("HashAlgorithms (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let testAdmin: {
    kid: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token: string;
  };
  let testUser: {
    kid: string;
    privateKey: string;
    token: string;
  };
  let ledgerApi: string;

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

    try {
      const configUser = configService.get<{
        kid: string;
        privateKey: string;
      }>("testUser");

      testUser = {
        ...configUser,
        token: await requestSiopJwt({
          clientKid: configUser.kid,
          clientPrivateKey: configUser.privateKey,
          configService,
        }),
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    try {
      const configAdmin = configService.get<{
        kid: string;
        privateKey: string;
      }>("testAdmin");

      testAdmin = {
        ...configAdmin,
        wallet: new ethers.Wallet(prefixWith0x(configAdmin.privateKey)),
        token: await requestSiopJwt({
          clientKid: configAdmin.kid,
          clientPrivateKey: configAdmin.privateKey,
          configService,
        }),
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  describe("GET /hash-algorithms", () => {
    it("should return a paginated collection of hash algorithms", async () => {
      expect.assertions(2);

      const response = await request(server).get("/hash-algorithms");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10"
        ),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ),
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
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
        `/hash-algorithms/${hashAlgorithmId}`
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
        `/hash-algorithms/${hashAlgorithmId}`
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
        const { outputLength, ianaName, oid, multihash } = newHashAlgorithm;

        switch (method) {
          case "insertHashAlgorithm": {
            params = {
              from: testAdmin.wallet.address,
              outputLength,
              ianaName,
              oid,
              status: 1,
              multihash,
            } as InsertHashAlgorithmParam;
            break;
          }
          case "updateHashAlgorithm": {
            const response = await request(server).get("/hash-algorithms");
            const hashAlgorithmId =
              (response.body as { total: number }).total - 1;

            params = {
              from: testAdmin.wallet.address,
              hashAlgorithmId,
              outputLength,
              ianaName,
              oid,
              status: 1,
              multihash,
            } as UpdateHashAlgorithmParam;
            break;
          }
          default:
            // Never happens
            break;
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testAdmin.token, { type: "bearer" })
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
            from: testAdmin.wallet.address,
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
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await testAdmin.wallet.signTransaction(
          uTx as TransactionRequest
        );
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
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

        expect(responseSend.body).toStrictEqual({
          jsonrpc: "2.0",
          id: "45",
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);
      });
    }
  );

  it("should reject impersonating transactions: admin wallet using jwt from user", async () => {
    expect.assertions(2);

    const { outputLength, ianaName, oid, multihash } = newHashAlgorithm;

    const param = {
      from: testAdmin.wallet.address,
      outputLength,
      ianaName,
      oid,
      status: 1,
      multihash,
    } as InsertHashAlgorithmParam;

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
        JSON.stringify(unsignedTransaction)
      ) as unknown as UnsignedTransaction
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await testAdmin.wallet.signTransaction(
      uTx as TransactionRequest
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
          testUser.kid.split("#")[0]
        } is not controlled by the address ${testAdmin.wallet.address.toLowerCase()}`,
      },
    });
    expect(responseSend.status).toBe(400);
  });
});
