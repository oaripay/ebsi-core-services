import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { FastifyInstance } from "fastify";
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
import { Block } from "./interfaces";
import { ApiConfig } from "../../config/configuration";

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
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
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
                      timesamp: "2021-04-19T15:30:20.605Z",
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
