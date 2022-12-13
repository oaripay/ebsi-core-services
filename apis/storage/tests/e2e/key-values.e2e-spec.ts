import { jest, describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import crypto from "node:crypto";
import { URL } from "node:url";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { fastifyAdapterConfig } from "../../src/config/server.config";
import { ApiConfig } from "../../src/config/configuration";
import { requestSiopJwt } from "../utils/siopJwt";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

jest.setTimeout(60000);

const BASE_URL = "/stores/distributed/key-values";

describe("Key-Values (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig, true>;
  let testUserAccessToken: string;

  const key = `key-${crypto.randomBytes(16).toString("hex")}`;
  const key2 = `key-${crypto.randomBytes(16).toString("hex")}`;
  const key3 = `key-${crypto.randomBytes(16).toString("hex")}`;
  const value = `value-${crypto.randomBytes(16).toString("hex")}`;
  const value2 = `value-${crypto.randomBytes(16).toString("hex")}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig)
    );

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = getServer(app, configService);

    try {
      // Generate a valid Client JWT (SIOP) for the tests
      testUserAccessToken = await requestSiopJwt({
        clientKid: configService.get<string>("testClientKid"),
        clientPrivateKey: configService.get<string>("testClientPrivateKey"),
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describeWriteOps()(`PUT ${BASE_URL}/{key}`, () => {
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

    it("should throw an error if the payload is not a string", async () => {
      expect.assertions(2);

      const badValue = { value: 3 };

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(testUserAccessToken, { type: "bearer" })
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

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(testUserAccessToken, { type: "bearer" })
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

      const response = await request(server)
        .put(`${BASE_URL}/${key}`)
        .auth(testUserAccessToken, { type: "bearer" })
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
      await request(server)
        .put(`${BASE_URL}/${key2}`)
        .auth(testUserAccessToken, { type: "bearer" })
        .type("text/plain")
        .send(value);

      await request(server)
        .put(`${BASE_URL}/${key3}`)
        .auth(testUserAccessToken, { type: "bearer" })
        .type("text/plain")
        .send(value);
    });

    it("should return the keys associated to the DID", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get(`${BASE_URL}?page[size]=2`)
        .auth(testUserAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([expect.stringContaining("key-")]),
        links: {
          next: expect.stringMatching(
            /\/stores\/distributed\/key-values\?page\[after\]=.*&page\[size\]=2/
          ),
        },
        pageSize: 2,
        self: expect.stringContaining(
          "/stores/distributed/key-values?page[size]=2"
        ),
      });
      expect((response.body as { items: string[] }).items).toHaveLength(2);
      expect(response.status).toBe(200);
    });

    it("should be able to navigate to the next page", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}?page[size]=2`)
        .auth(testUserAccessToken, { type: "bearer" })
        .send();

      const nextLink = new URL(
        (response.body as { links: { next: string } }).links.next
      );

      // Go to next page
      const nextPageUrl = `${BASE_URL}${nextLink.search}`;
      const nextPageResponse = await request(server)
        .get(nextPageUrl)
        .auth(testUserAccessToken, { type: "bearer" })
        .send();

      expect(nextPageResponse.body).toStrictEqual({
        items: expect.arrayContaining([expect.stringContaining("key-")]),
        links: expect.anything() as unknown,
        pageSize: 2,
        self: expect.stringContaining(nextPageUrl),
      });
      expect(nextPageResponse.status).toBe(200);
    });
  });

  describe(`GET ${BASE_URL}/{key}`, () => {
    it("should throw a 404 when the key doesn't exist", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`${BASE_URL}/wrong-key`)
        .auth(testUserAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Key not found",
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    describeWriteOps()("(test requiring actual data)", () => {
      it("should return the value corresponding to the key", async () => {
        expect.assertions(2);

        const response = await request(server)
          .get(`${BASE_URL}/${key}`)
          .auth(testUserAccessToken, { type: "bearer" })
          .send();

        expect(response.text).toStrictEqual(value2);
        expect(response.status).toBe(200);
      });
    });
  });

  describeWriteOps()(`DELETE ${BASE_URL}/{key}`, () => {
    it("should throw a 404 when the key doesn't exist", async () => {
      expect.assertions(2);

      const response = await request(server)
        .delete(`${BASE_URL}/wrong-key`)
        .auth(testUserAccessToken, { type: "bearer" })
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

      const response = await request(server)
        .delete(`${BASE_URL}/${key}`)
        .auth(testUserAccessToken, { type: "bearer" })
        .send();

      expect(response.text).toBe("");
      expect(response.status).toBe(204);

      // Check if GET works
      const getResponse = await request(server)
        .get(`${BASE_URL}/${key}`)
        .auth(testUserAccessToken, { type: "bearer" })
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
