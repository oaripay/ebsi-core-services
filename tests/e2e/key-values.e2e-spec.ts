import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, HttpServer, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import jsonwebtoken from "jsonwebtoken";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

jest.setTimeout(60000);

const BASE_URL = "/stores/distributed/key-values";

describe("Key-Values (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

  const key = `key-${crypto.randomBytes(16).toString("hex")}`;
  const key2 = `key-${crypto.randomBytes(16).toString("hex")}`;
  const key3 = `key-${crypto.randomBytes(16).toString("hex")}`;
  const value = `value-${crypto.randomBytes(16).toString("hex")}`;
  const value2 = `value-${crypto.randomBytes(16).toString("hex")}`;
  const did = "0x123";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
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

  describe(`PUT ${BASE_URL}/{key}`, () => {
    it("should throw an error if there's no JWT", async () => {
      expect.assertions(2);

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

      const badValue = { value: 3 };

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
        .send(badValue);

      expect(response.body).toStrictEqual({
        detail: "Invalid value provided. Only strings are accepted.",
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the expected key-value pair", async () => {
      expect.assertions(2);

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

      expect(response.body).toStrictEqual({
        [key]: value,
      });
      expect(response.status).toBe(201);
    });

    it("should update the key-value pair", async () => {
      expect.assertions(2);

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
        .send(value2);

      expect(response.body).toStrictEqual({
        [key]: value2,
      });
      expect(response.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}`, () => {
    beforeAll(async () => {
      // Insert 2 more key-values for the next tests
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

      await request(server)
        .put(`${BASE_URL}/${key2}`)
        .auth(token, { type: "bearer" })
        .type("text/plain")
        .send(value);

      await request(server)
        .put(`${BASE_URL}/${key3}`)
        .auth(token, { type: "bearer" })
        .type("text/plain")
        .send(value);
    });

    it("should return the keys associated to the DID", async () => {
      expect.assertions(3);

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
        .get(`${BASE_URL}?page[size]=2`)
        .auth(token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          expect.stringContaining("key-"),
        ]) as string[],
        links: {
          next: expect.stringMatching(
            /^https:\/\/api\.test\.intebsi\.xyz\/storage\/v2\/stores\/distributed\/key-values\?page\[after\]=.*&page\[size\]=2/
          ) as string,
        },
        pageSize: 2,
        self:
          "https://api.test.intebsi.xyz/storage/v2/stores/distributed/key-values?page[size]=2",
      });
      expect((response.body as { items: string[] }).items).toHaveLength(2);
      expect(response.status).toBe(200);
    });

    it("should be able to navigate to the next page", async () => {
      expect.assertions(2);

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
        .get(`${BASE_URL}?page[size]=2`)
        .auth(token, { type: "bearer" })
        .send();

      const nextLink = new URL(
        (response.body as { links: { next: string } }).links.next
      );

      // Go to next page
      const nextPageUrl = `${BASE_URL}${nextLink.search}`;
      const nextPageResponse = await request(server)
        .get(nextPageUrl)
        .auth(token, { type: "bearer" })
        .send();

      expect(nextPageResponse.body).toStrictEqual({
        items: expect.arrayContaining([
          expect.stringContaining("key-"),
        ]) as string[],
        links: expect.anything() as unknown,
        pageSize: 2,
        self: expect.stringContaining(nextPageUrl) as string,
      });
      expect(nextPageResponse.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}/{key}`, () => {
    it("should throw a 404 when the key doesn't exist", async () => {
      expect.assertions(2);

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
        .get(`${BASE_URL}/wrong-key`)
        .auth(token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Key not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return the value corresponding to the key", async () => {
      expect.assertions(2);

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
        .get(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        .send();

      expect(response.text).toStrictEqual(value2);
      expect(response.status).toBe(200);
    });
  });

  describe(`DELETE ${BASE_URL}/{key}`, () => {
    it("should throw a 404 when the key doesn't exist", async () => {
      expect.assertions(2);

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
        .delete(`${BASE_URL}/wrong-key`)
        .auth(token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Key not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should return 204 when the key-value is removed", async () => {
      expect.assertions(4);

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
        .delete(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        .send();

      expect(response.text).toStrictEqual("");
      expect(response.status).toBe(204);

      // Check if GET works
      const getResponse = await request(server)
        .get(`${BASE_URL}/${key}`)
        .auth(token, { type: "bearer" })
        .send();

      expect(getResponse.body).toStrictEqual({
        detail: "Key not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(getResponse.status).toBe(404);
    });
  });
});
