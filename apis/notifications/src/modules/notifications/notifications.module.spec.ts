import { vi, describe, beforeAll, afterAll, it, expect } from "vitest";
import crypto from "node:crypto";
import axios from "axios";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JWTVerifyResult } from "jose";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import jsonwebtoken from "jsonwebtoken";
import { NotificationsModule } from "./notifications.module.js";
import { CassandraResponse, Notification } from "./notifications.interface.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { EbsiValidationPipe } from "../../pipes/ebsi-validation.pipe.js";
import {
  createNotification,
  createToken,
} from "../../../tests/utils/notifications.js";
import type { ApiConfig } from "../../config/configuration.js";

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

describe("Notifications module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let selectCountResponse: CassandraResponse;
  let selectResponse: CassandraResponse;
  let modifyResponse: CassandraResponse;
  let configService: ConfigService<ApiConfig, true>;

  function cassandraResponse(rows: unknown[], pageState: string = "") {
    return {
      info: { isSchemaInAgreement: true },
      first: () => rows[0],
      rows,
      pageState,
    };
  }

  function cassandraResponseCount(count: number) {
    return cassandraResponse([{ count: Number(count).toString() }]);
  }

  const didSender = EbsiWallet.createDid();
  const legalEntityRecipientDid = EbsiWallet.createDid("LEGAL_ENTITY");

  const sender = {
    did: didSender,
    token: createToken(didSender),
  };

  const legalEntityRecipient = {
    did: legalEntityRecipientDid,
    token: createToken(legalEntityRecipientDid),
  };

  const accessTokenApi = jsonwebtoken.sign(
    {
      sub: "notifications-api",
    },
    "secret",
    {
      audience: "storage-api",
      issuer: "authorisation-api",
      expiresIn: 3600,
    },
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new EbsiValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    vi.spyOn(axios, "get").mockImplementation(async (url) => {
      if (url.includes(sender.did) || url.includes(legalEntityRecipient.did))
        return Promise.resolve({
          data: {
            document: "did document",
          },
        });
      throw new Error("Forgot to mock axios get?");
    });

    vi.spyOn(axios, "post").mockImplementation(async (url, data) => {
      if (url.includes("/oauth2-sessions")) return { data: {} };
      if (!url.includes("/jsonrpc"))
        throw new Error(`Forgot to mock axios post? url: ${url}`);
      const d = data as { params: string[] };
      if (!d.params) throw new Error("mock: data does not have params");
      const { params } = d;
      if (!Array.isArray(params))
        throw new Error("mock: data must be an Array");
      if (params[0]!.includes("count(*)"))
        return Promise.resolve({
          data: { result: selectCountResponse },
        });
      if (params[0]!.includes("select"))
        return Promise.resolve({
          data: { result: selectResponse },
        });
      return Promise.resolve({
        data: { result: modifyResponse },
      });
    });

    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (token: string): Promise<JWTVerifyResult> => {
        if (token === sender.token) {
          return Promise.resolve({
            payload: { sub: sender.did },
          } as unknown as JWTVerifyResult);
        }

        if (token === legalEntityRecipient.token) {
          return Promise.resolve({
            payload: { sub: legalEntityRecipient.did },
          } as unknown as JWTVerifyResult);
        }

        throw new Error("verifyAccessToken failed");
      },
    );

    vi.spyOn(OAuth2Lib.Agent.prototype, "verifyAkeResponse").mockImplementation(
      async () => Promise.resolve(accessTokenApi),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("JWT Authentication", () => {
    it("should reject bad authentication", async () => {
      expect.assertions(2);
      const response = await request(server)
        .post("/notifications")
        .auth("bad token", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        status: 401,
        detail: "verifyAccessToken failed",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });
  });

  describe("POST /notifications", () => {
    it("should accept a valid payload with a LE as recipient", async () => {
      expect.assertions(3);

      const notification = createNotification(
        sender.did,
        legalEntityRecipient.did,
      );

      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");

      modifyResponse = cassandraResponse([]);

      const response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual(notification);
      expect(response.status).toBe(201);
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          location: expect.stringContaining(`/notifications/${notificationId}`),
        }),
      );
    });

    it("should accept a valid payload with a NP (did:key) as recipient", async () => {
      expect.assertions(3);

      const naturalPersonRecipientJwk = {
        crv: "P-256",
        kty: "EC",
        x: "ngy44T1vxAT6Di4nr-UaM9K3Tlnz9pkoksDokKFkmNc",
        y: "QCRfOKlSM31GTkb4JHx3nXB4G_jSPMsbdjzlkT_UpPc",
      };

      const naturalPersonRecipientDid = EbsiWallet.createDid(
        "NATURAL_PERSON",
        naturalPersonRecipientJwk,
      );

      const notification = createNotification(
        sender.did,
        naturalPersonRecipientDid,
      );

      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");

      modifyResponse = cassandraResponse([]);

      const response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual(notification);
      expect(response.status).toBe(201);
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          location: expect.stringContaining(`/notifications/${notificationId}`),
        }),
      );
    });

    it("should reject invalid payloads", async () => {
      expect.assertions(14);

      let notification: Notification;
      let response: request.Response;

      // Invalid date
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.expirationDate = "2019-11-17T14:00:00W";

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          expirationDate: [
            "expirationDate must be a valid ISO 8601 date string",
          ],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid from
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.from = "Joe";

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          from: ["from must be a valid DID string"],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid to
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.to = "did:ebsi:xyz";

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          to: ["to must be a valid DID string"],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid proof: bad nested properties
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.proof = {
        fake: "no proof here",
      } as unknown as Notification["proof"];

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          proof: [
            {
              type: [
                "type must be equal to EcdsaSecp256k1Signature2019",
                "type must be a string",
                "type should not be empty",
              ],
              created: [
                "created must be a valid ISO 8601 date string",
                "created should not be empty",
              ],
              proofPurpose: [
                "proofPurpose must be equal to assertionMethod",
                "proofPurpose must be a string",
                "proofPurpose should not be empty",
              ],
              verificationMethod: [
                "verificationMethod must be a string",
                "verificationMethod should not be empty",
              ],
              jws: ["jws must be a string", "jws should not be empty"],
            },
          ],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid proof: not object
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.proof =
        "not object but string" as unknown as Notification["proof"];

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          proof: ["nested property proof must be an object"],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid proof: null
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.proof = null as unknown as Notification["proof"];

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          proof: [
            "proof should not be empty",
            "nested property proof must be an object",
          ],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Expiration date greater than 5 days
      notification = createNotification(sender.did, legalEntityRecipient.did);
      notification.expirationDate = new Date(
        new Date(notification.issuanceDate).getTime() + 6 * 86400 * 1000,
      ).toISOString();

      response = await request(server)
        .post("/notifications")
        .auth(sender.token, { type: "bearer" })
        .send(notification);

      expect(response.body).toStrictEqual({
        detail:
          "The expiration date can not be greater than 5 days of issuance",
        status: 400,
        title: "Invalid Expiration Date",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /notifications", () => {
    it("should return a list of notification (LE)", async () => {
      expect.assertions(2);

      const resultNotifications = [
        {
          notification: createNotification(
            sender.did,
            legalEntityRecipient.did,
          ),
          id: "id1",
        },
        {
          notification: createNotification(
            sender.did,
            legalEntityRecipient.did,
          ),
          id: "id2",
        },
      ];

      const storedNotifications = resultNotifications.map((r) => {
        return {
          id: r.id,
          from: r.notification.from,
          to: r.notification.to,
          message: JSON.stringify(r.notification),
        };
      });

      selectCountResponse = cassandraResponseCount(2);

      selectResponse = cassandraResponse(storedNotifications, "123");

      resultNotifications.sort((a, b) =>
        a.notification.issuanceDate > b.notification.issuanceDate ? 1 : -1,
      );

      const response = await request(server)
        .get("/notifications")
        .auth(legalEntityRecipient.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/notifications?page[size]=10"),
        items: resultNotifications
          .map((result) => {
            return {
              ...result.notification,
              _links: {
                self: {
                  href: expect.stringContaining(`/notifications/${result.id}`),
                },
              },
            };
          })
          .sort((a, b) => (a.issuanceDate > b.issuanceDate ? 1 : -1)),
        total: 2,
        pageSize: 10,
        links: {
          next: expect.stringContaining("/notifications?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /notifications/{id}", () => {
    it("should return specified notification", async () => {
      expect.assertions(2);
      const resultNotifications = [
        {
          notification: createNotification(
            sender.did,
            legalEntityRecipient.did,
          ),
          id: "id1",
        },
      ];
      const storedNotifications = resultNotifications.map((r) => {
        return {
          id: r.id,
          from: r.notification.from,
          to: r.notification.to,
          message: JSON.stringify(r.notification),
        };
      });

      selectCountResponse = cassandraResponseCount(1);
      selectResponse = cassandraResponse(storedNotifications, "123");

      const notificationId = storedNotifications[0]!.id;

      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .auth(legalEntityRecipient.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual(resultNotifications[0]!.notification);
      expect(response.status).toBe(200);
    });

    it("should throw NotFoundError if notification does not exist", async () => {
      expect.assertions(2);

      const notificationId = "789xyz";

      selectResponse = cassandraResponse([]);

      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .auth(legalEntityRecipient.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: `Notification ${notificationId} not found`,
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /notifications/{id}", () => {
    it("should delete the notification", async () => {
      expect.assertions(2);
      const resultNotifications = [
        {
          notification: createNotification(
            sender.did,
            legalEntityRecipient.did,
          ),
          id: "id1",
        },
      ];
      const storedNotifications = resultNotifications.map((r) => {
        return {
          id: r.id,
          from: r.notification.from,
          to: r.notification.to,
          message: JSON.stringify(r.notification),
        };
      });

      selectResponse = cassandraResponse(storedNotifications);

      const response = await request(server)
        .delete("/notifications/123")
        .auth(legalEntityRecipient.token, { type: "bearer" })
        .send();
      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });
});
