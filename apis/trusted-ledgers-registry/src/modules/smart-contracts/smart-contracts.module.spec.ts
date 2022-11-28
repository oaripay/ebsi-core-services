import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { LedgerSCRegistry } from "@ebsiint-sc/trusted-ledgers-registry";
import { AsyncReturnType } from "@ebsiint-api/shared";
import { SmartContractsModule } from "./smart-contracts.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/ledgerScRegistry";
import { ContractService } from "../contract/contract.service";
import { ApiConfig } from "../../config/configuration";

jest.setTimeout(60000);

const SMART_CONTRACTS_TOTAL = 3;
const REVISIONS_TOTAL = 3;

describe("SmartContracts Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ledgerScRegistryContract: LedgerSCRegistry;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let contractService: ContractService;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      smartContractsTotal: SMART_CONTRACTS_TOTAL,
      smartContractsRevisionsTotal: REVISIONS_TOTAL,
    });

    ledgerScRegistryContract = testEnv.ledgerScRegistryContract;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SmartContractsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    contractService = moduleFixture.get<ContractService>(ContractService);

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    // Mock TLSCR contract
    jest
      .spyOn(contractService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(ledgerScRegistryContract)
      );
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /smart-contracts", () => {
    it("should return a paginated collection of smart-contracts", async () => {
      expect.assertions(3);

      const response = await request(server).get("/smart-contracts");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SMART_CONTRACTS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        "/smart-contracts?page[size]=2"
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SMART_CONTRACTS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/smart-contracts?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SMART_CONTRACTS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/smart-contracts?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SMART_CONTRACTS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]=2&page[size]=2"
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        "/smart-contracts?page[after]=1"
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/smart-contracts?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: SMART_CONTRACTS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/smart-contracts?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        "/smart-contracts?page[size]=100"
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
        "/smart-contracts?page[size]=0"
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
        "/smart-contracts?page[after]=0"
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
        "/smart-contracts?page[after]=abc"
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

    it("should return the smart-contracts corresponding to a specific name", async () => {
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

      const { smartContracts } = testEnv;

      // If we pass an existing name
      const response2 = await request(server).get(
        `/smart-contracts?name=${smartContracts[0].smartContractName}`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts?page[after]=1&page[size]=10&name=${smartContracts[0].smartContractName}`
        ) as string,
        items: [
          {
            smartContractInfoId: smartContracts[0].smartContractInfoId,
            href: expect.stringContaining(
              `/smart-contracts/${smartContracts[0].smartContractInfoId}`
            ) as string,
          },
        ],
        total: 1,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${smartContracts[0].smartContractName}`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${smartContracts[0].smartContractName}`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${smartContracts[0].smartContractName}`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts?page[after]=1&page[size]=10&name=${smartContracts[0].smartContractName}`
          ) as string,
        },
      });
      expect(response2.status).toBe(200);
    });
  });

  describe("GET /smart-contracts/{smartContractInfoId}", () => {
    it("should throw an error if the smart contract ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get("/smart-contracts/no-sc");

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

    it("should throw an error if the smart contract is not found", async () => {
      expect.assertions(3);

      const smartContractInfoId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/smart-contracts/${smartContractInfoId}`
      );

      expect(response.body).toStrictEqual({
        title: "Smart Contract Not Found",
        status: 404,
        detail: `Smart contract ${smartContractInfoId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific smart contract", async () => {
      expect.assertions(3);

      const sc = testEnv.smartContracts[0];

      // We expect it to return the last revision
      const revision = testEnv.smartContractsRevisions[REVISIONS_TOTAL - 2]; // -2 because it's 0-based AND because ledgersRevisions contains only the updates

      const response = await request(server).get(
        `/smart-contracts/${sc.smartContractInfoId}`
      );

      expect(response.body).toStrictEqual(revision.smartContractInfo);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });

  describe("GET /smart-contracts/{smartContractInfoId}/revisions", () => {
    it("should throw an error if the smart contract info ID is not hexadecimal", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/smart-contracts/no-sc/revisions"
      );

      expect(response.body).toStrictEqual({
        detail: '["smartContractInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the smart contract info is not found", async () => {
      expect.assertions(2);

      const smartContractInfoId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions`
      );

      expect(response.body).toStrictEqual({
        title: "Smart Contract Not Found",
        status: 404,
        detail: `Smart contract ${smartContractInfoId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return a paginated collection of smart-contracts", async () => {
      expect.assertions(3);

      const smartContract = testEnv.smartContracts[0];

      const response = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response.body as { items: string }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(12);

      const smartContract = testEnv.smartContracts[0];

      const response1 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[size]=2`
      );

      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response1.body as { items: string }).items).toHaveLength(2);
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
      );

      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response2.body as { items: string }).items).toHaveLength(1);
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=100&page[size]=2`
      );

      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect((response3.body as { items: string }).items).toHaveLength(0);
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1`
      );

      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: REVISIONS_TOTAL,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect((response4.body as { items: string }).items).toHaveLength(3);
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const smartContract = testEnv.smartContracts[0];
      const response1 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[size]=100`
      );

      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[size]=0`
      );

      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=0`
      );

      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions?page[after]=abc`
      );

      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /smart-contracts/{smartContractInfoId}/revisions/{revisionHash}", () => {
    it("should throw an error if the smart contract info ID is not hexadecimal", async () => {
      expect.assertions(2);

      const revision = testEnv.smartContractsRevisions[0];

      const response = await request(server).get(
        `/smart-contracts/no-sc/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual({
        detail: '["smartContractInfoId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the smart contract info is not found", async () => {
      expect.assertions(2);

      const smartContractInfoId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const revision = testEnv.smartContractsRevisions[0];

      const response = await request(server).get(
        `/smart-contracts/${smartContractInfoId}/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Smart Contract Not Found",
        status: 404,
        detail: `Smart contract ${smartContractInfoId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the revision hash is not hexadecimal", async () => {
      expect.assertions(2);

      const smartContract = testEnv.smartContracts[0];

      const response = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions/not-hexadecimal`
      );

      expect(response.body).toStrictEqual({
        detail: '["revisionHash must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the revision is not found", async () => {
      expect.assertions(2);

      const smartContract = testEnv.smartContracts[0];
      const revisionHash = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions/${revisionHash}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${revisionHash} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the expected revision", async () => {
      expect.assertions(3);

      const smartContract = testEnv.smartContracts[0];
      const revision = testEnv.smartContractsRevisions[0];

      const response = await request(server).get(
        `/smart-contracts/${smartContract.smartContractInfoId}/revisions/${revision.revisionHash}`
      );

      expect(response.body).toStrictEqual(revision.smartContractInfo);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });
});
