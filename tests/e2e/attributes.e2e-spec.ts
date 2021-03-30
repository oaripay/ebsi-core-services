import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import base64url from "base64url";
import jsonwebtoken from "jsonwebtoken";
import { Logger } from "@nestjs/common/services/logger.service";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { loadConfig } from "../../src/config/configuration";
import { AttributeResponseObject } from "../../src/modules/attributes/attributes.interface";
import { PaginatedList } from "../../src/shared/interfaces";

jest.setTimeout(60000);

describe("Attributes", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  const { domain, apiUrlPrefix, storage } = loadConfig();
  const apiUrl = `${domain}${apiUrlPrefix}`;
  const did = `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`;
  const did2 = `did:ebsi:0x${crypto.randomBytes(20).toString("hex")}`;
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
  const validToken2 = jsonwebtoken.sign(
    {
      did: did2,
    },
    "secret",
    {
      audience: "proxy-data-hub-api",
      issuer: "authorisation-api",
    }
  );

  const createAttribute = (visibility?: string, sharedWithMe?: boolean) => ({
    storageUri: `${storage}/stores/distributed`,
    did,
    visibility,
    ...(sharedWithMe && {
      // The owner is a different did, but it is shared with the user
      did: did2,
      sharedWith: did,
    }),
    contentType: "application/json+ld",
    data: base64url.encode(crypto.randomBytes(15).toString("hex")),
    dataLabel: "document",
    proof: {},
  });

  const insertAttribute = async (visibility?: string, sharedWithMe?: boolean) =>
    request(server)
      .post("/attributes")
      .auth(sharedWithMe ? validToken2 : validToken, { type: "bearer" })
      .send(createAttribute(visibility, sharedWithMe));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  describe("GET /attributes", () => {
    it("should get attributes associated to the did", async () => {
      expect.assertions(9);
      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < 3; i += 1) await insertAttribute();
      await insertAttribute("shared", true);
      /* eslint-enable no-await-in-loop */

      // First Page
      let path = "/attributes?page[size]=2";
      let response = await request(server)
        .get(path)
        .auth(validToken, { type: "bearer" })
        .send();
      expect(response.body).toStrictEqual({
        self: `${apiUrl}${path}`,
        items: expect.arrayContaining([
          expect.objectContaining({
            did,
            sharedWith: expect.not.stringContaining(did) as string,
          }),
        ]) as AttributeResponseObject[],
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

      path = (response.body as PaginatedList<AttributeResponseObject>).links.next.replace(
        apiUrl,
        ""
      );

      // Second page
      response = await request(server)
        .get(path)
        .auth(validToken, { type: "bearer" })
        .send();
      expect(response.body).toStrictEqual({
        self: `${apiUrl}${path}`,
        items: expect.arrayContaining([
          expect.objectContaining({
            did,
            sharedWith: expect.not.stringContaining(did) as string,
          }),
        ]) as AttributeResponseObject[],
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
      ).toHaveLength(1);

      path = (response.body as PaginatedList<AttributeResponseObject>).links.next.replace(
        apiUrl,
        ""
      );

      // Third page: Shared attributes
      response = await request(server)
        .get(path)
        .auth(validToken, { type: "bearer" })
        .send();
      expect(response.body).toStrictEqual({
        self: `${apiUrl}${path}`,
        items: expect.arrayContaining([
          expect.objectContaining({
            // Not the owner but it is shared
            did: expect.not.stringContaining(did) as string,
            sharedWith: did,
          }),
        ]) as AttributeResponseObject[],
        links: {},
        pageSize: 2,
      });
      expect(response.status).toBe(200);
      expect(
        (response.body as { items: AttributeResponseObject[] }).items
      ).toHaveLength(1);
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
      expect.assertions(4);

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
    });

    it("should create and update an attribute", async () => {
      expect.assertions(4);

      const attribute = createAttribute();

      let response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);

      delete attribute.visibility;
      expect(response.body).toStrictEqual({
        ...attribute,
        hash: expect.any(String) as string,
      });
      expect(response.status).toBe(201);

      const { hash } = response.body as { hash: string };

      attribute.dataLabel = "document2";

      response = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);

      expect(response.body).toStrictEqual({
        ...attribute,
        hash,
      });
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /attributes", () => {
    it("should throw not found for delete attribute", async () => {
      expect.assertions(2);
      const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        title: "Attribute Not Found",
        status: 404,
        type: "about:blank",
        detail: `Attribute ${hash} not found`,
      });
      expect(response.status).toBe(404);
    });

    it("should delete an attribute", async () => {
      expect.assertions(2);

      // insert attribute
      const attribute = {
        storageUri: `${storage}/stores/distributed`,
        did,
        visibility: "private",
        contentType: "application/json+ld",
        data: base64url.encode("encrypted data"),
        dataLabel: "document",
        proof: {},
      };

      const responseInsert = await request(server)
        .post("/attributes")
        .auth(validToken, { type: "bearer" })
        .send(attribute);
      const { hash } = responseInsert.body as { hash: string };

      const response = await request(server)
        .delete(`/attributes/${hash}`)
        .auth(validToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });
});
