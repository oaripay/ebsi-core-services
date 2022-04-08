import request from "supertest";
import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { AppModule } from "../../src/app.module";
import { fastifyAdapterConfig } from "../../src/config/server.config";
import { ApiConfig } from "../../src/config/configuration";
import { requestOAuth2Jwt } from "../utils";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

describeWriteOps()("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig>;

  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig)
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    server = getServer(app, configService);

    // Generate a valid JWT for the tests
    accessToken = await requestOAuth2Jwt({
      trustedAppName: configService.get<string>("testAppName"),
      trustedAppPrivateKey: configService.get<string>("testAppPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      trustedAppsRegistryApiUrl: configService.get<string>(
        "trustedAppsRegistryApiUrl"
      ),
    });
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
    expect.assertions(3);

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        { type: "bearer" }
      )
      .send();

    expect(response.body).toStrictEqual({
      detail: `Invalid JWT: JWT with invalid kid. It should be hosted at ${configService.get<string>(
        "trustedAppsRegistryApiUrl"
      )}/apps`,
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth(accessToken, { type: "bearer" })
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
      .auth(accessToken, { type: "bearer" })
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

  const attributeHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const didUser = `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`;
  const notificationPayload = {
    schemaId: "...",
    payload: crypto.randomBytes(32).toString("hex"),
  };
  const notificationMessage = JSON.stringify(notificationPayload);
  const notificationId = `0x${crypto
    .createHash("sha3-256")
    .update(notificationMessage)
    .digest("hex")}`;

  const queries = [
    [
      "insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?",
      notificationId,
      `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`,
      didUser,
      notificationMessage,
      86400,
    ],
    [
      "select * from notification_storage where receiver = ? allow filtering",
      didUser,
    ],
    ["delete from notification_storage where id = ?", notificationId],
    [
      "insert into attribute_storage (hash, did, visibility, content_type, data, data_label) values (?, ?, ?, ?, ?, ?)",
      attributeHash,
      didUser,
      "private",
      "application/ld+json",
      "anVsaWFuIGdvbnphbGV6... (encrypted data)",
      "document",
    ],
    ["select * from attribute_storage where did = ? allow filtering", didUser],
    [
      "select * from attribute_storage where shared_with = ? allow filtering",
      didUser,
    ],
    [
      "select * from attribute_storage where did = ? allow filtering",
      didUser,
      { fetchSize: 50 },
    ],
    ["delete from attribute_storage where hash = ?", attributeHash],
  ];

  describeWriteOps().each(queries)("calling %j", (...args) => {
    it("should proxy a call to cassandra", async () => {
      expect.assertions(2);
      const response = await request(server)
        .post("/stores/distributed/jsonrpc")
        .auth(accessToken, { type: "bearer" })
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
