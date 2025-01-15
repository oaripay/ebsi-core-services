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

import type { ApiConfig } from "../../src/config/configuration.js";

import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { getServer } from "../utils/getServer.js";

describe("Ledger API v3 - POST /ledger/v3/blockchains/besu", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
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
    expect.assertions(2);

    const response = await request(server).post("/blockchains/besu").send({
      id: "42",
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
    });

    expect(response.body).toStrictEqual({
      id: "42",
      jsonrpc: "2.0",
      result: expect.any(String),
    });
    expect(response.status).toBe(200);
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
});
