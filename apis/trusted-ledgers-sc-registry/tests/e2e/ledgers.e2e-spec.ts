import { describe, beforeAll, it, expect } from "@jest/globals";
import crypto from "node:crypto";
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
import { prefixWith0x } from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  InsertLedgerInfoParam,
  UnsignedTransaction,
  UpdateLedgerInfoByIdParam,
  UpdateLedgerInfoByNameParam,
  UpdateLedgerNameParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { waitToBeMined } from "../utils/waitToBeMined";
import { requestSiopJwt } from "../utils/siopJwt";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

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
  let server: HttpServer | string;
  let adminTestWallet: ethers.Wallet;
  let userTestWallet: ethers.Wallet;
  let ledgerName: string;
  let ledgerName2: string;
  let ledgerName3: string;
  let rawLedgerInfo: Record<string, unknown>;
  let ledgerInfo: Buffer;
  let ledgerInfo2: Buffer;
  let ledgerInfoId: string;
  const revisions: {
    ledgerInfo: { [x: string]: unknown };
    revisionHash: string;
  }[] = [];
  let testAdminAccessToken: string;
  let testUserAccessToken: string;
  let ledgerApi: string;
  let sampleTransaction: string;

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

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );
    userTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testUserPrivateKey"))
    );

    ledgerName = `ledger-name-${crypto.randomBytes(8).toString("hex")}`;
    ledgerName2 = `ledger-name-${crypto.randomBytes(8).toString("hex")}`;
    ledgerName3 = `ledger-name-${crypto.randomBytes(8).toString("hex")}`;
    rawLedgerInfo = {
      "@context": "https://ebsi.com",
      type: "Ledger",
      name: ledgerName,
    };
    ledgerInfo = Buffer.from(JSON.stringify(rawLedgerInfo));
    ledgerInfoId = ethers.utils.sha256(ledgerInfo);

    ledgerInfo2 = Buffer.from(
      JSON.stringify({ data: crypto.randomBytes(10).toString("hex") })
    );

    try {
      // Generate a valid Client JWT (SIOP) for the tests
      testAdminAccessToken = await requestSiopJwt({
        clientKid: configService.get<string>("testAdminKid"),
        clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    try {
      testUserAccessToken = await requestSiopJwt({
        clientKid: configService.get<string>("testUserKid"),
        clientPrivateKey: configService.get<string>("testUserPrivateKey"),
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    blockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");
  });

  describeWriteOps().each([
    "insertLedgerInfo",
    "updateLedgerInfoById",
    "updateLedgerInfoByName",
    "updateLedgerName",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let params: JsonRpcParams | null = null;

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
          const newLedgerInfo = {
            "@context": "https://ebsi.com",
            type: "Ledger",
            name: ledgerName2,
            newProp2: "new value2",
          };
          const serializedLedgerInfo = Buffer.from(
            JSON.stringify(newLedgerInfo)
          );

          const revisionHash = ethers.utils.sha256(serializedLedgerInfo);

          revisions.push({
            ledgerInfo: newLedgerInfo,
            revisionHash,
          });

          params = {
            from: adminTestWallet.address,
            name: ledgerName,
            info: `0x${serializedLedgerInfo.toString("hex")}`,
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
        .auth(testAdminAccessToken, { type: "bearer" })
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
          from: adminTestWallet.address,
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
      const sgnTx = await adminTestWallet.signTransaction(
        uTx as TransactionRequest
      );
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testAdminAccessToken, { type: "bearer" })
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
      sampleTransaction = responseSend.body.result as string;
    });

    it("should return transaction data from blockscout", async () => {
      if (!blockscout.url || !sampleTransaction) return;
      expect.assertions(1);

      await new Promise((f) => {
        setTimeout(f, 5000);
      });

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
            blockNumber: expect.any(Number),
            gasUsed: expect.any(String),
            hash: sampleTransaction,
            value: expect.any(String),
          },
        },
      });
    });
  });

  describeWriteOps().each(["insertLedgerInfo", "updateLedgerName"])(
    "/jsonrpc - special authorization for %s",
    (method: string) => {
      it("should send the transaction but the SC should reject no authorized users", async () => {
        expect.assertions(5);

        let params: JsonRpcParams | null = null;

        switch (method) {
          case "insertLedgerInfo": {
            params = {
              from: userTestWallet.address,
              name: ledgerName3,
              info: `0x${ledgerInfo2.toString("hex")}`,
            } as InsertLedgerInfoParam;
            break;
          }
          case "updateLedgerName": {
            params = {
              from: userTestWallet.address,
              oldName: ledgerName2,
              newName: ledgerName3,
            } as UpdateLedgerNameParam;
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
            from: userTestWallet.address,
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
        const sgnTx = await userTestWallet.signTransaction(
          uTx as TransactionRequest
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
          responseSend.body.result as string
        );
        receipt.revertReason = Buffer.from(
          (receipt.revertReason ?? "").slice(2),
          "hex"
        )
          .toString()
          .replace(/[^a-zA-Z:' ]/g, "");
        expect(receipt).toStrictEqual(
          expect.objectContaining({
            status: 0,
            revertReason: expect.stringContaining(
              `Policy error: sender doesn't have the attribute TLSCR:${method}`
            ),
          })
        );
      });
    }
  );

  describe("GET /ledgers", () => {
    it("should return a paginated collection of ledgers", async () => {
      expect.assertions(2);

      const response = await request(server).get("/ledgers");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/ledgers?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10"
          ),
          prev: expect.stringContaining("/ledgers?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/ledgers?page[after]="),
          last: expect.stringContaining("/ledgers?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return an empty list if we pass an invalid leger name", async () => {
      expect.assertions(2);

      // If we give a wrong name
      const response = await request(server).get("/ledgers?name=wrong-name");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
        ),
        items: [],
        total: 0,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ),
          prev: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ),
          next: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ),
          last: expect.stringContaining(
            "/ledgers?page[after]=1&page[size]=10&name=wrong-name"
          ),
        },
      });
      expect(response.status).toBe(200);
    });

    describeWriteOps()("(test requiring actual data)", () => {
      it("should return the ledgers corresponding to a specific name", async () => {
        expect.assertions(2);

        // If we pass an existing name
        const response = await request(server).get(
          `/ledgers?name=${ledgerName2}`
        );
        expect(response.body).toStrictEqual({
          self: expect.stringContaining(
            `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
          ),
          items: [
            {
              ledgerInfoId,
              href: expect.stringContaining(`/ledgers/${ledgerInfoId}`),
            },
          ],
          total: 1,
          pageSize: 10,
          links: {
            first: expect.stringContaining(
              `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
            ),
            prev: expect.stringContaining(
              `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
            ),
            next: expect.stringContaining(
              `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
            ),
            last: expect.stringContaining(
              `/ledgers?page[after]=1&page[size]=10&name=${ledgerName2}`
            ),
          },
        });
        expect(response.status).toBe(200);
      });
    });
  });

  describe("GET /ledgers/{ledgerInfoId}", () => {
    describeWriteOps()("(test requiring actual data)", () => {
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
    });

    it("should throw an error if the ledger info is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(16).toString("hex")}`;

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

  describe("GET /ledgers/{ledgerInfoId}/revisions", () => {
    it("should throw an error if the ledger info ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        "/ledgers/no-ledger/revisions"
      );

      expect(response.body).toStrictEqual({
        detail: '["ledgerInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the ledger info is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(16).toString("hex")}`;

      const response = await request(server).get(
        `/ledgers/${fakeId}/revisions`
      );

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

    describeWriteOps()("(tests requiring actual data)", () => {
      it("should return a paginated collection of ledgers", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions`
        );

        expect(response.body).toStrictEqual({
          self: expect.stringContaining(
            `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ),
          items: expect.arrayContaining([]),
          total: 3,
          pageSize: 10,
          links: {
            first: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
            prev: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
            next: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
            last: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
          },
        });
        expect((response.body as { items: string }).items).toHaveLength(3);
        expect(response.status).toBe(200);
      });

      it("should handle the pagination properly", async () => {
        expect.assertions(12);

        const response1 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[size]=2`
        );

        expect(response1.body).toStrictEqual({
          self: expect.stringContaining(
            `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=2`
          ),
          items: expect.arrayContaining([]),
          total: 3,
          pageSize: 2,
          links: {
            first: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=2`
            ),
            prev: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=2`
            ),
            next: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
            last: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
          },
        });
        expect((response1.body as { items: string }).items).toHaveLength(2);
        expect(response1.status).toBe(200);

        // next page
        const response2 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
        );

        expect(response2.body).toStrictEqual({
          self: expect.stringContaining(
            `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
          ),
          items: expect.arrayContaining([]),
          total: 3,
          pageSize: 2,
          links: {
            first: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=2`
            ),
            prev: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=2`
            ),
            next: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
            last: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
          },
        });
        expect((response2.body as { items: string }).items).toHaveLength(1);
        expect(response2.status).toBe(200);

        // big page
        const response3 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[after]=100&page[size]=2`
        );

        expect(response3.body).toStrictEqual({
          self: expect.stringContaining(
            `/ledgers/${ledgerInfoId}/revisions?page[after]=100&page[size]=2`
          ),
          items: expect.arrayContaining([]),
          total: 3,
          pageSize: 2,
          links: {
            first: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=2`
            ),
            prev: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
            next: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
            last: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=2&page[size]=2`
            ),
          },
        });
        expect((response3.body as { items: string }).items).toHaveLength(0);
        expect(response3.status).toBe(200);

        // page["after"] defined but page["size"] undefined
        const response4 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[after]=1`
        );

        expect(response4.body).toStrictEqual({
          self: expect.stringContaining(
            `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
          ),
          items: expect.arrayContaining([]),
          total: 3,
          pageSize: 10,
          links: {
            first: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
            prev: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
            next: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
            last: expect.stringContaining(
              `/ledgers/${ledgerInfoId}/revisions?page[after]=1&page[size]=10`
            ),
          },
        });
        expect((response4.body as { items: string }).items).toHaveLength(3);
        expect(response4.status).toBe(200);
      });

      it("should throw a Bad Request for bad pagination", async () => {
        expect.assertions(12);

        const response1 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[size]=100`
        );

        expect(response1.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: '["page[size] must not be greater than 50"]',
          type: "about:blank",
        });
        expect(response1.status).toBe(400);
        expect(
          (response1.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/problem+json"));

        const response2 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[size]=0`
        );

        expect(response2.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: '["page[size] must not be less than 1"]',
          type: "about:blank",
        });
        expect(response2.status).toBe(400);
        expect(
          (response2.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/problem+json"));

        const response3 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[after]=0`
        );

        expect(response3.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: '["page[after] must not be less than 1"]',
          type: "about:blank",
        });
        expect(response3.status).toBe(400);
        expect(
          (response3.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/problem+json"));

        const response4 = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions?page[after]=abc`
        );

        expect(response4.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail:
            '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
          type: "about:blank",
        });
        expect(response4.status).toBe(400);
        expect(
          (response4.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });
    });
  });

  describe("GET /ledgers/{ledgerInfoId}/revisions/{revisionHash}", () => {
    it("should throw an error if the ledger info ID is not hexadecimal", async () => {
      expect.assertions(3);

      const revisionHash = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/ledgers/no-ledger/revisions/${revisionHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["ledgerInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the ledger info is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const revisionHash = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/ledgers/${fakeId}/revisions/${revisionHash}`
      );

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

    describeWriteOps()("(tests requiring actual data)", () => {
      it("should throw an error if the revision hash is not hexadecimal", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions/not-hexadecimal`
        );

        expect(response.body).toStrictEqual({
          detail: '["revisionHash must be a hexadecimal number"]',
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });

      it("should throw an error if the revision is not found", async () => {
        expect.assertions(3);

        const revisionHash = `0x${crypto.randomBytes(32).toString("hex")}`;

        const response = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions/${revisionHash}`
        );

        expect(response.body).toStrictEqual({
          title: "Revision Not Found",
          status: 404,
          detail: `Revision ${revisionHash} not found`,
          type: "about:blank",
        });
        expect(response.status).toBe(404);
        expect(
          (response.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });

      it("should return the expected revision", async () => {
        expect.assertions(3);

        const revision = revisions[0];

        const response = await request(server).get(
          `/ledgers/${ledgerInfoId}/revisions/${revision.revisionHash}`
        );

        expect(response.body).toStrictEqual(revision.ledgerInfo);
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"]
        ).toStrictEqual(expect.stringContaining("application/ld+json"));
      });
    });
  });
});
