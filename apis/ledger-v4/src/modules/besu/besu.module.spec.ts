import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import type { JsonRpcServer } from "hardhat/types";
// eslint-disable-next-line import/extensions
import * as taskNames from "hardhat/builtin-tasks/task-names.js";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { BesuModule } from "./besu.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { BesuService } from "./besu.service.js";
import type { ApiConfig } from "../../config/configuration.js";

describe("Besu Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let hardhatServer: JsonRpcServer;
  let besuService: BesuService;
  let configService: ConfigService<ApiConfig, true>;
  const ganachePort = 8547; // 8546 might already be used for ssh port forwarding

  describe.each([
    `http://127.0.0.1:${ganachePort}`,
    `ws://127.0.0.1:${ganachePort}`,
  ])("connecting to %s", (ganacheUrl: string) => {
    beforeAll(async () => {
      hardhatServer = (await hre.run(taskNames.TASK_NODE_CREATE_SERVER, {
        hostname: "127.0.0.1",
        port: ganachePort,
        provider: hre.network.provider,
      })) as JsonRpcServer;

      await hardhatServer.listen();

      // Start server
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [BesuModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      server = app.getHttpServer();

      besuService = moduleFixture.get<BesuService>(BesuService);
    });

    beforeEach(() => {
      vi.spyOn(besuService, "getBesuRpcNode").mockImplementation(
        () => ganacheUrl,
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
      await hardhatServer.close();
    });

    // Generic tests
    it("should throw Bad Request for a bad JSON-RPC call", async () => {
      expect.assertions(2);

      const response = await request(server).post("/blockchains/besu").send();

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the chain ID", async () => {
      expect.assertions(4);

      const response = await request(server).post("/blockchains/besu").send({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: "42",
      });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        result: "0x539",
        id: "42",
      });
      expect(response.status).toBe(200);
      expect(response.header).toHaveProperty("content-type");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.headers["content-type"]).toStrictEqual(
        expect.stringContaining("application/json"),
      );
    });

    it("should return an error when the method does not exist or is not available", async () => {
      expect.assertions(4);

      // "test" method doesn't exist
      let response = await request(server).post("/blockchains/besu").send({
        jsonrpc: "2.0",
        method: "test",
        params: [],
        id: "43",
      });

      expect(response.body).toStrictEqual({
        error: {
          code: -32601,
          data: null,
          message: "The method test does not exist / is not available.",
        },
        id: "43",
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(200);

      // "eth_sendRawTransaction" method is not available
      response = await request(server).post("/blockchains/besu").send({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [],
        id: "42",
      });

      expect(response.body).toStrictEqual({
        error: {
          code: -32601,
          data: null,
          message:
            "The method eth_sendRawTransaction does not exist / is not available.",
        },
        id: "42",
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(200);
    });

    it("should return an error when Besu returns an error", async () => {
      expect.assertions(2);

      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error("unknown error");
        return Promise.reject(err);
      });

      const response = await request(server).post("/blockchains/besu").send({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: "42",
      });

      expect(response.body).toStrictEqual({
        title: "Internal Server Error",
        status: 500,
        detail: expect.stringContaining("internal error"),
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should return an error when Besu returns an error that is not parseable", async () => {
      expect.assertions(2);

      // Let's say Besu answers with an error
      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error();

        // @ts-expect-error Property 'response' does not exist on type 'Error'.ts(2339)
        err.response = { unparseable: "response" };
        return Promise.reject(err);
      });

      const response = await request(server).post("/blockchains/besu").send({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: "42",
      });

      expect(response.body).toStrictEqual({
        title: "Internal Server Error",
        status: 500,
        detail: expect.stringContaining("internal error"),
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should forward a valid (200) Besu error to the client", async () => {
      expect.assertions(2);

      // Let's say Besu answers with an error
      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error();

        // @ts-expect-error Property 'response' does not exist on type 'Error'.ts(2339)
        err.response = JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32001,
            message: "Nonce too low",
          },
        });
        return Promise.reject(err);
      });

      const response = await request(server)
        .post("/blockchains/besu")
        .send({
          jsonrpc: "2.0",
          method: "eth_getTransactionCount",
          params: ["0x213", "latest"],
          id: 1,
        });

      // I expect to see the error returned by Besu
      expect(response.body).toStrictEqual({
        error: {
          code: -32001,
          message: "Nonce too low",
        },
        id: 1,
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(200);
    });
  });
});
