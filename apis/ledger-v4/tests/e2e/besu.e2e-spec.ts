import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";

import { AppModule } from "../../src/app.module.ts";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.ts";
import { getServer } from "../utils/getServer.ts";

describe("Ledger API v4 - POST /ledger/v4/blockchains/besu", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { rawBody: true },
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    Logger.overrideLogger(false);

    await app.init();
    await fastifyInstance.ready();

    server = getServer(app, configService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

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
      result: expect.stringMatching(/^0x[0-9a-fA-F]+$/),
    });
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
        result: expect.stringMatching(/^0x[0-9a-fA-F]+$/),
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

  it("should forward the errors returned by Besu", async () => {
    expect.assertions(2);

    const response = await request(server).post("/blockchains/besu").send({
      id: "43",
      jsonrpc: "2.0",
      method: "eth_getBlockByHash",
      // Missing hash
      params: [],
    });

    expect(response.body).toStrictEqual({
      error: {
        code: -32_602,
        message: "Invalid block hash params",
      },
      id: "43",
      jsonrpc: "2.0",
    });
    expect(response.status).toBe(200);
  });
});
