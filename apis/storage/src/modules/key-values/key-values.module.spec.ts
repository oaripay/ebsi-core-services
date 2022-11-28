import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import axios from "axios";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JWTVerifyResult } from "jose";
import { byteLength } from "@ebsiint-api/shared";
import { mapping, Client } from "cassandra-driver";
import { KeyValuesModule } from "./key-values.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { AppUsageModel, KeyValueModel } from "../cassandra/models";
import { CassandraService } from "../cassandra/cassandra.service";
import { ApiConfig } from "../../config/configuration";

const BASE_URL = "/stores/distributed/key-values";

jest.mock("cassandra-driver");

jest.mock("@cef-ebsi/siop-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/siop-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

describe("Key-Values Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let cassandraService: CassandraService;
  let configService: ConfigService<ApiConfig, true>;

  const mockedKeyValueFind = jest.fn();
  const mockedKeyValueInsert = jest.fn();
  const mockedKeyValueUpdate = jest.fn();
  const mockedKeyValueRemove = jest.fn();
  const mockedAppUsageFind = jest.fn();
  const mockedAppUsageInsert = jest.fn();
  const mockedAppUsageUpdate = jest.fn();
  const mockedAppUsageRemove = jest.fn();
  const mockedCassandraClientExecute = jest.fn();

  const did = `0x${crypto.randomBytes(32).toString("hex")}`;

  beforeAll(async () => {
    jest
      .spyOn(mapping.Mapper.prototype, "forModel")
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore: it's not perfectly mocked, but it's good enough
      .mockImplementation((modelName: string) => {
        if (modelName === "AppUsage") {
          return {
            find: mockedAppUsageFind,
            insert: mockedAppUsageInsert,
            update: mockedAppUsageUpdate,
            remove: mockedAppUsageRemove,
          } as Partial<mapping.ModelMapper<AppUsageModel>>;
        }

        return {
          find: mockedKeyValueFind,
          insert: mockedKeyValueInsert,
          update: mockedKeyValueUpdate,
          remove: mockedKeyValueRemove,
        } as Partial<mapping.ModelMapper<KeyValueModel>>;
      });

    jest
      .spyOn(Client.prototype, "execute")
      .mockImplementation(mockedCassandraClientExecute);

    // Prevent leaking tests (they should not be able to call axios.get)
    jest.spyOn(axios, "get").mockImplementation((url: string) => {
      throw new Error(`Leaking unit test: trying to GET ${url}`);
    });

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [KeyValuesModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        // By default, maxParamLength=100 but we allow keys to be up to 256 bytes, thus we need to allow more chars
        // https://www.fastify.io/docs/latest/Server/#maxparamlength
        maxParamLength: 400,
        // By default, bodyLimit=1048576 (1MB)
        // https://www.fastify.io/docs/latest/Server/#bodylimit
        bodyLimit: 10 * 1024 * 1024,
      })
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    cassandraService = moduleFixture.get<CassandraService>(CassandraService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe(`GET ${BASE_URL}`, () => {
    it("should reject a request without a JWT", async () => {
      expect.assertions(3);

      const response = await request(server).get(`${BASE_URL}`).send();

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

    it("should reject an invalid token", async () => {
      expect.assertions(4);

      const verifyAccessTokenSpy = jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.reject(new Error("error message"))
        );

      const response = await request(server)
        .get(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: error message",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
      expect(verifyAccessTokenSpy).toHaveBeenCalledWith("jwt", {
        audience: "ebsi-core-services",
        trustedAppsRegistry: `${configService.get<string>(
          "trustedAppsRegistryApiUrl"
        )}/apps`,
        timeout: expect.any(Number) as number,
      });
    });

    it("should reject a token without a DID", async () => {
      expect.assertions(4);

      const verifyAccessTokenSpy = jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({
            payload: {
              // Missing "sub"
            },
          } as JWTVerifyResult)
        );

      const response = await request(server)
        .get(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: missing sub",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
      expect(verifyAccessTokenSpy).toHaveBeenCalledWith("jwt", {
        audience: "ebsi-core-services",
        trustedAppsRegistry: `${configService.get<string>(
          "trustedAppsRegistryApiUrl"
        )}/apps`,
        timeout: expect.any(Number) as number,
      });
    });

    it("should return the keys associated to the DID", async () => {
      expect.assertions(3);

      mockedCassandraClientExecute.mockImplementation(() => ({
        pageState: "abc",
        rows: [
          { key: "key1", did, value: "value1" },
          { key: "key2", did, value: "value2" },
          { key: "key3", did, value: "value3" },
        ],
      }));

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .get(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedCassandraClientExecute).toHaveBeenCalledWith(
        "select key from key_value_storage where did = ?",
        [did],
        {
          fetchSize: 10,
          prepare: true,
          consistency: cassandraService.getConsistency().read,
        }
      );
      expect(response.body).toStrictEqual({
        items: ["key1", "key2", "key3"],
        links: {
          next: expect.stringMatching(
            /\/stores\/distributed\/key-values\?page\[after\]=.*&page\[size\]=10/
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          "/stores/distributed/key-values?page[size]=10"
        ) as string,
      });
      expect(response.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}/{key}`, () => {
    // We already check the JWT in `PUT ${BASE_URL}/{key}`, no need to repeat these tests here
    it("should throw a 404 when the key doesn't exist", async () => {
      expect.assertions(3);

      const key = "test";

      // Simulate: the record can't be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return null;
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .get(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(response.body).toStrictEqual({
        detail: "Key not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the value corresponding to the key", async () => {
      expect.assertions(3);

      const key = "test";
      const value = "value";

      // Simulate: the record can be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, key, value } as KeyValueModel;
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .get(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(response.text).toStrictEqual(value);
      expect(response.status).toBe(200);
    });
  });

  describe(`PUT ${BASE_URL}/{key}`, () => {
    it("should throw an error if there's no JWT", async () => {
      expect.assertions(2);

      const key = "test";
      const value = "value";

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

      const key = "test";
      const value = "value";

      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.reject(new Error("error message"))
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: error message",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the JWT doesn't contain a DID", async () => {
      expect.assertions(2);

      const key = "test";
      const value = "value";

      jest.spyOn(SiopLib, "verifyJwtTar").mockImplementation(async () =>
        Promise.resolve({
          payload: {
            // Missing "did"
          },
        } as JWTVerifyResult)
      );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: missing sub",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the payload is not a string", async () => {
      expect.assertions(2);

      const key = "test";
      const value = { value: 3 };

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .type("json")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid value provided. Only strings are accepted.",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error 400 if the key is too long", async () => {
      expect.assertions(2);

      const key = crypto.randomBytes(129).toString("hex"); // 129 * 2 = 258 > 256
      const value = "value";

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: '["key\'s byte length must fall into (1, 256) range"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error 404 if the key exceeds the server's limit of 400 chars", async () => {
      expect.assertions(2);

      const key = crypto.randomBytes(201).toString("hex"); // 201 * 2 = 402 > 400 that we've set in FastifyAdapter
      const value = "value";

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      // This is fastify's response
      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          "Cannot PUT /stores/distributed/key-values/"
        ) as string,
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error 413 if the payload exceeds the defined limit of 5 MiB", async () => {
      expect.assertions(2);

      const key = "key";
      const value = crypto.randomBytes(3 * 1024 * 1024).toString("hex"); // 6MiB > 5MiB

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          "Max size for 'value' is 5242880 bytes. Received "
        ) as string,
        status: 413,
        title: "Payload Too Large",
        type: "about:blank",
      });
      expect(response.status).toBe(413);
    });

    it("should throw an error 500 if the payload exceeds the server's limit", async () => {
      expect.assertions(2);

      const key = "key";
      const value = crypto.randomBytes(6 * 1024 * 1024).toString("hex"); // 12MiB > 10MiB that we've set in FastifyAdapter

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      // This is fastify's response
      expect(response.body).toStrictEqual({
        detail:
          "The server encountered an internal error and was unable to complete your request",
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should return the expected key-value pair", async () => {
      expect.assertions(6);

      const key = "test";
      const value = "value";

      // Simulate: the record can't be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return null;
          },
        });
      });

      // Simulate: this is the first record for DID
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return null;
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedKeyValueInsert).toHaveBeenCalledWith({ did, key, value });
      expect(mockedAppUsageInsert).toHaveBeenCalledWith({
        did,
        numberBytes: `${byteLength(value)}`,
      });
      expect(response.body).toStrictEqual({ [key]: value });
      expect(response.status).toBe(201);
    });

    it("should update the key-value pair", async () => {
      expect.assertions(6);

      const key = "test"; // reuse the previous key
      const previousValue = "value";
      const value = "longer value"; // use a new value

      // Simulate: the record can be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, key, value: previousValue } as KeyValueModel;
          },
        });
      });

      // Simulate: the DID owner has stored some bytes already
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return {
              did,
              numberBytes: "1337",
            };
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedKeyValueUpdate).toHaveBeenCalledWith({ did, key, value });
      expect(mockedAppUsageUpdate).toHaveBeenCalledWith({
        did,
        numberBytes: `${1337 + byteLength(value) - byteLength(previousValue)}`,
      });
      expect(response.body).toStrictEqual({ [key]: value });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the DID exceeds it space limit", async () => {
      expect.assertions(4);

      const key = "test"; // reuse the previous key
      const previousValue = "value";
      const value = "longer value"; // use a new value

      // Simulate: the record can be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, key, value: previousValue } as KeyValueModel;
          },
        });
      });

      // Simulate: the DID owner has stored almost 1GB already
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return {
              did,
              numberBytes: `${1024 * 1024 * 1024 - 1}`,
            };
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        // because superagent automatically serializes the value sent
        // e.g. "value" -> "\"value\"", when the content-type is json or form
        // we use "text/plain" to avoid serialization
        .type("text/plain")
        .send(value);

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(response.body).toStrictEqual({
        detail: "App exceeds the allowed space of 1GB",
        status: 400,
        title: "Excessive app usage",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe(`DELETE ${BASE_URL}/{key}`, () => {
    // We already check the JWT in `PUT ${BASE_URL}/{key}`, no need to repeat these tests here
    it("should throw a 404 when the key doesn't exist", async () => {
      expect.assertions(3);

      const key = "test";

      // Simulate: the record can't be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return null;
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .delete(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(response.body).toStrictEqual({
        detail: "Key not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return 204 when the key-value is removed", async () => {
      expect.assertions(6);

      const key = "test";
      const value = "value";

      // Simulate: the record can be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, key, value } as KeyValueModel;
          },
        });
      });

      // Simulate: the DID owner has stored some data already
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return {
              did,
              numberBytes: `${42 * 1024 * 1024}`,
            };
          },
        });
      });

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .delete(`${BASE_URL}/${key}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(mockedKeyValueRemove).toHaveBeenCalledWith({ did, key });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedAppUsageUpdate).toHaveBeenCalledWith({
        did,
        numberBytes: `${42 * 1024 * 1024 - byteLength(value)}`,
      });
      expect(response.text).toBe("");
      expect(response.status).toBe(204);
    });
  });
});
