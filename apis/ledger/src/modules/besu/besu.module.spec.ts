import hre from "hardhat";

import type { RawServerDefault } from "fastify";

import "@nomiclabs/hardhat-ethers";

import type { JsonRpcServer } from "hardhat/types";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import * as taskNames from "hardhat/builtin-tasks/task-names.js";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { BesuModule } from "./besu.module.js";
import { BesuService } from "./besu.service.js";

describe("Besu Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let hardhatServer: JsonRpcServer;
  let besuService: BesuService;
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
      const moduleFixture = await Test.createTestingModule({
        imports: [BesuModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      app.useGlobalFilters(new AllExceptionsFilter());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));

      // Parse "Accept" request header
      await app.register(fastifyAccepts);

      const fastifyInstance = app.getHttpAdapter().getInstance();
      fastifyInstance.addHook("onRequest", methodNotAllowed);

      await app.init();
      await fastifyInstance.ready();
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
        detail:
          '["jsonrpc must be equal to 2.0","method must be a valid method","params must be an array"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw Bad Request for an invalid method", async () => {
      expect.assertions(2);

      const response = await request(server).post("/blockchains/besu").send({
        jsonrpc: "2.0",
        method: "test",
        params: [],
      });

      expect(response.body).toStrictEqual({
        detail: '["method must be a valid method"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the chain ID", async () => {
      expect.assertions(4);

      const response = await request(server).post("/blockchains/besu").send({
        id: "42",
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
      });

      expect(response.body).toStrictEqual({
        id: "42",
        jsonrpc: "2.0",
        result: "0x539",
      });
      expect(response.status).toBe(200);
      expect(response.header).toHaveProperty("content-type");
      expect(response.headers["content-type"]).toStrictEqual(
        expect.stringContaining("application/json"),
      );
    });

    it("should return an error when eth_sendRawTransaction is called", async () => {
      expect.assertions(2);

      const response = await request(server).post("/blockchains/besu").send({
        id: "42",
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [],
      });

      expect(response.body).toStrictEqual({
        detail: '["method must be a valid method"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an error when Besu returns an error", async () => {
      expect.assertions(2);

      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error("unknown error");
        return Promise.reject(err);
      });

      const response = await request(server).post("/blockchains/besu").send({
        id: "42",
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
      });

      expect(response.body).toStrictEqual({
        detail: expect.stringContaining("internal error"),
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should return an error when Besu returns an error that is not parseable", async () => {
      expect.assertions(2);

      // Let's say Besu answers with an error
      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error("error");

        // @ts-expect-error Property 'response' does not exist on type 'Error'.ts(2339)
        err.response = { unparseable: "response" };
        return Promise.reject(err);
      });

      const response = await request(server).post("/blockchains/besu").send({
        id: "42",
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
      });

      expect(response.body).toStrictEqual({
        detail: expect.stringContaining("internal error"),
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should forward a valid (200) Besu error to the client", async () => {
      expect.assertions(2);

      // Let's say Besu answers with an error
      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error("error");

        // @ts-expect-error Property 'response' does not exist on type 'Error'.ts(2339)
        err.response = JSON.stringify({
          error: {
            code: -32_001,
            message: "Nonce too low",
          },
          id: 1,
          jsonrpc: "2.0",
        });
        return Promise.reject(err);
      });

      const response = await request(server)
        .post("/blockchains/besu")
        .send({
          id: 1,
          jsonrpc: "2.0",
          method: "eth_getTransactionCount",
          params: ["0x213", "latest"],
        });

      // I expect to see the error returned by Besu
      expect(response.body).toStrictEqual({
        error: {
          code: -32_001,
          message: "Nonce too low",
        },
        id: 1,
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(200);
    });
  });
});
