import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import type { JsonRpcServer } from "hardhat/types";
import * as taskNames from "hardhat/builtin-tasks/task-names";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { JWTPayload, Session as OAuth2Session } from "@cef-ebsi/oauth2-auth";
import { ethers } from "ethers";
import { ConfigService } from "@nestjs/config";
import { ApiConfig } from "../../config/configuration";
import { BesuModule } from "./besu.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { BesuService } from "./besu.service";
import { createFakeToken } from "../../../tests/utils/authorisation";

describe("Besu Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let hardhatServer: JsonRpcServer;
  let besuService: BesuService;
  let testUser: {
    did: string;
    privateKey: string;
  };
  let tokenOAuth2: string;
  let tokenSiop: string;
  const ganachePort = 8547; // 8546 might already be used for ssh port forwarding
  const ganacheUrl = `http://127.0.0.1:${ganachePort}`;
  const mockAuthOAuth2 = jest.spyOn(
    OAuth2Session.prototype,
    "verifyAccessToken"
  );
  const mockAuthSiop = jest.spyOn(SiopSession.prototype, "verifyAccessToken");

  beforeAll(async () => {
    hardhatServer = (await hre.run(taskNames.TASK_NODE_CREATE_SERVER, {
      hostname: "localhost",
      port: ganachePort,
      provider: hre.network.provider,
    })) as JsonRpcServer;

    await hardhatServer.listen();

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BesuModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    testUser = configService.get<{
      did: string;
      privateKey: string;
    }>("testUser");

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    besuService = moduleFixture.get<BesuService>(BesuService);

    tokenOAuth2 = await createFakeToken("oauth2");
    tokenSiop = await createFakeToken("did_siop");
  });

  beforeEach(() => {
    jest
      .spyOn(besuService, "getBesuRpcNode")
      .mockImplementation(() => ganacheUrl);

    // mock libraries
    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> =>
        Promise.reject(
          new Error(
            "Forgot to implement the mock for OAuth2 verifyAccessToken?"
          )
        )
    );

    mockAuthSiop.mockImplementation(
      async (): Promise<JWTPayload> =>
        Promise.reject(
          new Error("Forgot to implement the mock for Siop verifyAccessToken?")
        )
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await hardhatServer.close();
  });

  // Generic tests
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

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.reject(new Error("Mocked error"))
    );

    response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      title: "Unauthorized",
      status: 401,
      detail: "Mocked error",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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
    expect.assertions(4);

    // mockAuthOAuth2.mockImplementation(
    //   async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    // );

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
      result: "0x539",
      id: "42",
    });
    expect(response.status).toBe(200);
    expect(response.header).toHaveProperty("content-type");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.headers["content-type"]).toStrictEqual(
      expect.stringContaining("application/json") as string
    );
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
      detail: "Forbidden resource",
      status: 403,
      title: "Forbidden",
      type: "about:blank",
    });
    expect(response.status).toBe(403);
  });

  it("should return an error when eth_sendRawTransaction is called without params (OAuth2 JWT)", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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
        message: "Expected exactly 1 arguments and got 0",
      },
    });
    expect(response.status).toBe(400);
  });

  it("should return an error when eth_sendRawTransaction is called without params (SIOP JWT)", async () => {
    expect.assertions(2);

    mockAuthSiop.mockImplementation(
      async (): Promise<JWTPayload> =>
        Promise.resolve({ sub: testUser.did, login_hint: "did_siop" })
    );

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
      jsonrpc: "2.0",
      id: "42",
      error: {
        code: -32602,
        message: "Expected exactly 1 arguments and got 0",
      },
    });
    expect(response.status).toBe(400);
  });

  it("should prevent deploying new smart contracts", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    const wallet = ethers.Wallet.createRandom();

    const transaction: ethers.providers.TransactionRequest = {
      nonce: await hre.ethers.provider.getTransactionCount(wallet.address),
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

  it("should return an error if it fails decoding the transaction params (eth_sendRawTransaction)", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: ["ù%ZR"],
        id: "42",
      });

    expect(response.body).toStrictEqual({
      detail:
        "Error parsing the transaction: invalid RLP: not enough bytes for string length",
      status: 400,
      title: "Bad Request",
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("should return an error if the transaction params doesn't use the correct chainId (eth_sendRawTransaction)", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    const provider = new ethers.providers.JsonRpcProvider(ganacheUrl);
    const wallet = ethers.Wallet.createRandom();

    const transaction: ethers.providers.TransactionRequest = {
      nonce: await provider.getTransactionCount(wallet.address),
      gasLimit: 221000,
      gasPrice: 0,
      from: wallet.address,
      to: "0x0000000000000000000000000000000000000000",
      value: 0,
      data: "0x12345678901234567890",
      chainId: 123,
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
      detail:
        "Error parsing the transaction: Invalid chain id. Please set chain id to 0x539",
      status: 400,
      title: "Bad Request",
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("should handle internal errorr (fails to retrieve chainId)", async () => {
    expect.assertions(3);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    // Fails to retrieve chainId
    const spy = jest
      .spyOn(besuService, "getChainId")
      .mockImplementationOnce(() => {
        throw new Error("Error getting EBSI chainId");
      });

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: ["0x"],
        id: "42",
      });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(response.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error") as string,
      type: "about:blank",
    });
    expect(response.status).toBe(500);
  });

  it("should return an error when Besu returns an error", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    jest.spyOn(besuService, "send").mockImplementation(() => {
      const err = new Error("unkown error");
      return Promise.reject(err);
    });

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: "42",
      });

    expect(response.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error") as string,
      type: "about:blank",
    });
    expect(response.status).toBe(500);
  });

  it("should return an error when Besu returns an error that is not parseable", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    // Let's say Besu answers with an error
    jest.spyOn(besuService, "send").mockImplementation(() => {
      const err = new Error();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      err.response = { unparseable: "reponse" };
      return Promise.reject(err);
    });

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(tokenOAuth2, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: "42",
      });

    expect(response.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error") as string,
      type: "about:blank",
    });
    expect(response.status).toBe(500);
  });

  it("should forward a valid (200) Besu error to the client", async () => {
    expect.assertions(2);

    mockAuthOAuth2.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    // Let's say Besu answers with an error
    jest.spyOn(besuService, "send").mockImplementation(() => {
      const err = new Error();

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
      .auth(tokenOAuth2, { type: "bearer" })
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
