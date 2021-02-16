import request from "supertest";
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
import jsonwebtoken from "jsonwebtoken";
import { mapping } from "cassandra-driver";
import { KeyValuesModule } from "./key-values.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { KeyValueModel } from "./models/key-value.model";
import { lengthInBytes } from "../../shared/utils";

const BASE_URL = "/stores/distributed/key-values";

jest.mock("cassandra-driver");

describe("Key-Values Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  const mockedKeyValueFind = jest.fn();
  const mockedKeyValueInsert = jest.fn();
  const mockedKeyValueUpdate = jest.fn();
  const mockedAppUsageFind = jest.fn();
  const mockedAppUsageInsert = jest.fn();
  const mockedAppUsageUpdate = jest.fn();

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
          } as Partial<mapping.ModelMapper<KeyValueModel>>;
        }

        return {
          find: mockedKeyValueFind,
          insert: mockedKeyValueInsert,
          update: mockedKeyValueUpdate,
        } as Partial<mapping.ModelMapper<KeyValueModel>>;
      });

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [KeyValuesModule],
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
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

      const key = "test";
      const value = "value";

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

      const key = "test";
      const value = { value: 3 };

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
        .send(value);

      expect(response.body).toStrictEqual({
        detail: "Invalid value provided. Only strings are accepted.",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the expected key-value pair", async () => {
      expect.assertions(6);

      const key = "test";
      const value = "value";
      const did = "0x123";

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

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedKeyValueInsert).toHaveBeenCalledWith({ did, key, value });
      expect(mockedAppUsageInsert).toHaveBeenCalledWith({
        did,
        numberBytes: `${lengthInBytes(value)}`,
      });
      expect(response.body).toStrictEqual({ [key]: value });
      expect(response.status).toBe(201);
    });

    it("should update the key-value pair", async () => {
      expect.assertions(6);

      const key = "test"; // reuse the previous key
      const previousValue = "value";
      const value = "longer value"; // use a new value
      const did = "0x123";

      // Simulate: the record can be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, key, value: previousValue };
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

      expect(mockedKeyValueFind).toHaveBeenCalledWith({ did, key });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedKeyValueUpdate).toHaveBeenCalledWith({ did, key, value });
      expect(mockedAppUsageUpdate).toHaveBeenCalledWith({
        did,
        numberBytes: `${
          1337 + lengthInBytes(value) - lengthInBytes(previousValue)
        }`,
      });
      expect(response.body).toStrictEqual({ [key]: value });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the DID exceeds it space limit", async () => {
      expect.assertions(4);

      const key = "test"; // reuse the previous key
      const previousValue = "value";
      const value = "longer value"; // use a new value
      const did = "0x123";

      // Simulate: the record can be found
      mockedKeyValueFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, key, value: previousValue };
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
});
