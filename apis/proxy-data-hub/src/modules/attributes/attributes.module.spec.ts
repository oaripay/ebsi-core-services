import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import crypto from "node:crypto";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { base64url } from "multiformats/bases/base64";
import type { JWTVerifyResult } from "jose";
import * as SiopLib from "@cef-ebsi/siop-auth";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import jsonwebtoken from "jsonwebtoken";
import type { RawServerDefault } from "fastify";
import { encrypt, multihashEncode2 } from "@ebsiint-api/shared";
import axios from "axios";
import { AttributesModule } from "./attributes.module.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import type { ApiConfig } from "../../config/configuration.js";
import {
  AttributeCassandraModel,
  AttributeResponseObject,
} from "./attributes.interface.js";

vi.mock("@cef-ebsi/siop-auth", async () => {
  const mod = await vi.importActual<typeof import("@cef-ebsi/siop-auth")>(
    "@cef-ebsi/siop-auth",
  );
  // Return a mocked version so we can redefine property `verifyJwtTar` later
  return {
    ...mod,
    verifyJwtTar: vi.fn(),
  };
});

vi.mock("@cef-ebsi/oauth2-auth", async () => {
  const mod = await vi.importActual<typeof import("@cef-ebsi/oauth2-auth")>(
    "@cef-ebsi/oauth2-auth",
  );
  // Return a mocked version so we can redefine property `verifyJwtTar` later
  return {
    ...mod,
    verifyJwtTar: vi.fn(),
  };
});

interface JsonrpcCall {
  jsonrpc: "2.0";
  method: string;
  params: string[];
  id: string | number;
}

describe("Attributes Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let configService: ConfigService<ApiConfig, true>;
  const mockAxios = vi.spyOn(axios, "post");

  const accessTokenApi = jsonwebtoken.sign({}, "secret", {
    audience: "proxy-data-hub-api",
    issuer: "authorisation-api",
    expiresIn: 3600,
  });

  const headerJwt = {
    headers: {
      Authorization: `Bearer ${accessTokenApi}`,
    },
    timeout: expect.any(Number),
  };

  const testUser = {
    token: "user",
    did: EbsiWallet.createDid(),
  };
  const testFakeUser = {
    token: "fake user",
    did: EbsiWallet.createDid(),
  };

  let domain: string;
  let apiUrlPrefix: string;
  let storageApiUrl: string;
  let encryptionSecret: string;
  let apiUrl: string;

  const attributeData = base64url.baseEncode(crypto.randomBytes(15));

  const createAttributeCassandra = (): AttributeCassandraModel => ({
    did: testUser.did,
    visibility: "private",
    shared_with: "",
    content_type: "application/json+ld",
    data: attributeData,
    data_label: "document",
    hash: multihashEncode2(
      crypto
        .createHash("sha3-256")
        .update(`${attributeData}${testUser.did}`)
        .digest("hex"),
      "sha3-256",
    ),
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AttributesModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    domain = configService.get("domain");
    apiUrlPrefix = configService.get("apiUrlPrefix");
    storageApiUrl = configService.get("storageApiUrl");
    encryptionSecret = configService.get("encryptionSecret");
    apiUrl = `${domain}${apiUrlPrefix}`;
  });

  beforeEach(() => {
    // Mock Storage
    vi.spyOn(axios, "get").mockImplementation(() => {
      throw new Error("Please implement the mock for GET");
    });
    mockAxios.mockImplementation(() => {
      throw new Error("Please implement the mock for POST");
    });

    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (token: string): Promise<JWTVerifyResult> => {
        if (token === testUser.token) {
          return Promise.resolve({
            payload: { sub: testUser.did },
          } as unknown as JWTVerifyResult);
        }

        return Promise.reject(new Error("verifyAccessToken failed"));
      },
    );

    vi.spyOn(OAuth2Lib.Agent.prototype, "verifyAkeResponse").mockImplementation(
      async () => Promise.resolve(accessTokenApi),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /attributes", () => {
    it("should get attributes associated to the did", async () => {
      expect.assertions(5);
      let numberCall = 0;

      mockAxios.mockImplementation(async (url) => {
        if (url.includes("/oauth2-sessions"))
          return Promise.resolve({ data: {} });
        return Promise.resolve({
          data: {
            result: {
              pageState: "abc",
              rows: Array(2).fill(createAttributeCassandra()),
            },
          },
        });
      });

      const response = await request(server)
        .get("/attributes?page[size]=2")
        .auth(testUser.token, { type: "bearer" })
        .send();

      // expect proxy-data-hub-api creates a new session on auth api
      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/oauth2-sessions"),
        expect.objectContaining({}),
        {
          timeout: expect.any(Number),
        },
      );

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where did = ? allow filtering",
            testUser.did,
            { fetchSize: 2 },
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/attributes?page[size]=2"),
        items: expect.arrayContaining([]),
        links: {
          next: expect.stringMatching(
            new RegExp(
              `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=2`,
            ),
          ),
        },
        pageSize: 2,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items,
      ).toHaveLength(2);
    });

    it("should get attributes associated to the did using page[after]", async () => {
      expect.assertions(8);
      let numberCall = 0;

      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              pageState: "abc",
              rows: Array(2).fill(createAttributeCassandra()),
            },
          },
        }),
      );

      let pageAfter = encrypt("123abc", encryptionSecret);
      let response = await request(server)
        .get(`/attributes?page[after]=${pageAfter}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where did = ? allow filtering",
            testUser.did,
            { fetchSize: 10, pageState: "123abc" },
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringMatching(
          new RegExp(
            `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`,
          ),
        ),
        items: expect.arrayContaining([]),
        links: {
          next: expect.stringMatching(
            new RegExp(
              `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`,
            ),
          ),
        },
        pageSize: 10,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items,
      ).toHaveLength(2);

      // page for shared attributes
      pageAfter = encrypt("__shared__123abc", encryptionSecret);
      response = await request(server)
        .get(`/attributes?page[after]=${pageAfter}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where shared_with = ? allow filtering",
            testUser.did,
            { fetchSize: 10, pageState: "123abc" },
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        self: expect.stringMatching(
          new RegExp(
            `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`,
          ),
        ),
        items: expect.arrayContaining([]),
        links: {
          next: expect.stringMatching(
            new RegExp(
              `^${apiUrl}/attributes\\?page\\[after\\]=.*&page\\[size\\]=10`,
            ),
          ),
        },
        pageSize: 10,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items,
      ).toHaveLength(2);
    });
  });

  describe("GET /attribute/{hash}", () => {
    it("should return attribute not found", async () => {
      expect.assertions(3);
      let numberCall = 0;

      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [],
            },
          },
        }),
      );

      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server)
        .get(`/attributes/${hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: ["select * from attribute_storage where hash = ?", hash],
        }),
        headerJwt,
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
      let numberCall = 0;
      const differentOwner = EbsiWallet.createDid();
      const shareWithOther = EbsiWallet.createDid();
      const attributeCassandra = createAttributeCassandra();
      attributeCassandra.did = differentOwner;
      attributeCassandra.visibility = "shared";
      attributeCassandra.shared_with = shareWithOther;
      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [attributeCassandra],
            },
          },
        }),
      );

      let response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
      });
      expect(response.status).toBe(403);

      attributeCassandra.visibility = "shared";
      attributeCassandra.shared_with = shareWithOther;
      response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
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
      let numberCall = 0;

      const attributeCassandra = createAttributeCassandra();
      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [attributeCassandra],
            },
          },
        }),
      );

      const response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storageApiUrl}/stores/distributed`,
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
      let numberCall = 0;

      // shared with everyone and no token authentication
      const attributeCassandra = createAttributeCassandra();
      attributeCassandra.did = "did:ebsi:zub5ZZUfHLLptCduwEy8xRj";
      attributeCassandra.visibility = "shared";
      mockAxios.mockImplementation(async () =>
        Promise.resolve({
          data: {
            result: {
              rows: [attributeCassandra],
            },
          },
        }),
      );

      let response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        // no token authentication
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storageApiUrl}/stores/distributed`,
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
      attributeCassandra.shared_with = testUser.did;
      response = await request(server)
        .get(`/attributes/${attributeCassandra.hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storageApiUrl}/stores/distributed`,
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
      expect.assertions(4);

      let response = await request(server).post("/attributes").send({});
      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        status: 401,
        type: "about:blank",
        detail: "Missing JWT",
      });
      expect(response.status).toBe(401);

      response = await request(server)
        .post("/attributes")
        .auth(testFakeUser.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        status: 401,
        type: "about:blank",
        detail: "verifyAccessToken failed",
      });
      expect(response.status).toBe(401);
    });

    it("should reject bad requests", async () => {
      expect.assertions(11);
      let numberCall = 0;

      let response = await request(server)
        .post("/attributes")
        .auth(testUser.token, { type: "bearer" })
        .send({});
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: JSON.stringify([
          `storageUri must be equal to ${storageApiUrl}/stores/distributed`,
          "did must be a valid DID string",
          "contentType must be MIME type format",
          "data must be base64url encoded",
        ]),
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/attributes")
        .auth(testUser.token, { type: "bearer" })
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
          `storageUri must be equal to ${storageApiUrl}/stores/distributed`,
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
        .auth(testUser.token, { type: "bearer" })
        .send({
          storageUri: `${storageApiUrl}/stores/distributed`,
          did: testUser.did,
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
        .auth(testUser.token, { type: "bearer" })
        .send({
          storageUri: `${storageApiUrl}/stores/distributed`,
          did: testUser.did,
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
        storageUri: `${storageApiUrl}/stores/distributed`,
        did: testUser.did,
        visibility: "shared",
        sharedWith: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
        contentType: "application/json+ld",
        data: base64url.baseEncode(Buffer.from("encrypted data")),
        dataLabel: "document",
        proof: {},
      };

      response = await request(server)
        .post("/attributes")
        .auth(testUser.token, { type: "bearer" })
        .send(attribute);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select did from attribute_storage where hash = ?",
            expect.any(String),
          ],
        }),
        headerJwt,
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
      let numberCall = 0;

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const attribute = {
        storageUri: `${storageApiUrl}/stores/distributed`,
        did: testUser.did,
        visibility: "private",
        contentType: "application/json+ld",
        data: base64url.baseEncode(Buffer.from("encrypted data")),
        dataLabel: "document",
        proof: {},
      };

      const response = await request(server)
        .post("/attributes")
        .auth(testUser.token, { type: "bearer" })
        .send(attribute);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select did from attribute_storage where hash = ?",
            expect.any(String),
          ],
        }),
        headerJwt,
      );

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "insert into attribute_storage (hash, did, visibility, shared_with, content_type, data, data_label) values (?, ?, ?, ?, ?, ?, ?)",
            expect.any(String),
            attribute.did,
            attribute.visibility,
            "",
            attribute.contentType,
            attribute.data,
            attribute.dataLabel,
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        ...attribute,
        hash: expect.any(String),
      });
      expect(response.status).toBe(201);
    });
  });

  describe("DELETE /attributes", () => {
    it("should throw not found for delete attribute", async () => {
      expect.assertions(3);
      let numberCall = 0;

      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: ["select did from attribute_storage where hash = ?", hash],
        }),
        headerJwt,
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
      let numberCall = 0;

      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [{ did: "did:owner" }] } },
        });
      });

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: ["select did from attribute_storage where hash = ?", hash],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
        detail: `${testUser.did} is not the owner of attribute ${hash}`,
      });
      expect(response.status).toBe(403);
    });

    it("should delete an attribute", async () => {
      expect.assertions(4);
      let numberCall = 0;

      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      mockAxios.mockImplementation(async (_url: string, data: unknown) => {
        if ((data as JsonrpcCall).params[0]!.startsWith("select")) {
          return Promise.resolve({
            data: { result: { rows: [{ did: testUser.did }] } },
          });
        }

        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(testUser.token, { type: "bearer" })
        .send();

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: ["select did from attribute_storage where hash = ?", hash],
        }),
        headerJwt,
      );

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: ["delete from attribute_storage where hash = ?", hash],
        }),
        headerJwt,
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
        .auth(testUser.token, { type: "bearer" })
        .send([
          { op: "replace", path: "/storageUri", value: "https://example.com" },
        ]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["path must match /^\\\\/(?:visibility|sharedWith|contentType|dataLabel)/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/123456789")
        .auth(testUser.token, { type: "bearer" })
        .send([
          {
            op: "replace",
            path: "/did",
            value: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
          },
        ]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["path must match /^\\\\/(?:visibility|sharedWith|contentType|dataLabel)/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/123456789")
        .auth(testUser.token, { type: "bearer" })
        .send([{ op: "replace", path: "/data", value: "xfeGevej" }]);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: `["path must match /^\\\\/(?:visibility|sharedWith|contentType|dataLabel)/ regular expression"]`,
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .patch("/attributes/123456789")
        .auth(testUser.token, { type: "bearer" })
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
        .auth(testUser.token, { type: "bearer" })
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
      let numberCall = 0;

      mockAxios.mockImplementation(async () => {
        return Promise.resolve({
          data: { result: { rows: [] } },
        });
      });

      const response = await request(server)
        .patch("/attributes/123456789")
        .auth(testUser.token, { type: "bearer" })
        .send([{ op: "replace", path: "/visibility", value: "shared" }]);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            expect.any(String),
          ],
        }),
        headerJwt,
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
      let numberCall = 0;

      const attributeCassandra = createAttributeCassandra();
      attributeCassandra.did = "did:ebsi:zub5ZZUfHLLptCduwEy8xRj";

      mockAxios.mockImplementation(async (_url: string, data: unknown) => {
        if ((data as JsonrpcCall).params[0]!.startsWith("select")) {
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
        .auth(testUser.token, { type: "bearer" })
        .send([{ op: "replace", path: "/visibility", value: "shared" }]);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            expect.any(String),
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        title: "Forbidden",
        status: 403,
        type: "about:blank",
        detail: `${testUser.did} is not the owner of attribute 123456789`,
      });
      expect(response.status).toBe(403);
    });

    it("should return 400 when the patch path is not is not valid", async () => {
      const attributeCassandra = createAttributeCassandra();
      mockAxios.mockImplementation(async (_url: string, data: unknown) => {
        if ((data as JsonrpcCall).params[0]!.startsWith("select")) {
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
        .auth(testUser.token, { type: "bearer" })
        .send([
          {
            op: "add",
            path: "/visibility/-///t+T*$",
            value: 42,
          },
        ]);

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        type: "about:blank",
        detail: "patch operation is not valid",
      });
      expect(response.status).toBe(400);
    });

    it("should patch an attribute", async () => {
      expect.assertions(4);
      let numberCall = 0;

      const attributeCassandra = createAttributeCassandra();
      mockAxios.mockImplementation(async (_url: string, data: unknown) => {
        if ((data as JsonrpcCall).params[0]!.startsWith("select")) {
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
        .auth(testUser.token, { type: "bearer" })
        .send([
          { op: "replace", path: "/visibility", value: "shared" },
          { op: "replace", path: "/contentType", value: "application/json" },
          {
            op: "replace",
            path: "/sharedWith",
            value: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
          },
          { op: "replace", path: "/dataLabel", value: "document2" },
        ]);

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "select * from attribute_storage where hash = ?",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
      );

      numberCall += 1;
      expect(mockAxios).toHaveBeenNthCalledWith(
        numberCall,
        expect.stringContaining("/distributed/jsonrpc"),
        expect.objectContaining({
          id: expect.any(Number),
          jsonrpc: "2.0",
          method: "cassandra_call",
          params: [
            "update attribute_storage set visibility = ?, shared_with = ?, content_type = ?, data_label = ? where hash = ?",
            "shared",
            "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
            "application/json",
            "document2",
            attributeCassandra.hash,
          ],
        }),
        headerJwt,
      );

      expect(response.body).toStrictEqual({
        storageUri: `${storageApiUrl}/stores/distributed`,
        hash: attributeCassandra.hash,
        did: attributeCassandra.did,
        visibility: "shared",
        sharedWith: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
        contentType: "application/json",
        data: attributeCassandra.data,
        dataLabel: "document2",
      });
      expect(response.status).toBe(200);
    });
  });
});
