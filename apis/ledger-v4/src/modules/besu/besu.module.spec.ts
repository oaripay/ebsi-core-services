import hre from "hardhat";
import * as taskNames from "hardhat/builtin-tasks/task-names.js";
import type { JsonRpcServer } from "hardhat/types/index.js";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { JsonRpcError, JsonRpcResult } from "ethers";
import type { RawServerDefault } from "fastify";

import "@nomicfoundation/hardhat-ethers";
import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ethers } from "ethers";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { BesuJsonRpcError, BesuJsonRpcResult } from "./besu.interface.ts";

import { AllExceptionsFilter } from "../../filters/http-exception.filter.ts";
import { BesuModule } from "./besu.module.ts";

describe("Besu Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let hardhatServer: JsonRpcServer;
  const hrePort = 8547; // 8546 might already be used for ssh port forwarding

  describe.each([`http://127.0.0.1:${hrePort}`, `ws://127.0.0.1:${hrePort}`])(
    "connecting to %s",
    (hreUrl: string) => {
      beforeAll(async () => {
        hardhatServer = (await hre.run(taskNames.TASK_NODE_CREATE_SERVER, {
          hostname: "127.0.0.1",
          port: hrePort,
          provider: hre.network.provider,
        })) as JsonRpcServer;

        await hardhatServer.listen();

        vi.stubEnv("BESU_RPC_NODE", hreUrl);

        // Start server
        const moduleFixture = await Test.createTestingModule({
          imports: [BesuModule],
        }).compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
          { rawBody: true },
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
      });

      afterEach(() => {
        vi.resetAllMocks();
      });

      afterAll(async () => {
        await app.close();
        await hardhatServer.close();
      });

      // Generic tests
      it("should return an error 400 if there's no payload", async () => {
        expect.assertions(2);

        // Missing payload
        const response = await request(server).post("/blockchains/besu").send();

        expect(response.body).toStrictEqual({
          error: {
            code: -32_700,
            message: "Parse error",
          },
          // eslint-disable-next-line unicorn/no-null
          id: null,
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(400);
      });

      it("should return an error 400 if the payload can't be parsed", async () => {
        expect.assertions(2);

        // Invalid JSON
        const response = await request(server).post("/blockchains/besu").send(`[
          {
            "jsonrpc": "2.0",
            "id": "2",
            "m
        ]`);

        expect(response.body).toStrictEqual({
          error: {
            code: -32_700,
            message: "Parse error",
          },
          // eslint-disable-next-line unicorn/no-null
          id: null,
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(400);
      });

      it("should return an error if the payload doesn't pass the validation", async () => {
        expect.assertions(4);

        // Batch contains a value that is not an object
        let response = await request(server)
          .post("/blockchains/besu")
          .send(["invalid"]);

        expect(response.body).toStrictEqual([
          {
            error: {
              code: -32_600,
              message: "Invalid Request",
            },
            // eslint-disable-next-line unicorn/no-null
            id: null,
            jsonrpc: "2.0",
          },
        ]);
        expect(response.status).toBe(200);

        // Payload is missing "params"
        response = await request(server).post("/blockchains/besu").send({
          id: "2",
          jsonrpc: "2.0",
          method: "eth_chainId",
        });

        expect(response.body).toStrictEqual({
          error: {
            code: -32_600,
            message: "Invalid 'params': Required",
          },
          id: "2",
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(200);
      });

      it("should return the chain ID", async () => {
        expect.assertions(8);

        let response = await request(server).post("/blockchains/besu").send({
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

        // Sending request as a string
        response = await request(server).post("/blockchains/besu").send(`{
          "id": "abc",
          "jsonrpc": "2.0",
          "method": "eth_chainId",
          "params": []
        }`);

        expect(response.body).toStrictEqual({
          id: "abc",
          jsonrpc: "2.0",
          result: "0x539",
        });
        expect(response.status).toBe(200);
        expect(response.header).toHaveProperty("content-type");
        expect(response.headers["content-type"]).toStrictEqual(
          expect.stringContaining("application/json"),
        );
      });

      it("should ignore notifications (requests without id)", async () => {
        expect.assertions(4);

        const response = await request(server).post("/blockchains/besu").send({
          // No id
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        });

        expect(response.text).toBe("");
        expect(response.status).toBe(200);
        expect(response.header).toHaveProperty("content-type");
        expect(response.headers["content-type"]).toStrictEqual(
          expect.stringContaining("application/json"),
        );
      });

      it("should return an error when the method does not exist or is not available", async () => {
        expect.assertions(4);

        // "test" method doesn't exist
        let response = await request(server).post("/blockchains/besu").send({
          id: "43",
          jsonrpc: "2.0",
          method: "test",
          params: [],
        });

        expect(response.body).toStrictEqual({
          error: {
            code: -32_601,
            message: "The method test does not exist / is not available.",
          },
          id: "43",
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(200);

        // "eth_sendRawTransaction" method is not available
        response = await request(server).post("/blockchains/besu").send({
          id: "42",
          jsonrpc: "2.0",
          method: "eth_sendRawTransaction",
          params: [],
        });

        expect(response.body).toStrictEqual({
          error: {
            code: -32_601,
            message:
              "The method eth_sendRawTransaction does not exist / is not available.",
          },
          id: "42",
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(200);
      });

      it("should return an error when the batch size exceeds the limit", async () => {
        expect.assertions(2);

        // Create a batch with more than 1024 requests
        const response = await request(server)
          .post("/blockchains/besu")
          .send(
            Array.from({ length: 1025 }).map(() => ({
              id: "42",
              jsonrpc: "2.0",
              method: "eth_chainId",
              params: [],
            })),
          );

        expect(response.body).toStrictEqual({
          error: {
            code: -32_005,
            message: "Number of requests exceeds max batch size",
          },
          // eslint-disable-next-line unicorn/no-null
          id: null,
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(200);
      });

      it("should forward the error returned by the provider", async () => {
        expect.assertions(2);

        const error = {
          error: {
            code: -32_604,
          },
          id: "42",
          jsonrpc: "2.0",
        } satisfies BesuJsonRpcError;

        const provider = hreUrl.startsWith("http")
          ? ethers.JsonRpcProvider
          : ethers.WebSocketProvider;

        vi.spyOn(provider.prototype, "_send").mockImplementation(() => {
          // @ts-expect-error ethers.js expects "id" to be a number while Besu accepts null | number | string
          return Promise.resolve([error as JsonRpcError]);
        });

        const response = await request(server).post("/blockchains/besu").send({
          id: "42",
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        });

        expect(response.body).toStrictEqual(error);
        expect(response.status).toBe(200);
      });

      it("should handle unexpected internal responses", async () => {
        expect.assertions(2);

        // Unexpected response to ethers.js _send() method: the response contains 2 elements
        const besuResponse = [
          {
            id: "42",
            jsonrpc: "2.0",
            result: "",
          },
          {
            id: "42",
            jsonrpc: "2.0",
            result: "",
          },
        ] satisfies BesuJsonRpcResult[];

        const provider = hreUrl.startsWith("http")
          ? ethers.JsonRpcProvider
          : ethers.WebSocketProvider;

        vi.spyOn(provider.prototype, "_send").mockImplementation(() => {
          // @ts-expect-error ethers.js expects "id" to be a number while Besu accepts null | number | string
          return Promise.resolve(besuResponse as JsonRpcResult[]);
        });

        const response = await request(server).post("/blockchains/besu").send({
          id: "42",
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
        });

        expect(response.body).toStrictEqual({
          error: {
            code: -32_603,
            message: "Internal error",
          },
          id: "42",
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(200);
      });

      it("should handle internal errors", async () => {
        expect.assertions(2);

        const provider = hreUrl.startsWith("http")
          ? ethers.JsonRpcProvider
          : ethers.WebSocketProvider;

        vi.spyOn(provider.prototype, "_send").mockImplementation(() => {
          // Something unexpected happens during the request
          return Promise.reject(new Error("error"));
        });

        const response = await request(server)
          .post("/blockchains/besu")
          .send({
            id: 1,
            jsonrpc: "2.0",
            method: "eth_getTransactionCount",
            params: ["0x213", "latest"],
          });

        // Ledger API should return a generic internal error and log the actual error
        expect(response.body).toStrictEqual({
          error: {
            code: -32_603,
            message: "Internal error",
          },
          id: 1,
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(200);

        // TODO: check that "error" has been logged
      });

      it("should support batch requests", async () => {
        expect.assertions(2);

        const response = await request(server)
          .post("/blockchains/besu")
          .send([
            {
              id: "42",
              jsonrpc: "2.0",
              method: "eth_chainId",
              params: [],
            },
            // "test" method doesn't exist
            {
              id: "43",
              jsonrpc: "2.0",
              method: "test",
              params: [],
            },
            // Notifications should be ignored
            {
              // No id
              jsonrpc: "2.0",
              method: "eth_chainId",
              params: [],
            },
            // "eth_sendRawTransaction" method is not available
            {
              id: "42",
              jsonrpc: "2.0",
              method: "eth_sendRawTransaction",
              params: [],
            },
          ]);

        expect(response.body).toStrictEqual([
          {
            id: "42",
            jsonrpc: "2.0",
            result: "0x539",
          },
          {
            error: {
              code: -32_601,
              message: "The method test does not exist / is not available.",
            },
            id: "43",
            jsonrpc: "2.0",
          },
          {
            error: {
              code: -32_601,
              message:
                "The method eth_sendRawTransaction does not exist / is not available.",
            },
            id: "42",
            jsonrpc: "2.0",
          },
        ]);
        expect(response.status).toBe(200);
      });
    },
  );
});
