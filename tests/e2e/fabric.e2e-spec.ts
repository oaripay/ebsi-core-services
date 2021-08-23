import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { FabricService } from "../../src/modules/fabric/fabric.service";
import {
  Block,
  Transaction,
  PaginatedList,
} from "../../src/modules/fabric/interfaces";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

jest.setTimeout(60000);

describe("Fabric e2e tests", () => {
  let app: INestApplication;
  let server: HttpServer;
  let fabricService: FabricService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    fabricService = moduleFixture.get<FabricService>(FabricService);
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
  });

  describe("GET /ledger/v2/blockchains/fabric/channels", () => {
    it("should return a list of available channels", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        "/blockchains/fabric/channels"
      );

      expect(response.body).toStrictEqual({
        items: channelsNames.slice(0, 10),
        self: expect.stringContaining(
          "/blockchains/fabric/channels?page[after]=1&page[size]=10"
        ) as string,
        total: channelsNames.length,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/blockchains/fabric/channels?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/blockchains/fabric/channels?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels?page[after]=${Math.min(
              2,
              Math.ceil(channelsNames.length / 10)
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/blockchains/fabric/channels?page[after]=${Math.max(
              1,
              Math.ceil(channelsNames.length / 10)
            )}&page[size]=10`
          ) as string,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /ledger/v2/blockchains/fabric/channels/{channel}", () => {
    it("should return 204 if the channel exists", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}`
      );

      expect(response.text).toStrictEqual("");
      expect(response.status).toBe(204);
    });

    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["channelName must match /^[a-z][a-z0-9.-]*$/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the channel doesn't exist", async () => {
      expect.assertions(2);

      const channelsName = "unknown-channel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}`
      );

      expect(response.body).toStrictEqual({
        detail: `Channel ${channelsName} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /ledger/v2/blockchains/fabric/channels/{channel}/blocks", () => {
    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/blocks`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["channelName must match /^[a-z][a-z0-9.-]*$/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the channel doesn't exist", async () => {
      expect.assertions(2);

      const channelsName = "unknown-channel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/blocks`
      );

      expect(response.body).toStrictEqual({
        detail: `Channel ${channelsName} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return a list of blocks for a given channel", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/blocks`
      );

      const { total } = response.body as { total: number };
      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<Block>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels/${
              channelsNames[0]
            }/blocks?page[after]=${Math.min(
              2,
              Math.max(Math.ceil(total / 10), 1)
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/blockchains/fabric/channels/${
              channelsNames[0]
            }/blocks?page[after]=${Math.max(
              Math.ceil(total / 10),
              1
            )}&page[size]=10`
          ) as string,
        },
      });
    });
  });

  describe("GET /ledger/v2/blockchains/fabric/channels/{channel}/blocks/{blockNum}", () => {
    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/blocks/0`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["channelName must match /^[a-z][a-z0-9.-]*$/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the channel doesn't exist", async () => {
      expect.assertions(2);

      const channelsName = "unknown-channel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/blocks/0`
      );

      expect(response.body).toStrictEqual({
        detail: `Channel ${channelsName} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the blockNumber parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );
      const channelsName = channelsNames[0];

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/blocks/abcd`
      );

      expect(response.body).toStrictEqual({
        detail: '["blockNumber must be a number string"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the block doesn't exist", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );
      const channelsName = channelsNames[0];

      const blockNumber = "12121211212454365464";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/blocks/${blockNumber}`
      );

      expect(response.body).toStrictEqual({
        detail: `Block ${blockNumber} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return a block for a given channel", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/blocks/0`
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        blockNum: 0,
        channelName: channelsNames[0],
        dataHash: expect.any(String) as string,
        prevHash: expect.any(String) as string,
        timestamp: expect.any(String) as string,
        txCount: expect.any(Number) as string,
        txIds: expect.any(Array) as string[],
      });
    });
  });

  describe("GET /ledger/v2/blockchains/fabric/channels/{channel}/transactions", () => {
    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["channelName must match /^[a-z][a-z0-9.-]*$/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the channel doesn't exist", async () => {
      expect.assertions(2);

      const channelsName = "unknown-channel";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions`
      );

      expect(response.body).toStrictEqual({
        detail: `Channel ${channelsName} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return a list of transactions for a given channel", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions`
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
        ) as string,
        items: expect.arrayContaining([]) as Array<Block>,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
          ) as string,
        },
      });
    });

    it("should return a list of transactions and the correct link to the next page", async () => {
      expect.assertions(6);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[size]=2`
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
        ) as string,
        items: expect.arrayContaining([]) as Array<Transaction>,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
          ) as string,
        },
      });
      expect((response.body as PaginatedList).items).toHaveLength(2);

      // Check first item
      expect(
        (response.body as { items: Transaction[] }).items[0]
      ).toStrictEqual({
        txId: expect.any(String) as string,
        type: expect.any(String) as string,
        timestamp: expect.any(String) as string,
        channelId: channelsNames[0],
        creatorMspId: expect.any(String) as string,
        blockNum: expect.any(Number) as number,
        validationCode: expect.any(Number) as number,
        actions: expect.arrayContaining([
          {
            chaincodeId: expect.any(String) as string,
            proposalHash: expect.any(String) as string,
            response: expect.anything() as unknown,
            endorsersMspId: expect.arrayContaining([
              expect.any(String) as string,
            ]) as unknown,
            creatorMspId: expect.any(String) as string,
          },
        ]) as unknown,
      });

      const nextPage = (response.body as PaginatedList).links.next;
      const subUrl = "/blockchains/fabric/channels";
      const urlNext = `${subUrl}${nextPage.split(subUrl)[1]}`;
      const responseNext = await request(server).get(urlNext);

      expect(responseNext.status).toBe(200);
      expect(responseNext.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
        ) as string,
        items: expect.arrayContaining([]) as Array<Transaction>,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
          ) as string,
        },
      });
    });
  });

  describe("GET /ledger/v2/blockchains/fabric/channels/{channel}/transactions/{transactionId}", () => {
    let validTransactionId: string;

    beforeAll(async () => {
      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[size]=1`
      );

      validTransactionId = (response.body as { items: Transaction[] }).items[0]
        .txId;
    });

    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";
      const txId = validTransactionId;

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${txId}`
      );

      expect(response.body).toStrictEqual({
        detail:
          '["channelName must match /^[a-z][a-z0-9.-]*$/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the channel doesn't exist", async () => {
      expect.assertions(2);

      const channelsName = "unknown-channel";
      const txId = validTransactionId;

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${txId}`
      );

      expect(response.body).toStrictEqual({
        detail: `Channel ${channelsName} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return 400 if the transactionId parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );
      const txId = "not an hex string";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions/${txId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["transactionId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return 404 if the transaction doesn't exist", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );
      const txId = crypto.randomBytes(32).toString("hex");

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions/${txId}`
      );

      expect(response.body).toStrictEqual({
        detail: `Transaction ${txId} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the specified transaction", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(
        fabricService.getConnectionProfile().channels
      );
      const txId = validTransactionId;

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions/${txId}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        txId,
        type: expect.any(String) as string,
        validationCode: expect.any(Number) as number,
        timestamp: expect.any(String) as string,
        channelId: channelsNames[0],
        creatorMspId: expect.any(String) as string,
        actions: expect.arrayContaining([
          {
            chaincodeId: expect.any(String) as string,
            proposalHash: expect.any(String) as string,
            response: expect.anything() as unknown,
            endorsersMspId: expect.arrayContaining([
              expect.any(String) as string,
            ]) as unknown,
            creatorMspId: expect.any(String) as string,
          },
        ]) as unknown,
      });
    });
  });
});
