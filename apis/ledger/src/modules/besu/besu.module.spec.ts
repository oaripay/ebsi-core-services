import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import type { JsonRpcServer } from "hardhat/types";
// eslint-disable-next-line import/extensions
import * as taskNames from "hardhat/builtin-tasks/task-names.js";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import * as OAuth2lib from "@cef-ebsi/oauth2-auth";
import type { JwtTarVerifyResult } from "@cef-ebsi/oauth2-auth";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ethers } from "ethers";
import { BesuModule } from "./besu.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { BesuService } from "./besu.service.js";
import { createFakeToken } from "../../../tests/utils/authorisation.js";
import type { ApiConfig } from "../../config/configuration.js";

vi.mock("@cef-ebsi/oauth2-auth", () => ({
  verifyJwtTar: vi.fn(),
}));

describe("Besu Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let hardhatServer: JsonRpcServer;
  let besuService: BesuService;
  let tokenOAuth2: string;
  let tokenSiop: string;
  let configService: ConfigService<ApiConfig, true>;
  const ganachePort = 8547; // 8546 might already be used for ssh port forwarding

  const mockAuthOAuth2 = vi.spyOn(OAuth2lib, "verifyJwtTar");

  describe.each([
    `http://127.0.0.1:${ganachePort}`,
    `ws://127.0.0.1:${ganachePort}`,
  ])("connecting to %s", (ganacheUrl: string) => {
    beforeAll(async () => {
      hardhatServer = (await hre.run(taskNames.TASK_NODE_CREATE_SERVER, {
        hostname: "127.0.0.1",
        port: ganachePort,
        provider: hre.network.provider,
      })) as JsonRpcServer;

      await hardhatServer.listen();

      // Start server
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [BesuModule],
      }).compile();

      app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );

      // Turn off logger
      Logger.overrideLogger(false);

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);
      app.useGlobalFilters(new AllExceptionsFilter(configService));
      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      server = app.getHttpServer();

      besuService = moduleFixture.get<BesuService>(BesuService);

      tokenOAuth2 = await createFakeToken({
        loginHint: "oauth2",
        authorisationApiName: "authorisation-api",
        testAppName: "test-app",
        useKidAuthApi: false,
        configService,
      });
      tokenSiop = await createFakeToken({
        loginHint: "did_siop",
        authorisationApiName: "authorisation-api",
        testUserDid: EbsiWallet.createDid(),
        useKidAuthApi: false,
        configService,
      });
    });

    beforeEach(() => {
      vi.spyOn(besuService, "getBesuRpcNode").mockImplementation(
        () => ganacheUrl,
      );

      // mock libraries
      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.reject(
            new Error(
              "Forgot to implement the mock for OAuth2 verifyAccessToken?",
            ),
          ),
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
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
        async (): Promise<JwtTarVerifyResult> =>
          Promise.reject(new Error("Mocked error")),
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
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
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
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
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

      const response = await request(server).post("/blockchains/besu").send({
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
        expect.stringContaining("application/json"),
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
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
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
          data: {
            message: "Expected exactly 1 arguments and got 0",
          },
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

    it("should prevent deploying new smart contracts", async () => {
      expect.assertions(2);

      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
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
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
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
          "Error parsing the transaction: Invalid serialized tx input. Must be array",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an error if the transaction params doesn't use the correct chainId (eth_sendRawTransaction)", async () => {
      expect.assertions(2);

      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
      );

      let provider: ethers.providers.JsonRpcProvider;

      if (ganacheUrl.startsWith("http")) {
        provider = new ethers.providers.JsonRpcProvider(ganacheUrl);
      } else {
        provider = new ethers.providers.WebSocketProvider(ganacheUrl);
      }

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

    it("should handle internal error (fails to retrieve chainId)", async () => {
      expect.assertions(3);

      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
      );

      // Fails to retrieve chainId
      const spy = vi
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
        detail: expect.stringContaining("internal error"),
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should return an error when Besu returns an error", async () => {
      expect.assertions(2);

      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
      );

      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error("unknown error");
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
        detail: expect.stringContaining("internal error"),
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should return an error when Besu returns an error that is not parseable", async () => {
      expect.assertions(2);

      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
      );

      // Let's say Besu answers with an error
      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error();

        // @ts-expect-error Property 'response' does not exist on type 'Error'.ts(2339)
        err.response = { unparseable: "response" };
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
        detail: expect.stringContaining("internal error"),
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should forward a valid (200) Besu error to the client", async () => {
      expect.assertions(2);

      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({ payload: { sub: "user" } } as JwtTarVerifyResult),
      );

      // Let's say Besu answers with an error
      vi.spyOn(besuService, "send").mockImplementation(() => {
        const err = new Error();

        // @ts-expect-error Property 'response' does not exist on type 'Error'.ts(2339)
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
});
