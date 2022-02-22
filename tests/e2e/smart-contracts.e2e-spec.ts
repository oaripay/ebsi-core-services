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
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  InsertSmartContractInfoParam,
  UnsignedTransaction,
  UpdateSmartContractInfoByIdParam,
  UpdateSmartContractInfoByNameParam,
  UpdateSmartContractNameParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";
import { getAccessToken, waitToBeMined } from "../utils/waitToBeMined";
import { requestSiopJwt } from "../utils/siopJwt";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertSmartContractInfoParam
  | UpdateSmartContractInfoByIdParam
  | UpdateSmartContractInfoByNameParam
  | UpdateSmartContractNameParam;

describe("Smart contracts (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;
  let scName: string;
  let scName2: string;
  let scInfo: Buffer;
  let smartContractInfoId: string;
  let rawScInfo: Record<string, unknown>;
  const revisions: {
    smartContractInfo: { [x: string]: unknown };
    revisionHash: string;
  }[] = [];
  let testUserAccessToken: string;
  let apiAccessToken: string;
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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    // Create test data
    scName = `sc-name-${crypto.randomBytes(8).toString("hex")}`;
    scName2 = `sc-name-${crypto.randomBytes(8).toString("hex")}`;
    rawScInfo = {
      "@context": "https://ebsi.com",
      type: "SmartContract",
      name: scName,
    };
    scInfo = Buffer.from(JSON.stringify(rawScInfo));
    smartContractInfoId = ethers.utils.sha256(scInfo);

    // Generate a valid Client JWT (SIOP) for the tests
    const didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    testUserAccessToken = await requestSiopJwt({
      didRegistry,
      clientDid: configService.get<string>("testAdminDid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
    });

    apiAccessToken = await getAccessToken(configService);
    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  describe.each([
    "insertSmartContractInfo",
    "updateSmartContractInfoById",
    "updateSmartContractInfoByName",
    "updateSmartContractName",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let params: JsonRpcParams = null;

      switch (method) {
        case "insertSmartContractInfo": {
          params = {
            from: adminTestWallet.address,
            name: scName,
            info: `0x${scInfo.toString("hex")}`,
          } as InsertSmartContractInfoParam;
          break;
        }
        case "updateSmartContractInfoById": {
          const newScInfo = {
            "@context": "https://ebsi.com",
            type: "SmartContract",
            newProp: "newValue",
          };

          const serializedScInfo = Buffer.from(JSON.stringify(newScInfo));

          const revisionHash = ethers.utils.sha256(serializedScInfo);

          revisions.push({
            smartContractInfo: newScInfo,
            revisionHash,
          });

          params = {
            from: adminTestWallet.address,
            smartContractInfoId,
            info: `0x${serializedScInfo.toString("hex")}`,
          } as UpdateSmartContractInfoByIdParam;
          break;
        }
        case "updateSmartContractInfoByName": {
          params = {
            from: adminTestWallet.address,
            name: scName,
            info: `0x${Buffer.from(
              JSON.stringify({
                "@context": "https://ebsi.com",
                type: "SmartContract",
                name: scName2,
                newProp2: "newValue2",
              })
            ).toString("hex")}`,
          } as UpdateSmartContractInfoByNameParam;
          break;
        }
        case "updateSmartContractName": {
          params = {
            from: adminTestWallet.address,
            oldName: scName,
            newName: scName2,
          } as UpdateSmartContractNameParam;
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
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await adminTestWallet.signTransaction(uTx);
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
  });

  describe("GET /smart-contracts", () => {
    it("should return a paginated collection of smart contracts", async () => {
      expect.assertions(2);

      const response = await request(server).get("/smart-contracts");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]="
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return the smart contracts corresponding to a specific name", async () => {
      expect.assertions(4);

      // If we give a wrong name
      const response = await request(server).get(
        "/smart-contracts?name=wrong-name"
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=1&page[size]=10&name=wrong-name"
        ) as string,
        items: [],
        total: 0,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10&name=wrong-name"
          ) as string,
        },
      });
      expect(response.status).toBe(200);

      // If we pass an existing name
      const response2 = await request(server).get(
        `/smart-contracts?name=${scName2}`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts?page[after]=1&page[size]=10&name=${scName2}`
        ) as string,
        items: [
          {
            smartContractInfoId,
            href: expect.stringContaining(
              `/smart-contracts/${smartContractInfoId}`
            ) as string,
          },
        ],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${scName2}`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${scName2}`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${scName2}`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${scName2}`
          ) as string,
        },
      });
      expect(response2.status).toBe(200);
    });
  });

  describe("GET /smart-contracts/{smartContractInfoId}", () => {
    it("should return a specific smart contract", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/smart-contracts/${smartContractInfoId}`
      );

      expect(response.body).toStrictEqual({
        ...rawScInfo,
        name: scName2,
        newProp2: "newValue2",
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });

    it("should throw an error if the smart contract is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(16).toString("hex")}`;

      const response = await request(server).get(`/smart-contracts/${fakeId}`);

      expect(response.body).toStrictEqual({
        title: "Smart Contract Not Found",
        status: 404,
        detail: `Smart contract ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /smart-contracts/{smartContractInfoId}/revisions", () => {
    it("should throw an error if the smart contract info ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        "/smart-contracts/no-smart-contract/revisions"
      );

      expect(response.body).toStrictEqual({
        detail: '["smartContractInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the smart contract info is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(16).toString("hex")}`;

      const response = await request(server).get(
        `/smart-contracts/${fakeId}/revisions`
      );

      expect(response.body).toStrictEqual({
        title: "Smart Contract Not Found",
        status: 404,
        detail: `Smart contract ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a paginated collection of smart contract revisions", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions?page[size]=2`
      );

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
      );

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions?page[after]=100&page[size]=2`
      );

      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContractInfoId}/revisions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1`
      );

      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions?page[size]=100`
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
        `/smart-contracts/${smartContractInfoId}/revisions?page[size]=0`
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
        `/smart-contracts/${smartContractInfoId}/revisions?page[after]=0`
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
        `/smart-contracts/${smartContractInfoId}/revisions?page[after]=abc`
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

  describe("GET /smart-contracts/{smartContractInfoId}/revisions/{revisionHash}", () => {
    it("should throw an error if the smart contract info ID is not hexadecimal", async () => {
      expect.assertions(3);

      const revision = revisions[0];

      const response = await request(server).get(
        `/smart-contracts/no-smart-contract/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["smartContractInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the smart contract info is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const revision = revisions[0];

      const response = await request(server).get(
        `/smart-contracts/${fakeId}/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Smart Contract Not Found",
        status: 404,
        detail: `Smart contract ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the revision hash is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions/not-hexadecimal`
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
        `/smart-contracts/${smartContractInfoId}/revisions/${revisionHash}`
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
        `/smart-contracts/${smartContractInfoId}/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual(revision.smartContractInfo);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });
});
