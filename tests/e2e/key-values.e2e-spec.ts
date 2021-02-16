import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, HttpServer, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import jsonwebtoken from "jsonwebtoken";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

jest.setTimeout(60000);

const BASE_URL = "/stores/distributed/key-values";

describe("Key-Values (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

  const key = `key-${crypto.randomBytes(16).toString("hex")}`;
  const value = `value-${crypto.randomBytes(16).toString("hex")}`;
  const did = "0x123";

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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await app.close();
  });

  describe(`PUT ${BASE_URL}/{key}`, () => {
    it("should throw an error if there's no JWT", async () => {
      expect.assertions(2);

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid or missing JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the JWT is invalid", async () => {
      expect.assertions(2);

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid or missing JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the JWT doesn't contain a DID", async () => {
      expect.assertions(2);

      const token = jsonwebtoken.sign({}, "secret", {
        audience: "storage-api",
        issuer: "authorization-api",
      });

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: DID is missing",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the payload is not a string", async () => {
      expect.assertions(2);

      const badValue = { value: 3 };

      const token = jsonwebtoken.sign(
        {
          did: "0x123",
        },
        "secret",
        {
          audience: "storage-api",
          issuer: "authorization-api",
        }
      );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        .type("json")
        .send(badValue);

      expect(response.body).toStrictEqual({
        detail: "Invalid value provided. Only strings are accepted.",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the expected key-value pair", async () => {
      expect.assertions(2);

      const token = jsonwebtoken.sign(
        {
          did,
        },
        "secret",
        {
          audience: "storage-api",
          issuer: "authorization-api",
        }
      );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        [key]: value,
      });
      expect(response.status).toBe(201);
    });

    it("should update the key-value pair", async () => {
      expect.assertions(2);

      const value2 = `value-${crypto.randomBytes(16).toString("hex")}`;

      const token = jsonwebtoken.sign(
        {
          did,
        },
        "secret",
        {
          audience: "storage-api",
          issuer: "authorization-api",
        }
      );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value2);

      expect(response.body).toStrictEqual({
        [key]: value2,
      });
      expect(response.status).toBe(200);
    });
  });
});
