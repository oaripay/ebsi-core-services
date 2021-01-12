import crypto from "crypto";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, HttpServer, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import cassandraDriver from "cassandra-driver";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { CassandraService } from "../cassandra/cassandra.service";
import { NotificationsModule } from "./notifications.module";
import { Notification } from "./notifications.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { EbsiValidationPipe } from "../../pipes/ebsi-validation.pipe";
import {
  createNotification,
  createToken,
} from "../../../tests/utils/notifications";

jest.mock("cassandra-driver");

describe("Notifications module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("POST /notifications", () => {
    it("should accept a valid payload", async () => {
      function cassandraResponse(rows: unknown[], pageState: string = null) {
        return {
          info: { isSchemaInAgreement: true },
          first: () => rows[0],
          rows,
          pageState,
        };
      }

      expect.assertions(3);

      const notification = createNotification();

      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");

      const mockExecute = jest.spyOn(
        cassandraDriver.Client.prototype,
        "execute"
      );

      mockExecute.mockImplementation(() => {
        return cassandraResponse([]);
      });

      const response = await request(server)
        .post("/notifications")
        .send(notification);

      expect(response.body).toStrictEqual(notification);
      expect(response.status).toBe(201);
      expect(response.headers).toStrictEqual(
        expect.objectContaining({
          location: expect.stringContaining(
            `/notifications/${notificationId}`
          ) as string,
        })
      );
      jest.resetAllMocks();
    });

    it("should reject invalid payloads", async () => {
      expect.assertions(12);

      let notification: Notification;
      let response: request.Response;

      // Invalid date
      notification = createNotification();
      notification.expirationDate = "2019-11-17T14:00:00W";

      response = await request(server)
        .post("/notifications")
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
      notification = createNotification();
      notification.from = "Joe";

      response = await request(server)
        .post("/notifications")
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

      // Invalid proof: bad nested properties
      notification = createNotification();
      notification.proof = ({
        fake: "no proof here",
      } as unknown) as Notification["proof"];

      response = await request(server)
        .post("/notifications")
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
      notification = createNotification();
      notification.proof = ("not object but string" as unknown) as Notification["proof"];

      response = await request(server)
        .post("/notifications")
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          proof: [
            {
              proof: ["nested property proof must be an object"],
            },
          ],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Invalid proof: null
      notification = createNotification();
      notification.proof = (null as unknown) as Notification["proof"];

      response = await request(server)
        .post("/notifications")
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          proof: [
            "proof should not be empty",
            {
              proof: ["nested property proof must be an object"],
            },
          ],
        },
        status: 400,
        title: "Validation Error",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Expiration date greater than 5 days
      notification = createNotification();
      notification.expirationDate = new Date(
        new Date(notification.issuanceDate).getTime() + 6 * 86400 * 1000
      ).toISOString();

      response = await request(server)
        .post("/notifications")
        .send(notification);

      expect(response.body).toStrictEqual({
        detail:
          "The expiration date can not be greater than 5 days of issuance",
        status: 400,
        title: "Invalid Expiration Date",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      jest.resetAllMocks();
    });
  });

  describe("GET /notifications", () => {
    it("should return a list of notification", async () => {
      expect.assertions(2);
      const did = "did:ebsi:test";
      const token = createToken(did);
      const resultNotifications = [
        { notification: createNotification(did), id: "id1" },
        { notification: createNotification(did), id: "id2" },
      ];

      const storedNotifications = resultNotifications.map((r) => {
        return {
          id: r.id,
          from: r.notification.from,
          to: r.notification.to,
          message: JSON.stringify(r.notification),
        };
      });

      resultNotifications.sort((a, b) =>
        a.notification.issuanceDate > b.notification.issuanceDate ? 1 : -1
      );

      jest
        .spyOn(CassandraService.prototype, "getNotifications")
        .mockResolvedValue(storedNotifications);

      const response = await request(server)
        .get("/notifications")
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=10"
        ) as string,
        items: resultNotifications
          .map((result) => {
            return {
              ...result.notification,
              _links: {
                self: {
                  href: expect.stringContaining(
                    `/notifications/${result.id}`
                  ) as string,
                },
              },
            };
          })
          .sort((a, b) => (a.issuanceDate > b.issuanceDate ? 1 : -1)),
        total: 2,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
      jest.resetAllMocks();
    });
  });

  describe("GET /notifications/{id}", () => {
    it("should return specified notification", async () => {
      expect.assertions(2);
      const did = "did:ebsi:test";
      const token = createToken(did);
      const resultNotifications = [
        { notification: createNotification(did), id: "id1" },
      ];
      const storedNotifications = resultNotifications.map((r) => {
        return {
          id: r.id,
          from: r.notification.from,
          to: r.notification.to,
          message: JSON.stringify(r.notification),
        };
      });
      jest
        .spyOn(CassandraService.prototype, "getNotification")
        .mockResolvedValue(storedNotifications[0]);

      const notificationId = storedNotifications[0].id;

      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.body).toStrictEqual(resultNotifications[0].notification);
      expect(response.status).toBe(200);
      jest.resetAllMocks();
    });

    it("should throw NotFoundError if notification does not exist", async () => {
      expect.assertions(2);
      const did = "did:ebsi:test";
      const token = createToken(did);
      jest
        .spyOn(CassandraService.prototype, "getNotification")
        .mockImplementation(() => {
          throw new NotFoundError("Notification Not Found", {
            detail: `Id parameter not found`,
          });
        });

      const notificationId = "789xyz";

      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.body).toStrictEqual({
        detail: "Id parameter not found",
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      jest.resetAllMocks();
    });
  });
  describe("DELETE /notifications/{id}", () => {
    it("should delete the notification", async () => {
      expect.assertions(2);
      const did = "did:ebsi:test";
      const token = createToken(did);
      const resultNotifications = [
        { notification: createNotification(did), id: "id1" },
      ];
      const storedNotifications = resultNotifications.map((r) => {
        return {
          id: r.id,
          from: r.notification.from,
          to: r.notification.to,
          message: JSON.stringify(r.notification),
        };
      });
      jest
        .spyOn(CassandraService.prototype, "getNotification")
        .mockResolvedValue(storedNotifications[0]);
      jest
        .spyOn(CassandraService.prototype, "deleteNotification")
        .mockResolvedValue();
      const response = await request(server)
        .delete("/notifications/123")
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
      jest.resetAllMocks();
    });
  });
});
