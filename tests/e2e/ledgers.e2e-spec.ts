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
  InsertLedgerInfoParam,
  UpdateLedgerInfoByIdParam,
  UpdateLedgerInfoByNameParam,
  UpdateLedgerNameParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertLedgerInfoParam
  | UpdateLedgerInfoByIdParam
  | UpdateLedgerInfoByNameParam
  | UpdateLedgerNameParam;

describe("Ledgers (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;
  let ledgerName: string;
  let ledgerName2: string;
  let rawLedgerInfo: Record<string, unknown>;
  let ledgerInfo: Buffer;
  let ledgerInfoId: string;

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

    ledgerName = `ledger-name-${crypto.randomBytes(8).toString("hex")}`;
    ledgerName2 = `ledger-name-${crypto.randomBytes(8).toString("hex")}`;
    rawLedgerInfo = {
      "@context": "https://ebsi.com",
      type: "Ledger",
      name: ledgerName,
    };
    ledgerInfo = Buffer.from(JSON.stringify(rawLedgerInfo));
    ledgerInfoId = ethers.utils.sha256(ledgerInfo);
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "insertLedgerInfo",
    "updateLedgerInfoById",
    "updateLedgerInfoByName",
    "updateLedgerName",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let params: JsonRpcParams = null;

      switch (method) {
        case "insertLedgerInfo": {
          params = {
            from: adminTestWallet.address,
            name: ledgerName,
            info: `0x${ledgerInfo.toString("hex")}`,
          } as InsertLedgerInfoParam;
          break;
        }
        case "updateLedgerInfoById": {
          params = {
            from: adminTestWallet.address,
            ledgerInfoId,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: "ledger-name",
                newProp: "new value",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByIdParam;
          break;
        }
        case "updateLedgerInfoByName": {
          params = {
            from: adminTestWallet.address,
            name: ledgerName,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "Ledger",
                name: ledgerName2,
                newProp2: "new value2",
              })
            ).toString("hex")}`,
          } as UpdateLedgerInfoByNameParam;
          break;
        }
        case "updateLedgerName": {
          params = {
            from: adminTestWallet.address,
            oldName: ledgerName,
            newName: ledgerName2,
          } as UpdateLedgerNameParam;
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
          params: [params],
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
  });

  describe("GET /ledgers", () => {
    it("should return a paginated collection of ledgers", async () => {
      expect.assertions(2);

      const response = await request(server).get("/ledgers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining("/ledgers?page[after]=") as string,
          last: expect.stringContaining("/ledgers?page[after]=") as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return the ledgers corresponding to a specific name", async () => {
      expect.assertions(4);

      // If we give a wrong name
      const response = await request(server).get("/ledgers?name=wrong-name");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
        ) as string,
        items: [],
        total: 0,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          next: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          last: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
        },
      });
      expect(response.status).toBe(200);

      // If we pass an existing name
      const response2 = await request(server).get(
        `/ledgers?name=${ledgerName2}`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
        ) as string,
        items: [
          {
            ledgerInfoId,
            href: expect.stringContaining(`/ledgers/${ledgerInfoId}`) as string,
          },
        ],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
          ) as string,
          prev: expect.stringContaining(
            `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
          ) as string,
          next: expect.stringContaining(
            `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
          ) as string,
          last: expect.stringContaining(
            `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
          ) as string,
        },
      });
      expect(response2.status).toBe(200);
    });
  });

  describe("GET /ledgers/{ledgerInfoId}", () => {
    it("should return a specific ledger info", async () => {
      expect.assertions(3);

      const response = await request(server).get(`/ledgers/${ledgerInfoId}`);

      expect(response.body).toStrictEqual({
        ...rawLedgerInfo,
        name: ledgerName2,
        newProp2: "new value2",
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });

    it("should throw an error if the ledger info is not found", async () => {
      expect.assertions(3);

      const fakeId = Math.floor(Math.random() * 10000) + 10000; // some random number between 10,000 and 20,000

      const response = await request(server).get(`/ledgers/${fakeId}`);

      expect(response.body).toStrictEqual({
        title: "Ledger Not Found",
        status: 404,
        detail: `Ledger ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });
});
