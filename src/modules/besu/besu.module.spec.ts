import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Session, JWTPayload } from "@cef-ebsi/oauth2-auth";
import { ethers } from "ethers";
import ganache from "ganache-core";
import axios, { AxiosError, AxiosResponse } from "axios";
import { InternalServerError } from "@cef-ebsi/problem-details-errors";
import { BesuModule } from "./besu.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { BesuService } from "./besu.service";
import { BesuResponseObject } from "./besu.interface";
import { createFakeToken } from "../../../tests/utils/authorisation";

describe("Besu Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let ganacheServer: ganache.Server;
  let besuService: BesuService;
  let token: string;
  const ganachePort = 8546; // 8545 might already be used for ssh port forwarding
  const ganacheUrl = `http://127.0.0.1:${ganachePort}`;
  const mockAuth = jest.spyOn(Session.prototype, "verifyAccessToken");

  beforeAll(async () => {
    const options: ganache.IServerOptions = {};
    ganacheServer = ganache.server(options);
    await new Promise<void>((resolve) => {
      ganacheServer.listen(ganachePort, () => resolve());
    });

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BesuModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    besuService = moduleFixture.get<BesuService>(BesuService);

    jest
      .spyOn(besuService, "getBesuRpcNode")
      .mockImplementation(() => ganacheUrl);

    token = await createFakeToken();

    // mock library
    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> =>
        Promise.reject(
          new Error("Forgot to implement the mock for verifyAccessToken?")
        )
    );
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve, reject) =>
      ganacheServer.close((err) => {
        if (err) reject(err);
        else resolve();
      })
    );
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

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.reject(new Error("Mocked error"))
    );

    response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
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

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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
    expect.assertions(4);

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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

  it("should return an error when eth_sendRawTransaction is called without params", async () => {
    expect.assertions(2);

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

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
        code: -32000,
        data: expect.any(Object) as unknown,
        message:
          "Incorrect number of arguments. Method 'eth_sendRawTransaction' requires exactly 1 arguments. Request specified 0 arguments: [null].",
      },
    });
    expect(response.status).toBe(200);
  });

  it("should prevent deploying new smart contracts", async () => {
    expect.assertions(2);

    mockAuth.mockImplementation(
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
    };

    const sgnTx = await wallet.signTransaction(transaction);

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
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

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
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

    mockAuth.mockImplementation(
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
      .auth(token, { type: "bearer" })
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

  it("should handle internal errorr", async () => {
    expect.assertions(4);

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("error with connection");
    });

    jest
      .spyOn(besuService, "getBesuRpcNode")
      .mockImplementation(() => `${ganacheUrl}00`);

    const response1 = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: ["0x"],
        id: "42",
      });

    expect(response1.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error") as string,
      type: "about:blank",
    });
    expect(response1.status).toBe(500);

    jest.spyOn(axios, "post").mockImplementation(() => {
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "internal error",
      });
    });

    const response2 = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: "42",
      });

    expect(response2.body).toStrictEqual({
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error") as string,
      type: "about:blank",
    });
    expect(response2.status).toBe(500);
  });

  it("should return an error when Besu returns an error", async () => {
    expect.assertions(2);

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    jest.spyOn(axios, "post").mockImplementation(
      (): Promise<AxiosError<unknown>> => {
        const err = new Error("test error message");
        (err as AxiosError).config = {};
        (err as AxiosError).isAxiosError = true;
        (err as AxiosError).toJSON = () => ({});
        (err as AxiosError).response = {
          data: "Error message",
          status: 500,
          statusText: "Internal Error",
          config: {},
          headers: {},
        };

        return Promise.reject(err);
      }
    );

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
      title: "Internal Server Error",
      status: 500,
      detail: expect.stringContaining("internal error") as string,
      type: "about:blank",
    });
    expect(response.status).toBe(500);
  });

  it("should forward a valid (200) Besu error to the client", async () => {
    expect.assertions(2);

    mockAuth.mockImplementation(
      async (): Promise<JWTPayload> => Promise.resolve({ sub: "user" })
    );

    // Let's say Besu answers with
    jest.spyOn(axios, "post").mockImplementation(
      (): Promise<AxiosResponse<BesuResponseObject>> => {
        return Promise.resolve({
          data: {
            jsonrpc: "2.0",
            id: 1,
            error: {
              code: -32001,
              message: "Nonce too low",
            },
          },
          status: 200,
          statusText: "",
          headers: {},
          config: {},
        });
      }
    );

    const response = await request(server)
      .post("/blockchains/besu")
      .auth(token, { type: "bearer" })
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
