import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import base64url from "base64url";
import jsonwebtoken from "jsonwebtoken";
import { Logger } from "@nestjs/common/services/logger.service";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

jest.setTimeout(60000);

describe("Attributes", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  const did = `did:ebsi:0x${crypto.randomBytes(32).toString("hex")}`;
  const validToken = jsonwebtoken.sign(
    {
      did,
    },
    "secret",
    {
      audience: "proxy-data-hub-api",
      issuer: "authorisation-api",
    }
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  describe("POST /attributes", () => {
    it("should reject unauthorized requests", async () => {
      expect.assertions(2);

      const response = await request(server).post("/attributes").send({});
      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        status: 401,
        type: "about:blank",
        detail: "Invalid or missing JWT",
      });
      expect(response.status).toBe(401);
    });

    it("should reject bad requests", async () => {
      expect.assertions(4);

      let response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send({});
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: JSON.stringify([
          "storageUri must be a string",
          "did must be a valid DID string",
          "visibility must be one of the following values: private, shared",
          "contentType must be a string",
          "data must be base64url encoded",
          "dataLabel must be a string",
          "proof must be an object",
        ]),
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send({
          storageUri: "http://localhost:3000",
          did,
          visibility: "private",
          contentType: "application/json+ld",
          dataLabel: "document",
          proof: {},
          data: "???",
        });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: JSON.stringify(["data must be base64url encoded"]),
      });
      expect(response.status).toBe(400);
    });

    it("should create and update an attribute", async () => {
      expect.assertions(4);

      const attribute = {
        storageUri: "http://localhost:3000",
        did,
        visibility: "private",
        contentType: "application/json+ld",
        data: base64url.encode("encrypted data"),
        dataLabel: "document",
        proof: {},
      };

      let response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);

      expect(response.body).toStrictEqual({
        ...attribute,
        hash: expect.any(String) as string,
      });
      expect(response.status).toBe(201);

      const { hash } = response.body as { hash: string };

      const attribute2 = {
        storageUri: "http://localhost:3000",
        did,
        visibility: "shared",
        contentType: "application/json+ld",
        data: base64url.encode("encrypted data"),
        dataLabel: "document2",
        proof: {},
      };

      response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute2);

      expect(response.body).toStrictEqual({
        ...attribute2,
        hash,
      });
      expect(response.status).toBe(200);
    });
  });
});
