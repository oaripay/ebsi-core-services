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
import { byteLength } from "../../src/shared/utils";

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
  const file2 = crypto.randomBytes(256);
  const file3 = crypto.randomBytes(256);

  const metadata1 = {
    test: "value 1",
  };

  const hash1 = `0x${crypto
    .createHash("sha3-256")
    .update(file1)
    .digest()
    .toString("hex")}`;

  const hash2 = `0x${crypto
    .createHash("sha3-256")
    .update(file2)
    .digest()
    .toString("hex")}`;

  const hash3 = `0x${crypto
    .createHash("sha3-256")
    .update(file3)
    .digest()
    .toString("hex")}`;

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

      const userDefinedMetadata = {
        test: crypto.randomBytes(Math.floor(2.6 * 1024 * 1024)).toString("hex"), // this means ~5.2MiB payload, over 5MiB limit
      };

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
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

      const metadata = JSON.stringify(metadata1);

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file1, "file.txt");

      expect(response.body).toStrictEqual({
        function: "sha3-256",
        hash: hash1,
      });
      expect(response.status).toBe(201);
    });

    it("should throw an error if the file is already stored", async () => {
      expect.assertions(2);

      const metadata = JSON.stringify(metadata1);

      const response = await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file1, "file.txt");

      expect(response.body).toStrictEqual({
        detail: `This file is already stored (hash: ${hash1})`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe(`GET ${BASE_URL}`, () => {
    beforeAll(async () => {
      const metadata = JSON.stringify(metadata1);

      await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file2, "file.txt");

      await request(server)
        .post(`${BASE_URL}`)
        .auth(validToken, { type: "bearer" })
        .field("metadata", metadata)
        .attach("file", file3, "file.txt");
    });

    it("should return the hashs associated to the DID", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get(`${BASE_URL}?page[size]=12`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([hash1, hash2, hash3]) as string[],
        // there's no link to the next page
        links: {},
        pageSize: 12,
        self:
          "https://api.test.intebsi.xyz/storage/v2/stores/distributed/files?page[size]=12",
      });
      expect((response.body as { items: string[] }).items).toHaveLength(3);
      expect(response.status).toBe(200);
    });

    it("should be able to navigate to the next page", async () => {
      expect.assertions(6);

      const response = await request(server)
        .get(`${BASE_URL}?page[size]=2`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          expect.stringContaining("0x"),
        ]) as string[],
        links: {
          next: expect.stringMatching(
            /^https:\/\/api\.test\.intebsi\.xyz\/storage\/v2\/stores\/distributed\/files\?page\[after\]=.*&page\[size\]=2/
          ) as string,
        },
        pageSize: 2,
        self:
          "https://api.test.intebsi.xyz/storage/v2/stores/distributed/files?page[size]=2",
      });
      expect((response.body as { items: string[] }).items).toHaveLength(2);
      expect(response.status).toBe(200);

      const nextLink = new URL(
        (response.body as { links: { next: string } }).links.next
      );

      // Go to next page
      const nextPageUrl = `${BASE_URL}${nextLink.search}`;
      const nextPageResponse = await request(server)
        .get(nextPageUrl)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(nextPageResponse.body).toStrictEqual({
        items: expect.arrayContaining([
          expect.stringContaining("0x"),
        ]) as string[],
        links: {},
        pageSize: 2,
        self: expect.stringContaining(nextPageUrl) as string,
      });
      expect((response.body as { items: string[] }).items).toHaveLength(2);
      expect(nextPageResponse.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}/{hash}`, () => {
    it("should throw a 400 when the hash is malformed", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}/wrong-hash`)
        .auth(validToken, { type: "bearer" })
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
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}/0x${crypto.randomBytes(16).toString("hex")}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the file corresponding to the hash", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get(`${BASE_URL}/${hash1}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.text).toStrictEqual(file1.toString());
      expect((response as { header: unknown[] }).header).toStrictEqual(
        expect.objectContaining({
          "content-type": "text/plain",
          "content-disposition": "attachment; filename=file.txt",
          "content-length": `${byteLength(file1)}`,
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}/{hash}/metadata`, () => {
    it("should throw a 400 when the hash is malformed", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}/wrong-hash/metadata`)
        .auth(validToken, { type: "bearer" })
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
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}/0x${crypto.randomBytes(16).toString("hex")}/metadata`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "File not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the metadata corresponding to the hash", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}/${hash1}/metadata`)
        .auth(validToken, { type: "bearer" })
        .send();

      // The metadata also contains the mimetype and filename extracted from the upload request
      expect(response.body).toStrictEqual({
        filename: "file.txt",
        mimetype: "text/plain",
        ...metadata1,
      });
      expect(response.status).toBe(200);
    });
  });
});
