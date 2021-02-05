import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, HttpServer } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

jest.setTimeout(60000);

describe("POST /ledger/v2/blockchains/besu", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server).post("/blockchains/besu").send();

    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail:
        '["jsonrpc must be equal to 2.0","method must be a valid method","params must be an array"]',
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
      title: "Bad Request",
      status: 400,
      detail: '["method must be a valid method"]',
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
      // https://ec.europa.eu/cefdigital/wiki/display/BLOCKCHAININT/RFC+-+Ethereum+Genesis+File+for+the+new+Main-NET+and+Pilot-Net
      result: "0x181f", // 6175
      id: "42",
    });
    expect(response.status).toBe(200);
  });

  it("should return an error when eth_sendRawTransaction is called without params", async () => {
    expect.assertions(2);

    const response = await request(server).post("/blockchains/besu").send({
      jsonrpc: "2.0",
      method: "eth_sendRawTransaction",
      params: [],
      id: "42",
    });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "42",
      error: {
        code: -32602,
        message: "Invalid params",
      },
    });

    expect(response.status).toBe(400);
  });
});
