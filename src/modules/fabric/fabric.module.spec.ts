import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import * as fabprotos from "fabric-protos";
import { Gateway, Wallets } from "fabric-network";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore fabric-common doesn't expose the TS definition correctly - https://github.com/hyperledger/fabric-sdk-node/pull/477
import { BlockDecoder } from "fabric-common";
import { FabricModule } from "./fabric.module";
import { FabricService } from "./fabric.service";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  Block,
  FabricAction,
  FabricBlock,
  FabricTransaction,
  PaginatedList,
} from "./interfaces";
import { ApiConfig } from "../../config/configuration";
import { encodeMultibase64url } from "./fabric.utils";
import { FabricUser } from "../../../tests/utils/FabricUser";

function createFabricAction(): FabricAction {
  const action: FabricAction = {
    header: {
      creator: {
        mspid: "mspid",
      },
    },
    payload: {
      chaincode_proposal_payload: {
        input: {
          chaincode_spec: {
            chaincode_id: {
              name: "chaincode-name",
            },
          },
        },
      },
      action: {
        proposal_response_payload: {
          proposal_hash: crypto.randomBytes(32),
          extension: {
            response: {},
          },
        },
        endorsements: [
          {
            endorser: {
              mspid: "mspid",
            },
          },
        ],
      },
    },
  };
  return action;
}

function createFabricTransaction(channelName: string): FabricTransaction {
  const tx: FabricTransaction = {
    payload: {
      header: {
        channel_header: {
          tx_id: crypto.randomBytes(32).toString("hex"),
          type: 3,
          timestamp: new Date().toISOString(),
          channel_id: channelName,
        },
        signature_header: {
          creator: {
            mspid: "mspid",
          },
        },
      },
      data: {
        actions: [createFabricAction(), createFabricAction()],
      },
    },
  };
  return tx;
}

describe("Fabric Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig>;

  const channels = {
    "ebsi-channel": {},
  };

  beforeAll(async () => {
    // Don't load the actual config files
    jest
      .spyOn(FabricService, "importIdentityWallet")
      .mockImplementation(() => ({
        type: "X.509",
        credentials: {
          certificate: "",
          privateKey: "",
        },
        mspId: "",
      }));
    jest
      .spyOn(FabricService, "importConnectionProfile")
      .mockImplementation(() => ({
        channels,
        client: {
          adminCredential: {},
        },
        organizations: {
          betaxiossdrpoc: {
            adminPrivateKey: {},
          },
        },
      }));

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FabricModule],
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
    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /channels", () => {
    it("should return a list of channels", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/blockchains/fabric/channels"
      );

      const channelsNames = Object.keys(channels);

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

  describe("GET /channels/{channel}", () => {
    it("should return 204 if the channel exists", async () => {
      expect.assertions(2);

      const channelsNames = Object.keys(channels);

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
  });

  describe("GET /channels/{channel}/blocks", () => {
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

    it("should return a list of dummy block for a dummy channel", async () => {
      expect.assertions(4);
      const channelsNames = Object.keys(channels);

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock Gateway
      const evaluateTransaction = jest.fn().mockResolvedValue({});
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const numberOfBlocks = 15;

      // Let's say the blockchain height is 15
      jest.spyOn(fabprotos.common.BlockchainInfo, "decode").mockReturnValue({
        height: numberOfBlocks,
      } as fabprotos.common.BlockchainInfo);

      // And Fabric returns these blocks
      for (let i = numberOfBlocks; i > 0; i -= 1) {
        jest.spyOn(BlockDecoder, "decode").mockReturnValueOnce({
          header: {
            number: i,
            data_hash: Buffer.from("abcd", "hex"),
            previous_hash: Buffer.from("1234", "hex"),
          },
          data: {
            data: [
              {
                payload: {
                  header: {
                    channel_header: {
                      timestamp: "2021-04-19T15:30:20.605Z",
                      tx_id: crypto.randomBytes(32).toString("hex"),
                    },
                  },
                },
              },
            ],
          },
        });
      }

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/blocks`
      );

      expect(evaluateTransaction).toHaveBeenCalledWith(
        "GetChainInfo",
        channelsNames[0]
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<Block>,
        total: numberOfBlocks,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=2&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/blockchains/fabric/channels/${channelsNames[0]}/blocks?page[after]=2&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
      expect((response.body as { items: string }).items).toHaveLength(10);
    });
  });

  describe("GET /channels/{channel}/blocks/{blockNumber}", () => {
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

      const channelsNames = Object.keys(channels);
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

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock Gateway
      const evaluateTransaction = jest
        .fn()
        .mockImplementation((query: string) => {
          if (query === "GetBlockByNumber") {
            throw new Error("Entry not found in index");
          }

          return {};
        });
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const channelsNames = Object.keys(channels);

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/blocks/0`
      );

      expect(response.body).toStrictEqual({
        detail: `Block 0 not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the specified block", async () => {
      expect.assertions(3);
      const channelsNames = Object.keys(channels);

      // Fake blocks returned by Fabric
      const numberOfBlocks = 15;
      const blocks: { [x: string]: FabricBlock } = {};
      for (let i = numberOfBlocks - 1; i >= 0; i -= 1) {
        const block: FabricBlock = {
          header: {
            number: i,
            data_hash: crypto.randomBytes(32),
            previous_hash: crypto.randomBytes(32),
          },
          data: {
            data: [
              {
                payload: {
                  header: {
                    channel_header: {
                      timestamp: "2021-04-19T15:30:20.605Z",
                      tx_id: crypto.randomBytes(32).toString("hex"),
                    },
                  },
                },
              },
            ],
          },
          metadata: {
            metadata: [{}, {}, [0]],
          },
        };
        blocks[`${i}`] = block;
      }

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock Gateway
      const evaluateTransaction = jest
        .fn()
        .mockImplementation(
          (query: string, channelName: string, ...args: unknown[]) => {
            if (query === "GetBlockByNumber") {
              return blocks[args[0] as string] as unknown;
            }

            return {};
          }
        );
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );
      jest.spyOn(fabprotos.common.BlockchainInfo, "decode").mockReturnValue({
        height: numberOfBlocks,
      } as fabprotos.common.BlockchainInfo);
      jest
        .spyOn(BlockDecoder, "decode")
        .mockImplementation((blockQueryResult: unknown) => blockQueryResult);

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/blocks/0`
      );

      expect(evaluateTransaction).toHaveBeenCalledWith(
        "GetBlockByNumber",
        channelsNames[0],
        "0"
      );

      const expectedTxIds = blocks["0"].data.data.map(
        (tx) => tx.payload.header.channel_header.tx_id
      );

      expect(response.body).toStrictEqual({
        blockNum: blocks["0"].header.number,
        channelName: channelsNames[0],
        dataHash: encodeMultibase64url(blocks["0"].header.data_hash),
        prevHash: encodeMultibase64url(blocks["0"].header.previous_hash),
        timestamp:
          blocks["0"].data.data[0].payload.header.channel_header.timestamp,
        txCount: expectedTxIds.length,
        txIds: expectedTxIds,
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /channels/{channel}/transactions", () => {
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
      const channelsNames = Object.keys(channels);

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock Gateway
      const evaluateTransaction = jest.fn().mockResolvedValue({});
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const numberOfBlocks = 15;

      // Let's say the blockchain height is 15
      jest.spyOn(fabprotos.common.BlockchainInfo, "decode").mockReturnValue({
        height: numberOfBlocks,
      } as fabprotos.common.BlockchainInfo);

      // And Fabric returns these blocks
      for (let i = numberOfBlocks; i > 0; i -= 1) {
        jest.spyOn(BlockDecoder, "decode").mockReturnValueOnce({
          header: {
            number: i,
            data_hash: Buffer.from("abcd", "hex"),
            previous_hash: Buffer.from("1234", "hex"),
          },
          data: {
            data: [
              createFabricTransaction("my-channel"),
              createFabricTransaction("my-channel"),
            ],
          },
          metadata: {
            metadata: [{}, {}, [0]],
          },
        } as FabricBlock);
      }

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
      expect.assertions(5);

      const channelsNames = Object.keys(channels);

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock Gateway
      const evaluateTransaction = jest.fn().mockResolvedValue({});
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const numberOfBlocks = 15;

      // Let's say the blockchain height is 15
      jest.spyOn(fabprotos.common.BlockchainInfo, "decode").mockReturnValue({
        height: numberOfBlocks,
      } as fabprotos.common.BlockchainInfo);

      // And Fabric returns these blocks
      for (let i = numberOfBlocks; i > 0; i -= 1) {
        jest.spyOn(BlockDecoder, "decode").mockReturnValueOnce({
          header: {
            number: i,
            data_hash: Buffer.from("abcd", "hex"),
            previous_hash: Buffer.from("1234", "hex"),
          },
          data: {
            data: [
              createFabricTransaction("my-channel"),
              createFabricTransaction("my-channel"),
            ],
          },
          metadata: {
            metadata: [{}, {}, [0]],
          },
        } as FabricBlock);
      }

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[size]=2`
      );

      expect(response.status).toBe(200);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
        ) as string,
        items: expect.arrayContaining([]) as Array<Block>,
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

      const nextPage = (response.body as PaginatedList).links.next;
      const subUrl = "/blockchains/fabric/channels";
      const urlNext = `${subUrl}${nextPage.split(subUrl)[1]}`;
      const responseNext = await request(server).get(urlNext);

      expect(responseNext.status).toBe(200);
      expect(responseNext.body).toStrictEqual({
        self: expect.stringContaining(
          `/blockchains/fabric/channels/${channelsNames[0]}/transactions?page[after]=`
        ) as string,
        items: expect.arrayContaining([]) as Array<Block>,
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

  describe("GET /channels/{channel}/transactions/{transactionId}", () => {
    it("should return 400 if the channel parameter is not formatted correctly", async () => {
      expect.assertions(2);

      const channelsName = "unknown_ch@nnel";
      const transactionId = crypto.randomBytes(32).toString("hex");

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${transactionId}`
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
      const transactionId = crypto.randomBytes(32).toString("hex");

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${transactionId}`
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

      const channelsNames = Object.keys(channels);
      const channelsName = channelsNames[0];
      const transactionId = "not an hex string";

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${transactionId}`
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
      expect.assertions(3);

      const channelsNames = Object.keys(channels);
      const channelsName = channelsNames[0];
      const transactionId = crypto.randomBytes(32).toString("hex");

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock GetTransactionByID not found
      const evaluateTransaction = jest
        .fn()
        .mockImplementation((query: string) => {
          if (query === "GetTransactionByID") {
            throw new Error("Entry not found in index");
          }

          return {};
        });
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${transactionId}`
      );

      expect(evaluateTransaction).toHaveBeenCalledWith(
        "GetTransactionByID",
        channelsName,
        transactionId
      );
      expect(response.body).toStrictEqual({
        detail: `Transaction ${transactionId} not found`,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the specified transaction", async () => {
      expect.assertions(3);

      const channelsNames = Object.keys(channels);
      const channelsName = channelsNames[0];

      // Fake transaction returned by Fabric
      const tx = createFabricTransaction("my-channel");
      const transactionId = tx.payload.header.channel_header.tx_id;

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());
      // Mock Gateway
      const evaluateTransaction = jest
        .fn()
        .mockImplementation((query: string) => {
          if (query === "GetTransactionByID") {
            return {
              transactionEnvelope: tx,
              validationCode: 0,
            };
          }

          return {};
        });
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );
      const numberOfBlocks = 15;
      jest.spyOn(fabprotos.common.BlockchainInfo, "decode").mockReturnValue({
        height: numberOfBlocks,
      } as fabprotos.common.BlockchainInfo);
      jest
        .spyOn(BlockDecoder, "decodeTransaction")
        .mockImplementation((txQueryResult: unknown) => txQueryResult);

      const response = await request(server).get(
        `/blockchains/fabric/channels/${channelsName}/transactions/${transactionId}`
      );

      expect(evaluateTransaction).toHaveBeenCalledWith(
        "GetTransactionByID",
        channelsName,
        transactionId
      );

      expect(response.body).toStrictEqual({
        actions: tx.payload.data.actions.map((action) => ({
          creatorMspId: action.header.creator.mspid,
          chaincodeId:
            action.payload.chaincode_proposal_payload.input.chaincode_spec
              .chaincode_id.name,
          proposalHash: expect.any(String) as string,
          response:
            action.payload.action.proposal_response_payload.extension.response,
          endorsersMspId: action.payload.action.endorsements.map(
            (endorsement) => endorsement.endorser.mspid
          ),
        })),
        channelId: tx.payload.header.channel_header.channel_id,
        creatorMspId: tx.payload.header.signature_header.creator.mspid,
        timestamp: tx.payload.header.channel_header.timestamp,
        txId: tx.payload.header.channel_header.tx_id,
        validationCode: 0,
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /ledger/v3/blockchains/fabric/jsonrpc", () => {
    it("should read a contract", async () => {
      expect.assertions(3);

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      // Mock GetTransactionByID not found
      const evaluateTransaction = jest.fn().mockImplementation(() => {
        return Buffer.from("NOTEXISTS");
      });
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const channelName = "iossdrpocchannel";
      const contractName = "iossdrpociossvatid";
      const fcn = "checkIossVatIdExists";
      const args = [crypto.randomBytes(6).toString("hex")];

      const response = await request(server)
        .post(`/blockchains/fabric/jsonrpc`)
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "readContract",
          params: [{ channelName, contractName, fcn, args }],
        });

      expect(evaluateTransaction).toHaveBeenCalledWith(fcn, args[0]);

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 1,
        result: Buffer.from("NOTEXISTS").toString("base64"),
      });
      expect(response.status).toBe(200);
    });

    it("should send a proposal", async () => {
      expect.assertions(2);
      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      const evaluateTransaction = jest.fn().mockImplementation(() => {
        return Buffer.from("NOTEXISTS");
      });

      const sendEndorsement = jest.fn().mockImplementation(() => {
        return {
          errors: [],
          responses: [
            {
              connection: {},
              endorsement: {
                endorser: crypto.randomBytes(10),
                signature: crypto.randomBytes(10),
              },
              payload: crypto.randomBytes(10),
              response: {
                status: 200,
                message: "",
                payload: crypto.randomBytes(10),
              },
            },
          ],
        };
      });

      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn().mockImplementation(() => ({
            newEndorsement: jest.fn().mockImplementation(() => ({
              send: sendEndorsement,
            })),
            getEndorsers: jest.fn(),
          })),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const iossvatid = crypto.randomBytes(6).toString("hex");
      const startDate = new Date().toISOString().slice(0, -14);
      const endDate = new Date(Date.now() + 3e8).toISOString().slice(0, -14);
      const { params } = FabricUser.prepareTxParams(
        iossvatid,
        startDate,
        endDate
      );
      const action = {
        init: false,
        transientMap: {
          iossvatid: crypto.randomBytes(12).toString("base64"),
        },
        transactionId: crypto.randomBytes(32).toString("hex"),
        args: params.map((p) => Buffer.from(p).toString("base64")),
        fcn: "registerIossVatId",
        header: {
          signature_header: crypto.randomBytes(12).toString("base64"),
          channel_header: crypto.randomBytes(12).toString("base64"),
        },
        proposal: {
          header: crypto.randomBytes(12).toString("base64"),
          payload: crypto.randomBytes(12).toString("base64"),
        },
      };
      const payload = crypto.randomBytes(12).toString("base64");
      const signature = crypto.randomBytes(12).toString("base64");

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

    it("should send a commit", async () => {
      expect.assertions(2);
      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            createTransaction: jest.fn().mockImplementation(() => ({
              eventHandlerStrategyFactory: jest.fn().mockImplementation(() => ({
                startListening: jest.fn(),
                waitForEvents: jest.fn(),
              })),
            })),
          })),
          getChannel: jest.fn().mockImplementation(() => ({
            getEndorsers: jest.fn(),
            getCommitters: jest.fn(),
            newEndorsement: jest.fn().mockImplementation(() => ({
              newCommit: jest.fn().mockImplementation(() => ({
                send: jest.fn(),
              })),
            })),
          })),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const action = {
        init: false,
        payload: {
          header: {
            signature_header: crypto.randomBytes(12).toString("base64"),
            channel_header: crypto.randomBytes(12).toString("base64"),
          },
          data: crypto.randomBytes(12).toString("base64"),
        },
      };
      const payload = crypto.randomBytes(12).toString("base64");
      const signature = crypto.randomBytes(12).toString("base64");
      const transactionId = crypto.randomBytes(32).toString("hex");

      const response = await request(server)
        .post(`/blockchains/fabric/jsonrpc`)
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "commitTransaction",
          params: [
            {
              channelName: "iossdrpocchannel",
              contractName: "iossdrpociossvatid",
              action,
              payload,
              signature,
              transactionId,
            },
          ],
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 1,
        result: "OK",
      });
      expect(response.status).toBe(200);
    });

    it("should reject internal errors", async () => {
      expect.assertions(3);

      // Mock Wallets
      jest
        .spyOn(Wallets, "newFileSystemWallet")
        .mockImplementation(() => Wallets.newInMemoryWallet());

      const evaluateTransaction = jest.fn().mockImplementation(() => {
        throw new Error("internal error get network");
      });
      jest
        .spyOn(Gateway.prototype, "connect")
        .mockImplementation(() => Promise.resolve());
      jest.spyOn(Gateway.prototype, "getNetwork").mockImplementation(() =>
        Promise.resolve({
          getGateway: jest.fn(),
          getContract: jest.fn().mockImplementation(() => ({
            evaluateTransaction,
          })),
          getChannel: jest.fn(),
          addCommitListener: jest.fn(),
          removeCommitListener: jest.fn(),
          addBlockListener: jest.fn(),
          removeBlockListener: jest.fn(),
        })
      );

      const channelName = "iossdrpocchannel";
      const contractName = "iossdrpociossvatid";
      const fcn = "checkIossVatIdExists";
      const args = [crypto.randomBytes(6).toString("hex")];

      const response = await request(server)
        .post(`/blockchains/fabric/jsonrpc`)
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "readContract",
          params: [{ channelName, contractName, fcn, args }],
        });

      expect(evaluateTransaction).toHaveBeenCalledWith(fcn, args[0]);

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32603,
          message:
            "The server encountered an internal error and was unable to complete your request",
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
  });

  describe("Feature toggle", () => {
    it("should prevent access to /fabric endpoints if FABRIC_ENABLED is different from 'true'", async () => {
      expect.assertions(2);

      jest
        .spyOn(configService, "get")
        .mockImplementation((propertyPath: string) => {
          if (propertyPath === "fabric") {
            return { enabled: false };
          }

          return {};
        });

      const response = await request(server).get(
        "/blockchains/fabric/channels"
      );

      expect(response.body).toStrictEqual({
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
