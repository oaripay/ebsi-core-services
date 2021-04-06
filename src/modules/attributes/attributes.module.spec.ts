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
import {
  AttributeCassandraModel,
  AttributeResponseObject,
} from "./attributes.interface";
import { encrypt, multihashEncode } from "../../shared/utils";

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
  let numberCall = 0;

  const { domain, apiUrlPrefix, storage, encryptionSecret } = loadConfig();
  const apiUrl = `${domain}${apiUrlPrefix}`;
  const did = `did:ebsi:0x${crypto.randomBytes(32).toString("hex")}`;
  const attributeData = base64url.encode(
    crypto.randomBytes(15).toString("hex")
  );
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

  const createAttributeCassandra = (): AttributeCassandraModel => ({
    did,
    visibility: "private",
    shared_with: "",
    content_type: "application/json+ld",
    data: attributeData,
    data_label: "document",
    hash: multihashEncode(
      crypto
        .createHash("sha3-256")
        .update(`${attributeData}${did}`)
        .digest("hex"),
      "sha3-256"
    ),
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

  describe("GET /attribute/{hash}", () => {
    it("should return attribute not found", async () => {
      expect.assertions(3);

      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [],
            },
          },
        })
      );

      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server)
        .get(`/attributes/${hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: ["select * from attribute_storage where hash = ?", hash],
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

    it("should return forbidden", async () => {
      expect.assertions(6);

      const attributeCassandra = createAttributeCassandra();
      attributeCassandra.did = "did:ebsi:different_owner";
      attributeCassandra.visibility = "shared";
      attributeCassandra.shared_with = "did:ebsi:shared_with_other";
      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [attributeCassandra],
            },
          },
        })
      );

      let response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
      });
      expect(response.status).toBe(403);

      attributeCassandra.visibility = "shared";
      attributeCassandra.shared_with = "did:ebsi:shared_with_other";
      response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
      });
      expect(response.status).toBe(403);
    });

    it("should get a specific attribute associated to the did", async () => {
      expect.assertions(3);

      const attributeCassandra = createAttributeCassandra();
      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [attributeCassandra],
            },
          },
        })
      );

      const response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storage}/stores/distributed`,
        hash: attributeCassandra.hash,
        did: attributeCassandra.did,
        sharedWith: attributeCassandra.shared_with,
        visibility: attributeCassandra.visibility,
        contentType: attributeCassandra.content_type,
        data: attributeCassandra.data,
        dataLabel: attributeCassandra.data_label,
      });
      expect(response.status).toBe(200);
    });

    it("should get a shared attribute", async () => {
      expect.assertions(6);

      // shared with everyone and no token authentication
      const attributeCassandra = createAttributeCassandra();
      attributeCassandra.did = "did:ebsi:different_owner";
      attributeCassandra.visibility = "shared";
      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [attributeCassandra],
            },
          },
        })
      );

      let response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        // no token authentication
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storage}/stores/distributed`,
        hash: attributeCassandra.hash,
        did: attributeCassandra.did,
        visibility: attributeCassandra.visibility,
        sharedWith: attributeCassandra.shared_with,
        contentType: attributeCassandra.content_type,
        data: attributeCassandra.data,
        dataLabel: attributeCassandra.data_label,
      });
      expect(response.status).toBe(200);

      // shared with the user
      attributeCassandra.shared_with = did;
      response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storage}/stores/distributed`,
        hash: attributeCassandra.hash,
        did: attributeCassandra.did,
        visibility: attributeCassandra.visibility,
        sharedWith: attributeCassandra.shared_with,
        contentType: attributeCassandra.content_type,
        data: attributeCassandra.data,
        dataLabel: attributeCassandra.data_label,
      });
      expect(response.status).toBe(200);
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
      expect.assertions(11);

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

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [{ did: "did:owner" }] } },
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

      response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: "Attribute already exist",
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
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

  describe("PATCH /attributes", () => {
    it("should reject bad requests", async () => {
      expect.assertions(10);

      let response = await request(server)
        .patch("/attributes/123456789")
        .auth(validToken, { type: "bearer" })
        .send([
          { op: "replace", path: "/storageUri", value: "https://example.com" },
        ]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["path must match /^(\\\\/visibility)|(\\\\/sharedWith)|(\\\\/contentType)|(\\\\/dataLabel)$/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/123456789")
        .auth(validToken, { type: "bearer" })
        .send([{ op: "replace", path: "/did", value: "did:ebsi:123" }]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["path must match /^(\\\\/visibility)|(\\\\/sharedWith)|(\\\\/contentType)|(\\\\/dataLabel)$/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/123456789")
        .auth(validToken, { type: "bearer" })
        .send([{ op: "replace", path: "/data", value: "xfeGevej" }]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["path must match /^(\\\\/visibility)|(\\\\/sharedWith)|(\\\\/contentType)|(\\\\/dataLabel)$/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/123456789")
        .auth(validToken, { type: "bearer" })
        .send([{ op: "unknown-op", path: "/visibility", value: "shared" }]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["op must match /add|remove|replace/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/0x123456789")
        .auth(validToken, { type: "bearer" })
        .send([
          { op: "replace", path: "/visibility", value: "invalid-visibility" },
        ]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: "visibility must be 'private', 'shared', or ''",
      });
      expect(response.status).toBe(400);
    });

    it("should reject not found", async () => {
      expect.assertions(3);
      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .patch("/attributes/123456789")
        .auth(validToken, { type: "bearer" })
        .send([{ op: "replace", path: "/visibility", value: "shared" }]);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              expect.any(String) as string,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        type: "about:blank",
        detail: "Attribute 123456789 not found",
      });
      expect(response.status).toBe(404);
    });

    it("should reject forbidden", async () => {
      expect.assertions(3);

      const attributeCassandra = createAttributeCassandra();
      attributeCassandra.did = "did:ebsi:different_owner";

      mockAxios.mockImplementation(async (url: string, data: JsonrpcCall) => {
        if (data.params[0].startsWith("select")) {
          return Promise.resolve({
            data: { result: { rows: [attributeCassandra] } },
          });
        }

        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .patch("/attributes/123456789")
        .auth(validToken, { type: "bearer" })
        .send([{ op: "replace", path: "/visibility", value: "shared" }]);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              expect.any(String) as string,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
        detail: `${did} is not the owner of attribute 123456789`,
      });
      expect(response.status).toBe(403);
    });

    it("should patch an attribute", async () => {
      expect.assertions(4);

      const attributeCassandra = createAttributeCassandra();
      mockAxios.mockImplementation(async (url: string, data: JsonrpcCall) => {
        if (data.params[0].startsWith("select")) {
          return Promise.resolve({
            data: { result: { rows: [attributeCassandra] } },
          });
        }

        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .patch(`/attributes/${attributeCassandra.hash}`)
        .auth(validToken, { type: "bearer" })
        .send([
          { op: "replace", path: "/visibility", value: "shared" },
          { op: "replace", path: "/contentType", value: "application/json" },
          { op: "replace", path: "/sharedWith", value: "did:ebsi:1234" },
          { op: "replace", path: "/dataLabel", value: "document2" },
        ]);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "select * from attribute_storage where hash = ?",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        ...[
          expect.stringContaining("/distributed/jsonrpc"),
          expect.objectContaining({
            id: expect.any(Number) as number,
            jsonrpc: "2.0",
            method: "cassandra_call",
            params: [
              "update attribute_storage set visibility = ?, shared_with = ?, content_type = ?, data_label = ? where hash = ?",
              "shared",
              "did:ebsi:1234",
              "application/json",
              "document2",
              attributeCassandra.hash,
            ],
          }),
        ]
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storage}/stores/distributed`,
        hash: attributeCassandra.hash,
        did: attributeCassandra.did,
        visibility: "shared",
        sharedWith: "did:ebsi:1234",
        contentType: "application/json",
        data: attributeCassandra.data,
        dataLabel: "document2",
      });
      expect(response.status).toBe(200);
    });
  });
});
