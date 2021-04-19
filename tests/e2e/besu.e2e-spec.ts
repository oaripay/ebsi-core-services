import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import crypto from "crypto";
import { INestApplication, ValidationPipe, HttpServer } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { Logger } from "@nestjs/common/services/logger.service";
import { ApiConfig } from "../../src/config/configuration";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { createFakeToken } from "../utils/authorisation";

jest.setTimeout(60000);

describe("POST /ledger/v2/blockchains/besu", () => {
  let app: INestApplication;
  let server: HttpServer;
  let token: string;
  let fakeToken: string;

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

    const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );
    const testApp = configService.get<{
      id: string;
      name: string;
      privateKey: string;
    }>("testApp");

    const agent = new Agent(testApp.privateKey, {
      issuer: testApp.name,
      kid: `${configService.get<string>("trustedAppsRegistry")}/${testApp.id}`,
    });
    const nonce = crypto.randomBytes(12).toString("base64");
    const requestOauth2 = await agent.createRequestPayload(
      configService.get<string>("apiName"),
      { nonce }
    );
    const authApi = configService.get<string>("authorisation");
    const response = await request(authApi)
      .post("/oauth2-sessions")
      .send(requestOauth2);
    token = await agent.verifyAuthenticationResponse(
      response.body as AkeResponse,
      nonce
    );
    fakeToken = await createFakeToken(true);
  });

  it("should throw forbidden or unauthorized errors for bad Authentication", async () => {
    expect.assertions(4);

    let response = await request(server).post("/blockchains/besu").send();

    expect(response.body).toStrictEqual({
      title: "Forbidden",
      status: 403,
      detail: "Forbidden resource",
      type: "about:blank",
    });
    expect(response.status).toBe(403);

    response = await request(server)
      .post("/blockchains/besu")
      .auth(fakeToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      title: "Unauthorized",
      status: 401,
      detail: "token validation failed",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send();

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

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send({
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

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send({
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

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send({
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
