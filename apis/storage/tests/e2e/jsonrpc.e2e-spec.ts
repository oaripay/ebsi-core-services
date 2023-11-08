import { beforeAll, afterAll, it, expect } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { AppModule } from "../../src/app.module.js";
import { fastifyAdapterConfig } from "../../src/config/server.config.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { requestOAuth2Jwt } from "../utils/index.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { getServer } from "../utils/getServer.js";

describeWriteOps()("Storage API v3 - JSON-RPC (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;

  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    // Generate a valid JWT for the tests
    accessToken = await requestOAuth2Jwt({
      trustedAppName: configService.get<string>("testAppName"),
      trustedAppPrivateKey: configService.get<string>("testAppPrivateKey"),
      configService,
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
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid token", async () => {
    expect.assertions(3);

    const response = await request(server)
      .post("/stores/distributed/jsonrpc")
      .auth(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        { type: "bearer" },
      )
      .send();

    let trustedAppsRegistryApiUrl = configService.get<string>(
      "trustedAppsRegistryApiUrl",
    );

    // Use TEST_LB_DOMAIN if defined
    if (configService.get<string>("testLoadBalancerDomain")) {
      trustedAppsRegistryApiUrl = trustedAppsRegistryApiUrl.replace(
        configService.get<string>("domain"),
        configService.get<string>("testLoadBalancerDomain"),
      );
    }

    expect(response.body).toStrictEqual({
      detail: `Invalid JWT: JWT with invalid kid. It should be hosted at ${trustedAppsRegistryApiUrl}/apps`,
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"],
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
          `property params has failed the following constraints: isValidCassandraCall`,
        ),
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
        result: expect.objectContaining({}),
      });
      expect(response.status).toBe(200);
    });
  });
});
