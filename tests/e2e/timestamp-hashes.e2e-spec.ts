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
  InsertHashAlgorithmParam,
  UpdateHashAlgorithmParam,
  TimestampHashesParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { TimestampLink } from "../../src/modules/timestamps/timestamps.interface";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x, multibase64Encode } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";

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
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;

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
    it("should return a specific record", async () => {
      expect.assertions(2);

      const respTimestamps = await request(server).get("/timestamps");

      const { timestampId } = (respTimestamps.body as {
        items: TimestampLink[];
      }).items[0];

      const response = await request(server).get(`/timestamps/${timestampId}`);

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number) as number,
        data: expect.stringContaining("0x") as string,
        hash: expect.any(String) as string,
        timestampedBy: expect.stringContaining("0x") as string,
        transactionHash: expect.stringContaining("0x") as string,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the record is not found", async () => {
      expect.assertions(2);

      const timestampId = multibase64Encode(
        `0x${crypto.randomBytes(32).toString("hex")}`
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each(["timestampHashes"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: adminTestWallet.address,
              hashAlgorithmIds: [0, 0],
              hashValues: [
                `0x${crypto.randomBytes(32).toString("hex")}`,
                `0x${crypto.randomBytes(32).toString("hex")}`,
              ],
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
        expect(receipt.status).toBe("0x1");
      });
      it("should work with empty data", async () => {
        expect.assertions(5);

        let param: JsonRpcParams = null;

        switch (method) {
          case "timestampHashes": {
            param = {
              from: adminTestWallet.address,
              hashAlgorithmIds: [0, 0],
              hashValues: [
                `0x${crypto.randomBytes(32).toString("hex")}`,
                `0x${crypto.randomBytes(32).toString("hex")}`,
              ],
            } as TimestampHashesParam;
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
        expect(receipt.status).toBe("0x1");
      });
    }
  );
});
