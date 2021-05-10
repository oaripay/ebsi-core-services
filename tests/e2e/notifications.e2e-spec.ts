import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { EbsiValidationPipe } from "../../src/pipes/ebsi-validation.pipe";
import { Notification } from "../../src/modules/notifications/notifications.interface";
import { createNotification } from "../utils/notifications";
import { ApiConfig } from "../../src/config/configuration";
import { siopAuthentication } from "../utils/auth";

jest.setTimeout(30000);

describe("Notifications module (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  let testUser1: {
    did: string;
    privateKey: string;
    token?: string;
  };

  let testUser2: {
    did: string;
    privateKey: string;
    token?: string;
  };

  let expectedNotifications: Notification[];

  const deleteNotification = async (id: string, token: string) =>
    request(server)
      .delete(`/notifications/${id}`)
      .auth(token, { type: "bearer" })
      .send();

  const getAllNotifications = async (token: string) =>
    request(server)
      .get("/notifications?page[size]=50")
      .auth(token, { type: "bearer" })
      .send();

  const deleteAllNotifications = async () => {
    const tokens = [testUser1.token, testUser2.token];
    await Promise.all(
      tokens.map(async (token) => {
        const response = (await getAllNotifications(token)) as {
          body: {
            items: {
              _links: {
                self: {
                  href: string;
                };
              };
            }[];
          };
        };
        return Promise.all(
          response.body.items.map(async (item) => {
            // eslint-disable-next-line no-underscore-dangle
            const { href } = item._links.self;
            const id = href.substring(href.lastIndexOf("/") + 1);
            return deleteNotification(id, token);
          })
        );
      })
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());

    // Turn off logger
    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );

    testUser1 = configService.get<{
      did: string;
      privateKey: string;
    }>("testUser1");
    testUser2 = configService.get<{
      did: string;
      privateKey: string;
    }>("testUser2");
    testUser1.token = await siopAuthentication(testUser1);
    testUser2.token = await siopAuthentication(testUser2);

    // delete notifications of testUser1 and testUser2
    await deleteAllNotifications();

    // notifications from testUser2 to testUser1
    expectedNotifications = [...Array(11).keys()].map(() =>
      createNotification(testUser2.did, testUser1.did)
    );
    expectedNotifications.sort((a, b) =>
      a.issuanceDate > b.issuanceDate ? 1 : -1
    );

    // create multiple notifications
    await Promise.all(
      expectedNotifications.slice(0, 10).map((n) => {
        return request(server)
          .post("/notifications")
          .auth(testUser2.token, { type: "bearer" })
          .send(n);
      })
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /notifications", () => {
    it("should create a notification", async () => {
      expect.assertions(3);

      const notification = expectedNotifications[10];
      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");

      const response = await request(server)
        .post("/notifications")
        .auth(testUser2.token, { type: "bearer" })
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
    });
    it("should reject invalid payloads", async () => {
      expect.assertions(4);

      let notification: Notification;
      let response: request.Response;

      // Invalid date
      notification = createNotification();
      notification.expirationDate = "2019-11-17T14:00:00W";

      response = await request(server)
        .post("/notifications")
        .auth(testUser1.token, { type: "bearer" })
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
        .auth(testUser1.token, { type: "bearer" })
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
    });
  });

  describe("GET /notifications", () => {
    let nextPage = "";
    it("should return a list of notifications", async () => {
      expect.assertions(2);
      const response = await request(server)
        .get("/notifications")
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/notifications?page[size]=10") as string,
        items: expect.arrayContaining([]) as { id: string }[],
        total: 11,
        pageSize: 10,
        links: {
          next: expect.stringContaining(
            "/notifications?page[after]="
          ) as string,
        },
      });
      const { next } = (response.body as { links: { next: string } }).links;
      [nextPage] = next.split("page[after]=")[1].split("&");
      expect(response.status).toBe(200);
    });

    it("should return the next page with only 1 notification", async () => {
      expect.assertions(2);
      const pageSize = 10;
      const response = await request(server)
        .get(`/notifications?page[after]=${nextPage}&page[size]=${pageSize}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/notifications?page[after]=${nextPage}&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as { id: string }[],
        total: 11,
        pageSize: 10,
        links: {},
      });
      expect(response.status).toBe(200);
    });

    it("should return page 1 with 2 notifications", async () => {
      expect.assertions(2);
      const pageSize = 2;
      const response = await request(server)
        .get(`/notifications?page[size]=${pageSize}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(`/notifications?page[size]=2`) as string,
        items: expect.arrayContaining([]) as { id: string }[],
        total: 11,
        pageSize: 2,
        links: {
          next: expect.stringContaining(
            "/notifications?page[after]="
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /notifications/{id}", () => {
    it("should return specified notification", async () => {
      expect.assertions(2);
      const [notification] = expectedNotifications;
      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");
      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual(notification);
      expect(response.status).toBe(200);
    });

    it("should throw NotFoundError if notification does not exist", async () => {
      expect.assertions(2);
      const notificationId = "fakeId";
      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Notification fakeId not found",
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw NotFoundError if specified notification does not match receiver", async () => {
      expect.assertions(2);
      const [notification] = expectedNotifications;
      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");
      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .auth(testUser2.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: `The notification was not sent to ${testUser2.did}`,
        status: 403,
        title: "Forbidden",
        type: "about:blank",
      });
      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /notifications/{id}", () => {
    it("should delete the notification", async () => {
      expect.assertions(5);

      const notification = createNotification(testUser2.did, testUser1.did);
      const responseInsert = await request(server)
        .post("/notifications")
        .auth(testUser2.token, { type: "bearer" })
        .send(notification);

      expect(responseInsert.status).toBe(201);
      const { location } = responseInsert.headers as { location: string };
      const id = location.slice(location.lastIndexOf("/") + 1);

      const response = await request(server)
        .delete(`/notifications/${id}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);

      const responseGet = await request(server)
        .get(`/notifications/${id}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(responseGet.body).toStrictEqual({
        detail: `Notification ${id} not found`,
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(responseGet.status).toBe(404);
    });

    it("should delete the notification after the ttl", async () => {
      expect.assertions(3);

      const notification = createNotification(testUser2.did, testUser1.did);
      // expiration in 5 seconds
      const ttl = 5000; // ms
      notification.expirationDate = new Date(
        new Date(notification.issuanceDate).getTime() + ttl
      ).toISOString();
      const responseInsert = await request(server)
        .post("/notifications")
        .auth(testUser2.token, { type: "bearer" })
        .send(notification);

      expect(responseInsert.status).toBe(201);
      const { location } = responseInsert.headers as { location: string };
      const id = location.slice(location.lastIndexOf("/") + 1);

      // wait the ttl
      await new Promise((r) => setTimeout(r, ttl + 200));

      const responseGet = await request(server)
        .get(`/notifications/${id}`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(responseGet.body).toStrictEqual({
        detail: `Notification ${id} not found`,
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(responseGet.status).toBe(404);
    });

    it("should throw NotFoundError when deleting a with notification that does not exist", async () => {
      expect.assertions(2);
      const response = await request(server)
        .delete(`/notifications/fakeId`)
        .auth(testUser1.token, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Notification fakeId not found",
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
