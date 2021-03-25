import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import crypto from "crypto";
import base64url from "base64url";
import { FastifyInstance } from "fastify";
import jsonwebtoken from "jsonwebtoken";
import axios from "axios";
import { AttributesModule } from "./attributes.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";

interface JsonrpcCall {
  jsonrpc: "2.0";
  method: string;
  params: string[];
  id: string | number;
}

describe("Attributes Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  const mockAxios = jest.spyOn(axios, "post");

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
    // Mock Storage
    jest.spyOn(axios, "get").mockImplementation(() => {
      throw new Error("Please implement the mock for GET");
    });
    mockAxios.mockImplementation(() => {
      throw new Error("Please implement the mock for POST");
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AttributesModule],
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
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
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
      expect.assertions(6);

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
          data: "====abcdef",
        });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: JSON.stringify(["data must be base64url encoded"]),
      });
      expect(response.status).toBe(400);
    });

    it("should create an attribute", async () => {
      expect.assertions(4);

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const attribute = {
        storageUri: "http://localhost:3000",
        did,
        visibility: "private",
        contentType: "application/json+ld",
        data: base64url.encode("encrypted data"),
        dataLabel: "document",
        proof: {},
      };

      const response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);

      expect(mockAxios).toHaveBeenNthCalledWith(
        1,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select did from attribute_storage where hash = ? and did = ?",
              expect.any(String) as string,
              attribute.did,
            ],
          }),
        ]
      );

      expect(mockAxios).toHaveBeenNthCalledWith(
        2,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "insert into attribute_storage (hash, did, visibility, content_type, data, data_label) values (?, ?, ?, ?, ?, ?)",
              expect.any(String) as string,
              attribute.did,
              attribute.visibility,
              attribute.contentType,
              attribute.data,
              attribute.dataLabel,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        ...attribute,
        hash: expect.any(String) as string,
      });
      expect(response.status).toBe(201);
    });

    it("should update an attribute", async () => {
      expect.assertions(4);

      mockAxios.mockImplementation(async (url: string, data: JsonrpcCall) => {
        if (data.params[0].startsWith("select")) {
          return Promise.resolve({
            data: { result: { rows: ["existing attribute"] } },
          });
        }

        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const attribute = {
        storageUri: "http://localhost:3000",
        did,
        visibility: "private",
        contentType: "application/json+ld",
        data: base64url.encode("encrypted data"),
        dataLabel: "document",
        proof: {},
      };

      const response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);

      expect(mockAxios).toHaveBeenNthCalledWith(
        3,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select did from attribute_storage where hash = ? and did = ?",
              expect.any(String) as string,
              attribute.did,
            ],
          }),
        ]
      );

      expect(mockAxios).toHaveBeenNthCalledWith(
        4,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "update attribute_storage set visibility = ?, content_type = ?, data_label = ? where hash = ? and did = ?",
              attribute.visibility,
              attribute.contentType,
              attribute.dataLabel,
              expect.any(String) as string,
              attribute.did,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        ...attribute,
        hash: expect.any(String) as string,
      });
      expect(response.status).toBe(200);
    });
  });
});
