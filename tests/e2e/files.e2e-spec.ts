import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import fastifyMultipart from "fastify-multipart";
import { Logger } from "@nestjs/common/services/logger.service";
import jsonwebtoken from "jsonwebtoken";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  fastifyAdapterConfig,
  fastifyMultipartConfig,
} from "../../src/config/server.config";

jest.setTimeout(60000);

const BASE_URL = "/stores/distributed/files";

describe("Files (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  const did = `0x${crypto.randomBytes(32).toString("hex")}`;
  const validToken = jsonwebtoken.sign(
    {
      did,
    },
    "secret",
    {
      audience: "storage-api",
      issuer: "authorization-api",
    }
  );

  const file1 = crypto.randomBytes(256);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig)
    );

    await app.register(fastifyMultipart, fastifyMultipartConfig);

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

      const response = await request(server).post(`${BASE_URL}`).send();

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
        .post(`${BASE_URL}`)
        .auth(token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: DID is missing",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should throw an error if the request is not multipart/form-data", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
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

      // Scenario #1: provide a file but no metadata
      const response1 = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
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
        .auth(validToken, { type: "bearer" })
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

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field(
          "metadata",
          JSON.stringify({
            test: `0x${crypto.randomBytes(3 * 1024 * 1024).toString("hex")}`, // this means ~6MiB payload, over 5MiB limit
          })
        )
        .attach("file", crypto.randomBytes(256), "file.txt");

      expect(response.body).toStrictEqual({
        detail: "Max size for 'metadata' is 5242880 bytes. Received 6291456", // Capped by fastify's limit
        status: 413,
        title: "Payload Too Large",
        type: "about:blank",
      });
      expect(response.status).toBe(413);
    });

    it("should throw an error if the file is too big", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
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

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
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

    it("should store the file and metadata", async () => {
      expect.assertions(2);

      const metadata = JSON.stringify({
        test: "test",
      });

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file1)
        .digest()
        .toString("hex")}`;

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file1, "file.txt");

      expect(response.body).toStrictEqual({
        function: "sha3-256",
        hash,
      });
      expect(response.status).toBe(201);
    });

    it("should throw an error if the file is already stored", async () => {
      expect.assertions(2);

      const metadata = JSON.stringify({
        test: "test",
      });

      // Compute SHA3-256 hash of the file data
      const hash = `0x${crypto
        .createHash("sha3-256")
        .update(file1)
        .digest()
        .toString("hex")}`;

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file1, "file.txt");

      expect(response.body).toStrictEqual({
        detail: `This file is already stored (hash: ${hash})`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });
});
