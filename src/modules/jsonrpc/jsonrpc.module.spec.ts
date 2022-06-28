import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import axios from "axios";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import type { JwtTarVefifyResult } from "@cef-ebsi/oauth2-auth";
import { Client, types } from "cassandra-driver";
import { JsonRpcModule } from "./jsonrpc.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { CassandraService } from "../cassandra/cassandra.service";
import { ApiConfig } from "../../config/configuration";
import { AuthService } from "../auth/auth.service";

jest.mock("cassandra-driver");

jest.mock("@cef-ebsi/oauth2-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/oauth2-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let mockCassandra: jest.SpyInstance;
  let cassandraService: CassandraService;
  let configService: ConfigService<ApiConfig, true>;
  let authService: AuthService;

  beforeAll(async () => {
    // Prevent leaking tests (they should not be able to call axios.get)
    jest.spyOn(axios, "get").mockImplementation((url: string) => {
      throw new Error(`Leaking unit test: trying to GET ${url}`);
    });

    // Mock Cassandra
    mockCassandra = jest.spyOn(Client.prototype, "execute");
    mockCassandra.mockImplementation(() => {
      return {
        rows: [],
        pageState: null,
      } as types.ResultSet;
    });

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    cassandraService = moduleFixture.get<CassandraService>(CassandraService);
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should reject a POST without JWT", async () => {
    expect.assertions(3);

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .send();

    expect(response.body).toStrictEqual({
      detail: "Invalid or missing JWT",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid token", async () => {
    expect.assertions(4);

    const verifyAccessTokenSpy = jest
      .spyOn(OAuth2Lib, "verifyJwtTar")
      .mockImplementation(async () =>
        Promise.reject(new Error("error message"))
      );

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth("jwt", { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail: "Invalid JWT: error message",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith("jwt", {
      op: configService.get<string>("authorisationApiName"),
      trustedAppsRegistry: `${configService.get<string>(
        "trustedAppsRegistryApiUrl"
      )}/apps`,
    });
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    // Mock access token verification
    jest
      .spyOn(OAuth2Lib, "verifyJwtTar")
      .mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JwtTarVefifyResult)
      );

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth("jwt", { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail:
        '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when the parameters of callCassandra are invalid", async () => {
    expect.assertions(4);

    // Mock access token verification
    jest
      .spyOn(authService, "validateOAuth2Token")
      .mockImplementation(async () => Promise.resolve({ name: "app" }));

    let response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth("jwt", { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "cassandra_call",
        params: ["drop table"],
        id: "45",
      });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: expect.stringContaining(
          `property params has failed the following constraints: isValidCassandraCall`
        ) as string,
      },
    });
    expect(response.status).toBe(400);

    response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth("jwt", { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "cassandra_call",
        params: [
          "select * from table where name = ?",
          { fetchSize: 4 },
          "alice",
        ],
        id: "45",
      });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: expect.stringContaining(
          `property params has failed the following constraints: isValidCassandraCall`
        ) as string,
      },
    });
    expect(response.status).toBe(400);
  });

  describe.each([
    [
      "insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?",
      "0x1a04db115c5c5e429c8d45a297a2c4590bf60c97995332ccee1ff1f25a220c02",
      "did:ebsi:0x14ec91AC9FFa3499bC6a418fc0A5B5531D1a20E3",
      "did:ebsi:0xe08BbfED79c5D66b723086E9D28d70C0d12c9DB8",
      '{"schemaId":"...", "payload": "...", ...}',
      86400,
    ],
    [
      "select * from notification_storage where receiver = ? allow filtering",
      "did:ebsi:0xe08BbfED79c5D66b723086E9D28d70C0d12c9DB8",
    ],
    [
      "delete from notification_storage where id = ?",
      "0x1a04db115c5c5e429c8d45a297a2c4590bf60c97995332ccee1ff1f25a220c02",
    ],
    [
      "insert into attribute_storage (hash, did, visibility, content_type, data, data_label) values (?, ?, ?, ?, ?, ?)",
      "0xaed15s2ed21258a2624d2a55de452faed15s2ed21258a2624d2a55de452f5412",
      "did:ebsi:0x14ec91AC9FFa3499bC6a418fc0A5B5531D1a20E3",
      "private",
      "application/ld+json",
      "anVsaWFuIGdvbnphbGV6... (encrypted data)",
      "document",
    ],
    [
      "select * from attribute_storage where did = ? allow filtering",
      "did:ebsi:0xe08BbfED79c5D66b723086E9D28d70C0d12c9DB8",
    ],
    [
      "select * from attribute_storage where shared_with = ? allow filtering",
      "did:ebsi:0xe08BbfED79c5D66b723086E9D28d70C0d12c9DB8",
    ],
    [
      "select * from attribute_storage where did = ? allow filtering",
      "did:ebsi:0xe08BbfED79c5D66b723086E9D28d70C0d12c9DB8",
      { fetchSize: 50, pageState: "0123456789abcdef" },
    ],
    [
      "delete from attribute_storage where hash = ?",
      "0xaed15s2ed21258a2624d2a55de452faed15s2ed21258a2624d2a55de452f5412",
    ],
  ])("calling %j", (...args) => {
    it("should proxy a call to cassandra", async () => {
      expect.assertions(3);

      // Mock access token verification
      jest
        .spyOn(authService, "validateOAuth2Token")
        .mockImplementation(async () => Promise.resolve({ name: "app" }));

      const response = await request(server)
        .post("/stores/distributed/jsonrpc")
        .auth("jwt", { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: args,
          id: "45",
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        result: {
          rows: [],
          pageState: null,
        },
      });
      expect(response.status).toBe(200);

      const [query, ...params] = args;
      const options = {
        consistency: query.startsWith("select")
          ? cassandraService.getConsistency().read
          : cassandraService.getConsistency().write,
        prepare: true,
      };
      if (params.length > 0 && typeof params[params.length - 1] === "object") {
        Object.assign(options, params.pop());
      }
      expect(mockCassandra).toHaveBeenCalledWith(query, params, options);
    });
  });
});
