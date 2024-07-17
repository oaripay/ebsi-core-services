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
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import {
  createFakeToken,
  requestOAuth2Jwt,
  requestSiopJwt,
} from "../utils/authorisation.js";
import { getServer } from "../utils/getServer.js";

describe("Ledger API v3 - POST /ledger/v3/blockchains/besu", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let tokenOAuth2: string;
  let tokenSiop: string;
  let fakeTokenOAuth2: string;

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

    const testApp = configService.get<{
      id: string;
      name: string;
      privateKey: string;
    }>("testApp");

    const testUser = configService.get<ApiConfig["testUser"]>("testUser");

    if (!testUser.kid || !testUser.privateKey) {
      throw new Error("Missing test user");
    }

    try {
      tokenOAuth2 = await requestOAuth2Jwt({
        trustedAppName: testApp.name,
        trustedAppPrivateKey: testApp.privateKey,
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    try {
      tokenSiop = await requestSiopJwt({
        clientKid: testUser.kid,
        clientPrivateKey: testUser.privateKey,
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    try {
      fakeTokenOAuth2 = await createFakeToken({
        loginHint: "oauth2",
        authorisationApiName: configService.get<string>("authorisationApiName"),
        testUserDid: EbsiWallet.createDid(),
        testAppName: testApp.name,
        useKidAuthApi: true,
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }
  });

  afterAll(async () => {
    await app.close();
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
      .auth(fakeTokenOAuth2, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      title: "Unauthorized",
      status: 401,
      detail: expect.stringContaining(
        "JWT could not be validated with the public keys of 'authorisation-api'",
      ),
      type: "about:blank",
    });
    expect(response.status).toBe(401);
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
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
      .auth(tokenOAuth2, { type: "bearer" })
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

  it("should return the chain ID (without a JWT)", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/blockchains/besu")
      // .auth(tokenOAuth2, { type: "bearer" })
      .send({
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

  it("should prevent deploying new smart contracts", async () => {
    expect.assertions(2);

    const wallet = ethers.Wallet.createRandom();

    const transaction: ethers.providers.TransactionRequest = {
      nonce: 0,
      gasLimit: 221000,
      gasPrice: 0,
      from: wallet.address,
      to: "0x0000000000000000000000000000000000000000",
      value: 0,
      data: "0x12345678901234567890",
    };

    const sgnTx = await wallet.signTransaction(transaction);

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [sgnTx],
        id: "42",
      });

    expect(response.body).toStrictEqual({
      title: "Forbidden",
      status: 403,
      detail: "Deployment of new smart contracts is not allowed",
      type: "about:blank",
    });
    expect(response.status).toBe(403);
  });

  it("should return an error when eth_sendRawTransaction is called without a JWT", async () => {
    expect.assertions(2);

    const response = await request(server).post("/blockchains/besu").send({
      jsonrpc: "2.0",
      method: "eth_sendRawTransaction",
      params: [],
      id: "42",
    });

    expect(response.body).toStrictEqual({
      title: "Forbidden",
      status: 403,
      detail: "Forbidden resource",
      type: "about:blank",
    });
    expect(response.status).toBe(403);
  });

  it("should return an error when eth_sendRawTransaction is called without params (OAuth2 JWT)", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
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

  it("should return an error when eth_sendRawTransaction is called using SIOP JWT", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenSiop, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [],
        id: "42",
      });

    expect(response.body).toStrictEqual({
      detail:
        "This jsonrpc method is restricted to Trusted Apps authorized to use Ledger API",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
  });
});
