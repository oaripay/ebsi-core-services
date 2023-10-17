import { describe, beforeAll, beforeEach, it, expect } from "vitest";
import crypto from "node:crypto";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { base64url } from "multiformats/bases/base64";
import { exportJWK, generateKeyPair } from "jose";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { PaginatedList2 } from "@ebsiint-api/shared";
import { AppModule } from "../../src/app.module.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { AttributeResponseObject } from "../../src/modules/attributes/attributes.interface.js";
import { requestSiopJwt } from "../utils/auth.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { getServer } from "../utils/getServer.js";

describeWriteOps()("Attributes", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let storageApiUrl: string;
  let apiUrl: string;
  let testUser1: {
    kid: string;
    did: string;
    token: string;
  };

  let testUser2: {
    kid: string;
    did: string;
    token: string;
  };

  const createAttribute = (visibility?: string, sharedWithMe?: boolean) => ({
    storageUri: `${storageApiUrl}/stores/distributed`,
    did: testUser1.did,
    visibility,
    ...(sharedWithMe && {
      // The owner is a different did, but it is shared with the user
      did: testUser2.did,
      sharedWith: testUser1.did,
    }),
    contentType: "application/json+ld",
    data: base64url.baseEncode(crypto.randomBytes(15)),
    dataLabel: "document",
    proof: {},
  });

  const insertAttribute = async (visibility?: string, sharedWithMe?: boolean) =>
    request(server)
      .post("/attributes")
      .auth(sharedWithMe ? testUser2.token : testUser1.token, {
        type: "bearer",
      })
      .send(createAttribute(visibility, sharedWithMe));

  const deleteAttribute = async (hash: string, token: string) =>
    request(server)
      .delete(`/attributes/${hash}`)
      .auth(token, { type: "bearer" })
      .send();

  const getAllAttributes = async (token: string) =>
    request(server)
      .get("/attributes?page[size]=50")
      .auth(token, { type: "bearer" })
      .send();

  const deleteAllAttributes = async (token: string): Promise<unknown> => {
    const response = (await getAllAttributes(token)) as {
      body: {
        items: { hash: string }[];
      };
    };

    if (!response.body?.items) {
      return Promise.resolve();
    }

    return Promise.all(
      response.body.items.map(async (item) => {
        return deleteAttribute(item.hash, token);
      }),
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    const domain = configService.get<"string">("domain");
    const testLoadBalancerDomain = configService.get<"string">(
      "testLoadBalancerDomain",
    );
    const apiUrlPrefix = configService.get<"string">("apiUrlPrefix");

    storageApiUrl = configService.get<"string">("storageApiUrl");
    apiUrl = `${domain}${apiUrlPrefix}`;

    if (testLoadBalancerDomain) {
      storageApiUrl = storageApiUrl.replace(domain, testLoadBalancerDomain);
      apiUrl = apiUrl.replace(domain, testLoadBalancerDomain);
    }
  });

  describe.each(["legal entity", "natural person"] as const)(
    "with the user being a %s",
    (userType) => {
      beforeAll(async () => {
        if (userType === "legal entity") {
          const configTestUser1 = configService.get<{
            kid: string;
            privateKey: string;
          }>("testUser1");
          try {
            testUser1 = {
              ...configTestUser1,
              did: configTestUser1.kid.split("#")[0],
              token: await requestSiopJwt({
                clientKid: configTestUser1.kid,
                clientPrivateKey: configTestUser1.privateKey,
                configService,
              }),
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            throw e;
          }

          const configTestUser2 = configService.get<{
            kid: string;
            privateKey: string;
          }>("testUser2");

          try {
            testUser2 = {
              ...configTestUser2,
              did: configTestUser2.kid.split("#")[0],
              token: await requestSiopJwt({
                clientKid: configTestUser2.kid,
                clientPrivateKey: configTestUser2.privateKey,
                configService,
              }),
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            throw e;
          }
        } else {
          const testUser1Keys = await generateKeyPair("ES256K");
          const testUser1PrivateKeyJwk = await exportJWK(
            testUser1Keys.privateKey,
          );
          const testUser1PublicKeyJwk = await exportJWK(
            testUser1Keys.publicKey,
          );
          const testUser1Did = EbsiWallet.createDid(
            "NATURAL_PERSON",
            testUser1PublicKeyJwk,
          );
          const fragmentIdentifier = testUser1Did.replace("did:key:", "");
          const testUser1Kid = `${testUser1Did}#${fragmentIdentifier}`;

          try {
            testUser1 = {
              did: testUser1Did,
              kid: testUser1Kid,
              token: await requestSiopJwt({
                clientKid: testUser1Kid,
                clientPrivateKey: testUser1PrivateKeyJwk,
                configService,
                syntaxType: "did_subject",
              }),
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            throw e;
          }

          const configTestUser2 = configService.get<{
            kid: string;
            privateKey: string;
          }>("testUser2");

          try {
            testUser2 = {
              ...configTestUser2,
              did: configTestUser2.kid.split("#")[0],
              token: await requestSiopJwt({
                clientKid: configTestUser2.kid,
                clientPrivateKey: configTestUser2.privateKey,
                configService,
              }),
            };
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            throw e;
          }
        }
      });

      beforeEach(async () => {
        await deleteAllAttributes(testUser1.token);
        await deleteAllAttributes(testUser2.token);
      });

      describe("GET /attributes", () => {
        it("should get attributes associated to the did", async () => {
          expect.assertions(8);

          for (let i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await insertAttribute();
          }

          await insertAttribute("shared", true);

          // First Page
          let path = "/attributes?page[size]=2";
          let response = await request(server)
            .get(path)
            .auth(testUser1.token, { type: "bearer" })
            .send();

          expect(response.body).toStrictEqual({
            self: `${apiUrl}${path}`,
            items: expect.arrayContaining([
              expect.objectContaining({
                did: testUser1.did,
                sharedWith: expect.not.stringContaining(testUser1.did),
              }),
            ]),
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

          path =
            (
              response.body as PaginatedList2<AttributeResponseObject>
            ).links.next?.replace(apiUrl, "") ?? "";

          // Second page
          response = await request(server)
            .get(path)
            .auth(testUser1.token, { type: "bearer" })
            .send();

          expect(response.body).toStrictEqual({
            self: `${apiUrl}${path}`,
            items: expect.arrayContaining([
              expect.objectContaining({
                did: testUser1.did,
                sharedWith: expect.not.stringContaining(testUser1.did),
              }),
            ]),
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
          ).toHaveLength(1);

          path =
            (
              response.body as PaginatedList2<AttributeResponseObject>
            ).links.next?.replace(apiUrl, "") ?? "";

          // Third page: Shared attributes
          response = await request(server)
            .get(path)
            .auth(testUser1.token, { type: "bearer" })
            .send();

          expect(response.body).toStrictEqual({
            self: `${apiUrl}${path}`,
            items: expect.arrayContaining([
              expect.objectContaining({
                // Not the owner but it is shared
                did: testUser2.did,
                sharedWith: testUser1.did,
              }),
            ]),
            links: expect.objectContaining({}),
            pageSize: 2,
          });
          expect(response.status).toBe(200);
        });
      });

      describe("GET /attribute/{hash}", () => {
        it("should return attribute not found", async () => {
          expect.assertions(2);
          const hash = `0x${crypto.randomBytes(32).toString("hex")}`;
          const response = await request(server)
            .get(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send();
          expect(response.body).toStrictEqual({
            title: "Attribute Not Found",
            status: 404,
            type: "about:blank",
            detail: `Attribute ${hash} not found`,
          });
          expect(response.status).toBe(404);
        });

        it("should return forbidden", async () => {
          expect.assertions(2);

          const attribute = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;

          const response = await request(server)
            .get(`/attributes/${attribute.hash}`)
            .send();

          expect(response.body).toStrictEqual({
            title: "Forbidden",
            status: 403,
            type: "about:blank",
          });
          expect(response.status).toBe(403);
        });

        it("should get a specific attribute associated to the did", async () => {
          expect.assertions(2);

          const expectedAttribute = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;

          const response = await request(server)
            .get(`/attributes/${expectedAttribute.hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send();

          delete expectedAttribute.proof;
          expectedAttribute.visibility = "private";
          expectedAttribute.sharedWith = "";
          expect(response.body).toStrictEqual(expectedAttribute);
          expect(response.status).toBe(200);
        });

        it("should get a shared attribute", async () => {
          expect.assertions(4);

          // shared with everyone without authentication
          let expectedAttribute = (
            (await insertAttribute("shared")) as {
              body: AttributeResponseObject;
            }
          ).body;

          let response = await request(server)
            .get(`/attributes/${expectedAttribute.hash}`)
            // no authentication
            .send();

          delete expectedAttribute.proof;
          expectedAttribute.sharedWith = "";
          expect(response.body).toStrictEqual(expectedAttribute);
          expect(response.status).toBe(200);

          // shared with the user
          expectedAttribute = (
            (await insertAttribute("shared", true)) as {
              body: AttributeResponseObject;
            }
          ).body;

          response = await request(server)
            .get(`/attributes/${expectedAttribute.hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send();

          delete expectedAttribute.proof;
          expect(response.body).toStrictEqual(expectedAttribute);
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
            detail: "Missing JWT",
          });
          expect(response.status).toBe(401);
        });

        it("should reject bad requests", async () => {
          expect.assertions(6);

          let response = await request(server)
            .post("/attributes")
            .auth(testUser1.token, { type: "bearer" })
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
            .auth(testUser1.token, { type: "bearer" })
            .send({
              storageUri: `${storageApiUrl}/stores/distributed`,
              did: testUser1.did,
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

          const { data } = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;
          const attribute2 = createAttribute();
          attribute2.data = data;
          response = await request(server)
            .post("/attributes")
            .auth(testUser1.token, { type: "bearer" })
            .send(attribute2);
          expect(response.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            type: "about:blank",
            detail: "Attribute already exist",
          });
          expect(response.status).toBe(400);
        });

        it("should create an attribute", async () => {
          expect.assertions(2);

          const attribute = createAttribute();

          const response = await request(server)
            .post("/attributes")
            .auth(testUser1.token, { type: "bearer" })
            .send(attribute);

          delete attribute.visibility;
          expect(response.body).toStrictEqual({
            ...attribute,
            hash: expect.any(String),
          });
          expect(response.status).toBe(201);
        });
      });

      describe("DELETE /attributes", () => {
        it("should throw not found for delete attribute", async () => {
          expect.assertions(2);
          const hash = `0x${crypto.randomBytes(32).toString("hex")}`;

          const response = await request(server)
            .delete(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
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

          const { hash } = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;

          const response = await request(server)
            .delete(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send();

          expect(response.body).toStrictEqual({});
          expect(response.status).toBe(204);
        });
      });

      describe("PATCH /attributes", () => {
        it("should reject bad requests", async () => {
          expect.assertions(10);

          let response = await request(server)
            .patch("/attributes/123456789")
            .auth(testUser1.token, { type: "bearer" })
            .send([
              {
                op: "replace",
                path: "/storageUri",
                value: "https://example.com",
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
            .auth(testUser1.token, { type: "bearer" })
            .send([{ op: "replace", path: "/did", value: "did:ebsi:123" }]);
          expect(response.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            type: "about:blank",
            detail: `["path must match /^\\\\/(?:visibility|sharedWith|contentType|dataLabel)/ regular expression"]`,
          });
          expect(response.status).toBe(400);

          response = await request(server)
            .patch("/attributes/123456789")
            .auth(testUser1.token, { type: "bearer" })
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
            .auth(testUser1.token, { type: "bearer" })
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
            .auth(testUser1.token, { type: "bearer" })
            .send([
              {
                op: "replace",
                path: "/visibility",
                value: "invalid-visibility",
              },
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
          expect.assertions(2);
          const hash = crypto.randomBytes(12).toString("hex");

          const response = await request(server)
            .patch(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send([{ op: "replace", path: "/visibility", value: "shared" }]);

          expect(response.body).toStrictEqual({
            title: "Attribute Not Found",
            status: 404,
            type: "about:blank",
            detail: `Attribute ${hash} not found`,
          });
          expect(response.status).toBe(404);
        });

        it("should reject forbidden", async () => {
          expect.assertions(2);

          const { hash } = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;

          const response = await request(server)
            .patch(`/attributes/${hash}`)
            .auth(testUser2.token, { type: "bearer" })
            .send([{ op: "replace", path: "/visibility", value: "shared" }]);

          expect(response.body).toStrictEqual({
            title: "Forbidden",
            status: 403,
            type: "about:blank",
            detail: `${testUser2.did} is not the owner of attribute ${hash}`,
          });
          expect(response.status).toBe(403);
        });

        it("should return 400 when the patch path is not is not valid", async () => {
          expect.assertions(2);

          const { hash } = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;

          const response = await request(server)
            .patch(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send([
              { op: "replace", path: "/visibility/-///t+T*$", value: "shared" },
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

          const { hash, data } = (
            (await insertAttribute()) as {
              body: AttributeResponseObject;
            }
          ).body;

          let response = await request(server)
            .patch(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send([
              { op: "replace", path: "/visibility", value: "shared" },
              {
                op: "replace",
                path: "/contentType",
                value: "application/json",
              },
              { op: "replace", path: "/sharedWith", value: "did:ebsi:1234" },
              { op: "replace", path: "/dataLabel", value: "document2" },
            ]);

          const expectedAttribute = {
            storageUri: `${storageApiUrl}/stores/distributed`,
            hash,
            did: testUser1.did,
            visibility: "shared",
            sharedWith: "did:ebsi:1234",
            contentType: "application/json",
            data,
            dataLabel: "document2",
          };
          expect(response.body).toStrictEqual(expectedAttribute);
          expect(response.status).toBe(200);

          response = await request(server)
            .get(`/attributes/${hash}`)
            .auth(testUser1.token, { type: "bearer" })
            .send();
          expect(response.body).toStrictEqual(expectedAttribute);
          expect(response.status).toBe(200);
        });
      });
    },
  );
});
