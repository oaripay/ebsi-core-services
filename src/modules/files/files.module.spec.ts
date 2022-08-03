import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyMultipart from "@fastify/multipart";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JWTVerifyResult } from "jose";
import { mapping, Client } from "cassandra-driver";
import { FilesModule } from "./files.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { AppUsageModel, FileModel } from "../cassandra/models";
import { FilesRepository } from "../cassandra/repositories";
import { CassandraService } from "../cassandra/cassandra.service";
import { fastifyMultipartConfig } from "../../config/server.config";
import { ApiConfig } from "../../config/configuration";
import { byteLength } from "../../shared/utils";

const BASE_URL = "/stores/distributed/files";

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

describe("Files Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let filesRepository: FilesRepository;
  let cassandraService: CassandraService;
  let configService: ConfigService<ApiConfig, true>;

  const mockedFileFind = jest.fn();
  const mockedFileInsert = jest.fn();
  const mockedFileUpdate = jest.fn();
  const mockedFileRemove = jest.fn();
  const mockedAppUsageFind = jest.fn();
  const mockedAppUsageInsert = jest.fn();
  const mockedAppUsageUpdate = jest.fn();
  const mockedAppUsageRemove = jest.fn();
  const mockedCassandraClientExecute = jest.fn();

  const did = `0x${crypto.randomBytes(16).toString("hex")}`;

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
          find: mockedFileFind,
          insert: mockedFileInsert,
          update: mockedFileUpdate,
          remove: mockedFileRemove,
        } as Partial<mapping.ModelMapper<FileModel>>;
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
      imports: [FilesModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        // By default, maxParamLength=100 but we allow hashs to be up to 256 bytes, thus we need to allow more chars
        // https://www.fastify.io/docs/latest/Server/#maxparamlength
        maxParamLength: 400,
        // By default, bodyLimit=1048576 (1MB)
        // https://www.fastify.io/docs/latest/Server/#bodylimit
        bodyLimit: 10 * 1024 * 1024,
      })
    );

    await app.register(fastifyMultipart, fastifyMultipartConfig);

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    filesRepository = moduleFixture.get<FilesRepository>(FilesRepository);
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

    it("should return the hash associated to the DID", async () => {
      expect.assertions(3);

      const rows: FileModel[] = [
        {
          hash: "0x0355a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b04555",
          did,
          metadata: "{}",
          data: crypto.randomBytes(255),
        },
        {
          hash: "0x4234a07b257bac3b223bd29b3bd3e24f5a53a84885d8bf36e278be0b45b044df",
          did,
          metadata: "{}",
          data: crypto.randomBytes(255),
        },
        {
          hash: "0xd2a69e5339bd87d7006400c4ab15dad9d8dee752142924fd0a0b637e7d2d63fe",
          did,
          metadata: "{}",
          data: crypto.randomBytes(255),
        },
      ];

      mockedCassandraClientExecute.mockImplementation(() => ({
        pageState: "abc",
        rows,
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

      expect(response.body).toStrictEqual({
        items: rows.map((row) => row.hash),
        links: {
          next: expect.stringMatching(
            /^https:\/\/api\.test\.intebsi\.xyz\/storage\/v3\/stores\/distributed\/files\?page\[after\]=.*&page\[size\]=10/
          ) as string,
        },
        pageSize: 10,
        self: "https://api.test.intebsi.xyz/storage/v3/stores/distributed/files?page[size]=10",
      });
      expect(response.status).toBe(200);
      expect(mockedCassandraClientExecute).toHaveBeenCalledWith(
        "select hash from file_storage where did = ?",
        [did],
        {
          fetchSize: 10,
          prepare: true,
          consistency: cassandraService.getConsistency().read,
        }
      );
    });
  });

  describe(`GET ${BASE_URL}/{hash}`, () => {
    it("should throw an error 400 when the hash is not hexadecimal", async () => {
      expect.assertions(2);

      const hash = "test";

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .get(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: '["hash must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a 404 when the hash doesn't exist", async () => {
      expect.assertions(3);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Simulate: the record can't be found
      mockedFileFind.mockImplementation(() => {
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
        .get(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the value corresponding to the hash", async () => {
      expect.assertions(4);

      const file = crypto.randomBytes(256);
      const metadata = JSON.stringify({
        test: "test",
      });
      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, metadata, data: file } as FileModel;
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
        .get(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect((response as { header: unknown[] }).header["content-type"]).toBe(
        "application/octet-stream"
      );
      expect(response.body).toStrictEqual(file);
      expect(response.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}/{hash}/metadata`, () => {
    it("should throw an error 400 when the hash is not hexadecimal", async () => {
      expect.assertions(2);

      const hash = "test";

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .get(`${BASE_URL}/${hash}/metadata`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: '["hash must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a 404 when the hash doesn't exist", async () => {
      expect.assertions(3);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Simulate: the record can't be found
      mockedFileFind.mockImplementation(() => {
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
        .get(`${BASE_URL}/${hash}/metadata`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the metadata corresponding to the hash", async () => {
      expect.assertions(3);

      const file = crypto.randomBytes(256);
      const rawMetadata = {
        test: "test",
      };
      const metadata = JSON.stringify(rawMetadata);
      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, metadata, data: file } as FileModel;
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
        .get(`${BASE_URL}/${hash}/metadata`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual(rawMetadata);
      expect(response.status).toBe(200);
    });

    it("should throw a 500 if the metadata is stored malformed", async () => {
      expect.assertions(3);

      const file = crypto.randomBytes(256);
      const metadata = "unparsable json";
      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, metadata, data: file } as FileModel;
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
        .get(`${BASE_URL}/${hash}/metadata`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual({
        detail:
          "There was an error while parsing the requested file's metadata.",
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });
  });

  describe(`POST ${BASE_URL}`, () => {
    it("should throw an error if there's no JWT", async () => {
      expect.assertions(2);

      const value = "value";

      const response = await request(server).post(`${BASE_URL}`).send(value);

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

      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.reject(new Error("error message"))
        );

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .send();

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

      jest.spyOn(SiopLib, "verifyJwtTar").mockImplementation(async () =>
        Promise.resolve({
          payload: {
            // Missing DID
          },
        } as JWTVerifyResult)
      );

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: missing sub",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the request is not multipart/form-data", async () => {
      expect.assertions(2);

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "This endpoint only accepts multipart/form-data requests",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if params (file, metadata) are missing", async () => {
      expect.assertions(4);

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      // Scenario #1: provide a file but no metadata
      const response1 = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .attach("file", crypto.randomBytes(256), "file.txt");

      expect(response1.body).toStrictEqual({
        detail: "'metadata' is missing",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      // Scenario #2: provide metadata but no file
      const response2 = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field("metadata", JSON.stringify({}));

      expect(response2.body).toStrictEqual({
        detail: "'file' is missing",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
    });

    it("should throw an error if the metadata is too long", async () => {
      expect.assertions(2);

      const userDefinedMetadata = {
        test: crypto.randomBytes(Math.floor(2.6 * 1024 * 1024)).toString("hex"), // this means ~5.2MiB payload, over 5MiB limit
      };

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field("metadata", JSON.stringify(userDefinedMetadata))
        .attach("file", crypto.randomBytes(256), "file.txt");

      // The metadata the server will register
      const finalMetadata = {
        ...userDefinedMetadata,
        filename: "file.txt",
        mimetype: "text/plain",
      };

      expect(response.body).toStrictEqual({
        detail: `Max size for 'metadata' is 5242880 bytes. Received ${byteLength(
          JSON.stringify(finalMetadata)
        )}`,
        status: 413,
        title: "Payload Too Large",
        type: "about:blank",
      });
      expect(response.status).toBe(413);
    });

    it("should throw an error if the file is too big", async () => {
      expect.assertions(2);

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field(
          "metadata",
          JSON.stringify({
            test: "test",
          })
        )
        .attach("file", crypto.randomBytes(6 * 1024 * 1024), "file.txt");

      expect(response.body).toStrictEqual({
        detail: "Max size for 'file' is 5242880 bytes. Received 6291456", // Capped by fastify's limit
        status: 413,
        title: "Payload Too Large",
        type: "about:blank",
      });
      expect(response.status).toBe(413);
    });

    it("should throw an error if the metadata is not a valid stringified JSON document", async () => {
      expect.assertions(2);

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field("metadata", "not a valid stringified document")
        .attach("file", crypto.randomBytes(255), "file.txt");

      expect(response.body).toStrictEqual({
        detail: "Invalid metadata. It must be a stringified JSON document.",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the file is already stored", async () => {
      expect.assertions(3);

      const file = crypto.randomBytes(256);
      const metadata = JSON.stringify({
        test: "test",
      });

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, data: file, metadata } as FileModel;
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
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file, "file.txt");

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual({
        detail: `This file is already stored (hash: ${hash})`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the app usage exceeds the limit", async () => {
      expect.assertions(4);

      const file = crypto.randomBytes(256);
      const metadata = JSON.stringify({
        test: "test",
      });

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can't be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return null;
          },
        });
      });

      // Simulate: the DID owner has stored some bytes already
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
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file, "file.txt");

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(response.body).toStrictEqual({
        detail: "App exceeds the allowed space of 1GB",
        status: 400,
        title: "Excessive app usage",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should store the file and metadata", async () => {
      expect.assertions(6);

      const file = crypto.randomBytes(256);
      const rawMetadata = {
        test: "test",
      };
      const metadata = JSON.stringify(rawMetadata);

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can't be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return null;
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
        .post(`${BASE_URL}`)
        .auth("jwt", { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file, "file.txt");

      const finalMetadata = JSON.stringify({
        ...rawMetadata,
        filename: "file.txt",
        mimetype: "text/plain",
      });

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedFileInsert).toHaveBeenCalledWith({
        did,
        hash,
        data: file,
        metadata: finalMetadata,
      });
      expect(mockedAppUsageUpdate).toHaveBeenCalledWith({
        did,
        numberBytes: `${1337 + byteLength(file) + byteLength(finalMetadata)}`,
      });
      expect(response.body).toStrictEqual({
        function: "sha3-256",
        hash,
      });
      expect(response.status).toBe(201);
    });
  });

  describe(`PATCH ${BASE_URL}/{hash}`, () => {
    it("should throw an error 400 when the hash is not hexadecimal", async () => {
      expect.assertions(2);

      const hash = "test";

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .patch(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send({});

      expect(response.body).toStrictEqual({
        detail: '["hash must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error 400 when the payload is not an array", async () => {
      expect.assertions(2);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .patch(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send({});

      expect(response.body).toStrictEqual({
        detail: "Validation failed (parsable array expected)",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error 400 when the patch payload is not valid", async () => {
      expect.assertions(2);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .patch(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send([
          {
            op: "unknown",
            // "path" <- missing
          },
        ]);

      expect(response.body).toStrictEqual({
        detail:
          '["op must match /add|remove|replace/ regular expression","path must match /^\\\\/metadata/ regular expression","path must be a string","path should not be empty"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a 400 when the content-type is not correctly set", async () => {
      expect.assertions(2);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .patch(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send([]);

      expect(response.body).toStrictEqual({
        detail:
          "The request's Content-Type must be 'application/json-patch+json'",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a 404 when the hash doesn't exist", async () => {
      expect.assertions(3);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Simulate: the record can't be found
      mockedFileFind.mockImplementation(() => {
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
        .patch(`${BASE_URL}/${hash}`)
        .type("application/json-patch+json")
        .auth("jwt", { type: "bearer" })
        .send([]);

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return 400 when the patch path is not is not valid", async () => {
      expect.assertions(2);

      const file = crypto.randomBytes(256);
      const storedMetadata = {
        test: "test",
        filename: "test.txt",
        mimetype: "text/plain",
      };
      const metadata = JSON.stringify(storedMetadata);

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, data: file, metadata } as FileModel;
          },
        });
      });

      const currentStorage = 42 * 1024 * 1024;

      // Simulate: the DID owner has stored some data already
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return {
              did,
              numberBytes: `${currentStorage}`,
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
        .patch(`${BASE_URL}/${hash}`)
        .type("application/json-patch+json")
        .auth("jwt", { type: "bearer" })
        .send([
          {
            op: "add",
            path: "/metadata/-///t+T*$",
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

    it("should throw an error if no app usage can be found", async () => {
      expect.assertions(4);

      const file = crypto.randomBytes(256);
      const storedMetadata = {
        test: "test",
        filename: "test.txt",
        mimetype: "text/plain",
      };
      const metadata = JSON.stringify(storedMetadata);

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, data: file, metadata } as FileModel;
          },
        });
      });

      // Simulate: the DID owner has not stored any data (which should not be possible...)
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
        .patch(`${BASE_URL}/${hash}`)
        .type("application/json-patch+json")
        .auth("jwt", { type: "bearer" })
        .send([
          {
            op: "add",
            path: "/metadata/new-prop",
            value: "new-value",
          },
        ]);

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 500,
        title: "Internal Server Error",
        type: "about:blank",
      });
      expect(response.status).toBe(500);
    });

    it("should throw an error when the max app size is reached", async () => {
      expect.assertions(4);

      const file = crypto.randomBytes(256);
      const storedMetadata = {
        test: "test",
        filename: "test.txt",
        mimetype: "text/plain",
      };
      const metadata = JSON.stringify(storedMetadata);

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, data: file, metadata } as FileModel;
          },
        });
      });

      const currentStorage = 1024 * 1024 * 1024 - 1; // almost full

      // Simulate: the DID owner has stored some data already
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return {
              did,
              numberBytes: `${currentStorage}`,
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
        .patch(`${BASE_URL}/${hash}`)
        .type("application/json-patch+json")
        .auth("jwt", { type: "bearer" })
        .send([
          {
            op: "add",
            path: "/metadata/new-prop",
            value: "new-value",
          },
        ]);

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(response.body).toStrictEqual({
        detail: "App exceeds the allowed space of 1GB",
        status: 400,
        title: "Excessive app usage",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the new metadata when the patch works", async () => {
      expect.assertions(6);

      const file = crypto.randomBytes(256);
      const storedMetadata = {
        test: "test",
        filename: "test.txt",
        mimetype: "text/plain",
      };
      const metadata = JSON.stringify(storedMetadata);

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, data: file, metadata } as FileModel;
          },
        });
      });

      const currentStorage = 42 * 1024 * 1024;

      // Simulate: the DID owner has stored some data already
      mockedAppUsageFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return {
              did,
              numberBytes: `${currentStorage}`,
            };
          },
        });
      });

      const expectedMetadata = {
        ...storedMetadata,
        "new-prop": "new-value",
      };
      const stringifiedExpectedMetadata = JSON.stringify(expectedMetadata);

      const updateFileMetadataSpy = jest
        .spyOn(filesRepository, "updateFileMetadata")
        .mockImplementationOnce(() => Promise.resolve());

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .patch(`${BASE_URL}/${hash}`)
        .type("application/json-patch+json")
        .auth("jwt", { type: "bearer" })
        .send([
          {
            op: "add",
            path: "/metadata/new-prop",
            value: "new-value",
          },
        ]);

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(updateFileMetadataSpy).toHaveBeenCalledWith({
        did,
        hash,
        data: file,
        metadata: stringifiedExpectedMetadata,
      });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedAppUsageUpdate).toHaveBeenCalledWith({
        did,
        numberBytes: `${
          currentStorage -
          byteLength(metadata) +
          byteLength(stringifiedExpectedMetadata)
        }`,
      });
      expect(response.body).toStrictEqual(expectedMetadata);
      expect(response.status).toBe(200);
    });
  });

  describe(`DELETE ${BASE_URL}/{hash}`, () => {
    it("should throw an error 400 when the hash is not hexadecimal", async () => {
      expect.assertions(2);

      const hash = "test";

      // Mock access token verification (return DID)
      jest
        .spyOn(SiopLib, "verifyJwtTar")
        .mockImplementation(async () =>
          Promise.resolve({ payload: { sub: did } } as JWTVerifyResult)
        );

      const response = await request(server)
        .delete(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: '["hash must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a 404 when the hash doesn't exist", async () => {
      expect.assertions(3);

      const hash = `0x${crypto.randomBytes(16).toString("hex")}`;

      // Simulate: the record can't be found
      mockedFileFind.mockImplementation(() => {
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
        .delete(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return 204 when the hash-value is removed", async () => {
      expect.assertions(6);

      const file = crypto.randomBytes(256);
      const metadata = JSON.stringify({
        test: "test",
      });

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file)
        .digest()
        .toString("hex")}`;

      // Simulate: the record can be found
      mockedFileFind.mockImplementation(() => {
        return Promise.resolve({
          first() {
            return { did, hash, data: file, metadata } as FileModel;
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
        .delete(`${BASE_URL}/${hash}`)
        .auth("jwt", { type: "bearer" })
        .send();

      expect(mockedFileFind).toHaveBeenCalledWith({ did, hash });
      expect(mockedFileRemove).toHaveBeenCalledWith({ did, hash });
      expect(mockedAppUsageFind).toHaveBeenCalledWith({ did });
      expect(mockedAppUsageUpdate).toHaveBeenCalledWith({
        did,
        numberBytes: `${
          42 * 1024 * 1024 - byteLength(file) - byteLength(metadata)
        }`,
      });
      expect(response.text).toBe("");
      expect(response.status).toBe(204);
    });
  });
});
