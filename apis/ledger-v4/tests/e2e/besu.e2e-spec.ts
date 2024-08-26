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

describe("Ledger API v4 - POST /ledger/v4/blockchains/besu", () => {
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
      result: expect.any(String),
      id: "42",
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
});
