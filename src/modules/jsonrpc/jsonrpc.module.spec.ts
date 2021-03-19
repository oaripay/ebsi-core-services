import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer, Logger } from "@nestjs/common";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Client, types } from "cassandra-driver";
import { JsonRpcModule } from "./jsonrpc.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { CassandraService } from "../cassandra/cassandra.service";

jest.mock("cassandra-driver");

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let mockCassandra: jest.SpyInstance;
  let cassandraService: CassandraService;

  beforeAll(async () => {
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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    cassandraService = moduleFixture.get<CassandraService>(CassandraService);
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
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
    expect.assertions(2);

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
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
  });

  describe.each([
    [
      "insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?",
      "7d504817-e570-4939-8931-973500f25b34",
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
      "7d504817-e570-4939-8931-973500f25b34",
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
      "0xaed15s2ed21258a2624d2a55de452faed15s2ed21258a2624d2a55de452f5412",
      "did:ebsi:0xe08BbfED79c5D66b723086E9D28d70C0d12c9DB8",
    ],
    [
      "delete from attribute_storage where hash = ? and did = ?",
      "0xaed15s2ed21258a2624d2a55de452faed15s2ed21258a2624d2a55de452f5412",
      "did:ebsi:0x14ec91AC9FFa3499bC6a418fc0A5B5531D1a20E3",
    ],
  ])("calling %j", (...args) => {
    it("should proxy a call to cassandra", async () => {
      expect.assertions(3);
      const response = await request(server)
        .post("/stores/distributed/jsonrpc")
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
      expect(mockCassandra).toHaveBeenCalledWith(query, params, options);
    });
  });
});
