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
import { loadConfig } from "../../config/configuration";
import { AttributeResponseObject } from "./attributes.interface";
import { encrypt } from "../../shared/utils";

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

  const { domain, apiUrlPrefix, storage, encryptionSecret } = loadConfig();
  const apiUrl = `${domain}${apiUrlPrefix}`;
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

  const createAttributeCassandra = () => ({
    did,
    visibility: "private",
    content_type: "application/json+ld",
    data: base64url.encode(crypto.randomBytes(15).toString("hex")),
    data_label: "document",
    hash: `0x${crypto.randomBytes(32).toString("hex")}`,
  });

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

  describe("GET /attributes", () => {
    it("should get attributes associated to the did", async () => {
      expect.assertions(4);

      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              pageState: "abc",
              rows: Array(2).fill(createAttributeCassandra()),
            },
          },
        })
      );

      const response = await request(server)
        .get("/attributes?page[size]=2")
        .auth(validToken, { type: "bearer" })
        .send();

      expect(mockAxios).toHaveBeenNthCalledWith(
        1,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where did = ? allow filtering",
              did,
              { fetchSize: 2 },
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/attributes?page[size]=2") as string,
        items: expect.arrayContaining([]) as AttributeResponseObject[],
        links: {
          next: expect.stringMatching(
            new RegExp(
              `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=2`
            )
          ) as string,
        },
        pageSize: 2,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items
      ).toHaveLength(2);
    });

    it("should get attributes associated to the did using page[after]", async () => {
      expect.assertions(8);

      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              pageState: "abc",
              rows: Array(2).fill(createAttributeCassandra()),
            },
          },
        })
      );

      let pageAfter = encrypt("123abc", encryptionSecret);
      let response = await request(server)
        .get(`/attributes?page[after]=${pageAfter}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(mockAxios).toHaveBeenNthCalledWith(
        2,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where did = ? allow filtering",
              did,
              { fetchSize: 10, pageState: "123abc" },
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        self: expect.stringMatching(
          new RegExp(
            `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`
          )
        ) as string,
        items: expect.arrayContaining([]) as AttributeResponseObject[],
        links: {
          next: expect.stringMatching(
            new RegExp(
              `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`
            )
          ) as string,
        },
        pageSize: 10,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items
      ).toHaveLength(2);

      // page for shared attributes
      pageAfter = encrypt("__shared__123abc", encryptionSecret);
      response = await request(server)
        .get(`/attributes?page[after]=${pageAfter}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(mockAxios).toHaveBeenNthCalledWith(
        3,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where shared_with = ? allow filtering",
              did,
              { fetchSize: 10, pageState: "123abc" },
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        self: expect.stringMatching(
          new RegExp(
            `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`
          )
        ) as string,
        items: expect.arrayContaining([]) as AttributeResponseObject[],
        links: {
          next: expect.stringMatching(
            new RegExp(
              `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`
            )
          ) as string,
        },
        pageSize: 10,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items
      ).toHaveLength(2);
    });
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
      expect.assertions(8);

      let response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send({});
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: JSON.stringify([
          `storageUri must be equal to ${storage}/stores/distributed`,
          "did must be a valid DID string",
          "contentType must be MIME type format",
          "data must be base64url encoded",
        ]),
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send({
          visibility: "???",
          sharedWith: "no did",
          dataLabel: 40,
          proof: "text",
        });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: JSON.stringify([
          `storageUri must be equal to ${storage}/stores/distributed`,
          "did must be a valid DID string",
          "visibility must be one of the following values: private, shared",
          "sharedWith must be a valid DID string",
          "contentType must be MIME type format",
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
          storageUri: `${storage}/stores/distributed`,
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
          storageUri: `${storage}/stores/distributed`,
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
        storageUri: `${storage}/stores/distributed`,
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
        4,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select did from attribute_storage where hash = ?",
              expect.any(String) as string,
            ],
          }),
        ]
      );

      expect(mockAxios).toHaveBeenNthCalledWith(
        5,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "insert into attribute_storage (hash, did, visibility, shared_with, content_type, data, data_label) values (?, ?, ?, ?, ?, ?, ?)",
              expect.any(String) as string,
              attribute.did,
              attribute.visibility,
              "",
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
            data: { result: { rows: [{ did: "did:owner" }] } },
          });
        }

        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const attribute = {
        storageUri: `${storage}/stores/distributed`,
        did,
        visibility: "shared",
        sharedWith: "did:ebsi:12245",
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
        6,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select did from attribute_storage where hash = ?",
              expect.any(String) as string,
            ],
          }),
        ]
      );

      expect(mockAxios).toHaveBeenNthCalledWith(
        7,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "update attribute_storage set visibility = ?, shared_with = ?, data_label = ?, content_type = ? where hash = ?",
              attribute.visibility,
              attribute.sharedWith,
              attribute.dataLabel,
              attribute.contentType,
              expect.any(String) as string,
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

  describe("DELETE /attributes", () => {
    it("should throw not found for delete attribute", async () => {
      expect.assertions(3);
      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(mockAxios).toHaveBeenNthCalledWith(
        8,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: ["select did from attribute_storage where hash = ?", hash],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        type: "about:blank",
        detail: `Attribute ${hash} not found`,
      });
      expect(response.status).toBe(404);
    });

    it("should throw forbidden", async () => {
      expect.assertions(3);
      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [{ did: "did:owner" }] } },
        });
      });

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(mockAxios).toHaveBeenNthCalledWith(
        9,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: ["select did from attribute_storage where hash = ?", hash],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
        detail: `${did} is not the owner of attribute ${hash}`,
      });
      expect(response.status).toBe(403);
    });

    it("should delete an attribute", async () => {
      expect.assertions(4);
      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      mockAxios.mockImplementation(async (url: string, data: JsonrpcCall) => {
        if (data.params[0].startsWith("select")) {
          return Promise.resolve({
            data: { result: { rows: [{ did }] } },
          });
        }

        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(mockAxios).toHaveBeenNthCalledWith(
        10,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: ["select did from attribute_storage where hash = ?", hash],
          }),
        ]
      );

      expect(mockAxios).toHaveBeenNthCalledWith(
        11,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: ["delete from attribute_storage where hash = ?", hash],
          }),
        ]
      );

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });
});
