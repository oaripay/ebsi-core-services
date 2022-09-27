/* eslint-disable jest/no-identical-title */
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
import type { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import { FabricService } from "../../src/modules/fabric/fabric.service";
import {
  Block,
  Transaction,
  PaginatedList,
} from "../../src/modules/fabric/interfaces";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { FabricUser } from "../utils/FabricUser";
import { ProposalResponseBase64 } from "../../src/modules/fabric/fabric.interface";
import { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";

jest.setTimeout(60000);

function describeIfFabricIsEnabled() {
  if (process.env.FABRIC_ENABLED === "true") {
    return describe;
  }

  return describe.skip;
}

describe("Fabric e2e tests", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let fabricService: FabricService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);
    fabricService = moduleFixture.get<FabricService>(FabricService);
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/channels",
    () => {
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
    }
  );

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/channels/{channel}",
    () => {
      it("should return 204 if the channel exists", async () => {
        expect.assertions(2);

        const channelsNames = Object.keys(
          fabricService.getConnectionProfile().channels
        );

        const response = await request(server).get(
          `/blockchains/fabric/channels/${channelsNames[0]}`
        );

        expect(response.text).toBe("");
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
    }
  );

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/channels/{channel}/blocks",
    () => {
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
    }
  );

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/channels/{channel}/blocks/{blockNum}",
    () => {
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
    }
  );

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/channels/{channel}/transactions",
    () => {
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
    }
  );

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/channels/{channel}/transactions/{transactionId}",
    () => {
      let validTransactionId: string;

      beforeAll(async () => {
        const channelsNames = Object.keys(
          fabricService.getConnectionProfile().channels
        );

        const response = await request(server).get(
          `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[size]=1`
        );

        validTransactionId = (response.body as { items: Transaction[] })
          .items[0].txId;
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
    }
  );

  describeIfFabricIsEnabled()(
    "GET /ledger/v3/blockchains/fabric/jsonrpc",
    () => {
      it("should read a contract", async () => {
        expect.assertions(2);
        const response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "readContract",
            params: [
              {
                channelName: "iossdrpocchannel",
                contractName: "iossdrpociossvatid",
                fcn: "checkIossVatIdExists",
                args: [crypto.randomBytes(6).toString("hex")],
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          result: Buffer.from("NOTEXISTS").toString("base64"),
        });
        expect(response.status).toBe(200);
      });

      it("should send a proposal", async () => {
        expect.assertions(2);
        const user = new FabricUser();
        await user.init("user1_be_tax", "./wallet");
        const iossvatid = crypto.randomBytes(6).toString("hex");
        const startDate = new Date().toISOString().slice(0, -14);
        const endDate = new Date(Date.now() + 3e8).toISOString().slice(0, -14);
        const { action, payload, signature } = user.buildSignProposal(
          iossvatid,
          startDate,
          endDate
        );
        expect.assertions(2);
        const response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "sendProposal",
            params: [
              {
                channelName: "iossdrpocchannel",
                contractName: "iossdrpociossvatid",
                action,
                payload,
                signature,
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          result: expect.arrayContaining([
            expect.objectContaining({
              endorsement: {
                endorser: expect.any(String) as string,
                signature: expect.any(String) as string,
              },
              payload: expect.any(String) as string,
              response: {
                message: expect.any(String) as string,
                payload: expect.any(String) as string,
                status: expect.any(Number) as number,
              },
            }),
          ]) as unknown,
        });
        expect(response.status).toBe(200);
      });

      it("should commit a transaction and verify the iossvat added", async () => {
        expect.assertions(7);
        const user = new FabricUser();
        await user.init("user1_be_tax", "./wallet");
        const iossvatid = crypto.randomBytes(6).toString("hex");
        const startDate = new Date().toISOString().slice(0, -14);
        const endDate = new Date(Date.now() + 3e8).toISOString().slice(0, -14);
        const { action, payload, signature } = user.buildSignProposal(
          iossvatid,
          startDate,
          endDate
        );

        let response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "sendProposal",
            params: [
              {
                channelName: "iossdrpocchannel",
                contractName: "iossdrpociossvatid",
                action,
                payload,
                signature,
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          result: expect.arrayContaining([
            expect.objectContaining({
              endorsement: {
                endorser: expect.any(String) as string,
                signature: expect.any(String) as string,
              },
              payload: expect.any(String) as string,
              response: {
                message: expect.any(String) as string,
                payload: expect.any(String) as string,
                status: expect.any(Number) as number,
              },
            }),
          ]) as unknown,
        });
        expect(response.status).toBe(200);

        const { result: propResponses } = response.body as {
          result: ProposalResponseBase64[];
        };

        // build and sign commit using the responses
        user.setProposalResponses(propResponses);
        const commit = user.buildSignCommit();

        response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "commitTransaction",
            params: [
              {
                channelName: "iossdrpocchannel",
                contractName: "iossdrpociossvatid",
                action: commit.action,
                payload: commit.payload,
                signature: commit.signature,
                transactionId: commit.transactionId,
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          result: "OK",
        });
        expect(response.status).toBe(200);

        // verify iossvatid recently added
        response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "readContract",
            params: [
              {
                channelName: "iossdrpocchannel",
                contractName: "iossdrpociossvatid",
                fcn: "getIossVatId",
                args: [iossvatid],
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          result: expect.any(String) as string,
        });
        expect(response.status).toBe(200);

        const { result } = response.body as { result: string };
        let resultJson: Record<string, unknown>;
        try {
          resultJson = JSON.parse(
            Buffer.from(result, "base64").toString()
          ) as Record<string, unknown>;
        } catch (error) {
          throw new Error(`Result cannot be parsed to JSON: ${result}`);
        }
        expect(resultJson).toStrictEqual({
          iossvatid,
          startdate: startDate,
          enddate: endDate,
          iossvatidsalted: expect.any(String) as string,
          keypdc: expect.any(String) as string,
          keyws: expect.any(String) as string,
          modificationdatetime: expect.any(String) as string,
          operation: "C",
        });
      });

      it("should reject bad params for sendProposal", async () => {
        const user = new FabricUser();
        await user.init("user1_be_tax", "./wallet");
        const iossvatid = crypto.randomBytes(7).toString("hex");
        const startDate = new Date().toISOString().slice(0, -14);
        const endDate = new Date(Date.now() + 3e8).toISOString().slice(0, -14);
        const { action, payload, signature } = user.buildSignProposal(
          iossvatid,
          startDate,
          endDate
        );
        expect.assertions(2);
        const response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "sendProposal",
            params: [
              {
                channelName: "iossdrpocchannel",
                contractName: "iossdrpociossvatid",
                action,
                payload,
                signature,
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32600,
            message:
              "Invalid response: Incorrect ioss vat id length. It must be 12 chars long",
          },
        });
        expect(response.status).toBe(200);
      });

      it("should reject bad requests", async () => {
        expect.assertions(6);
        let response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({});

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message:
              '["jsonrpc must be equal to 2.0","method must be a valid method","params must be an array"]',
          },
          id: null,
        });
        expect(response.status).toBe(200);

        response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "badMethod",
            params: [],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: '["method must be a valid method"]',
          },
          id: 1,
        });
        expect(response.status).toBe(200);

        response = await request(server)
          .post(`/blockchains/fabric/jsonrpc`)
          .send({
            jsonrpc: "2.0",
            id: 1,
            method: "readContract",
            params: [
              {
                badParameter: "bad param",
              },
            ],
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32600,
            message: expect.stringContaining("Validation errors") as string,
          },
        });
        expect(response.status).toBe(200);
      });
    }
  );
});
