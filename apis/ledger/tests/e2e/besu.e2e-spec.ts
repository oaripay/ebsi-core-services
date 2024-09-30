import { describe, beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { ConfigService } from "@nestjs/config";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { getServer } from "../utils/getServer.js";

describe("Ledger API v3 - POST /ledger/v3/blockchains/besu", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

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
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
      id: "42",
    });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      result: expect.any(String),
      id: "42",
    });
    expect(response.status).toBe(200);
  });

  it("should return an error when eth_sendRawTransaction is called", async () => {
    expect.assertions(2);

    const response = await request(server).post("/blockchains/besu").send({
      jsonrpc: "2.0",
      method: "eth_sendRawTransaction",
      params: [],
      id: "42",
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
