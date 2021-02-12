import request from "supertest";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
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
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { AppModule } from "../../src/app.module";

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

  const notificationId: string = uuidv4();
  const attributeId: string = uuidv4();
  const didUser = `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`;

  const queries = [
    [
      "insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?",
      notificationId,
      `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`,
      didUser,
      '{"schemaId":"...", "payload": "...", ...}',
      86400,
    ],
    [
      "select * from notification_storage where receiver = ? allow filtering",
      didUser,
    ],
    ["delete from notification_storage where id = ?", notificationId],
    [
      "insert into attribute_storage (id, did, hash, data) values (?, ?, ?, ?)",
      attributeId,
      didUser,
      `0x${crypto.randomBytes(32).toString("hex")}`,
      "anVsaWFuIGdvbnphbGV6... (encrypted data)",
    ],
    ["select * from attribute_storage where did = ? allow filtering", didUser],
    ["delete from attribute_storage where id = ?", attributeId],
  ];

  describe.each(queries)("calling %j", (...args) => {
    it("should proxy a call to cassandra", async () => {
      expect.assertions(2);
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
        result: expect.objectContaining({}) as unknown,
      });
      expect(response.status).toBe(200);
    });
  });
});
