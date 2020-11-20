import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, Logger } from "@nestjs/common";
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
import {
  createNotification,
  createToken,
  randomDid,
} from "../utils/notifications";

jest.setTimeout(30000);

describe("Notifications module (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  const did = randomDid();
  const token = createToken(did);

  const expectedNotifications = [...Array(11).keys()].map(() =>
    createNotification(did)
  );
  expectedNotifications.sort((a, b) =>
    a.issuanceDate > b.issuanceDate ? 1 : -1
  );

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

    // create multiple notifications
    await Promise.all(
      expectedNotifications.slice(0, 10).map((n) => {
        return request(server).post("/notifications").send(n);
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
        .send(notification);

      expect(response.body).toStrictEqual({
        detail: "Your request parameters didn't validate.",
        "invalid-params": {
          expirationDate: ["expirationDate must be a ISOString"],
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
    });
  });

  describe("GET /notifications", () => {
    it("should return a list of notifications", async () => {
      expect.assertions(2);
      const response = await request(server)
        .get("/notifications")
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=10"
        ) as string,
        items: expectedNotifications.slice(0, 10).map((notif) => {
          const id = crypto
            .createHash("sha3-256")
            .update(JSON.stringify(notif), "utf8")
            .digest("hex");
          return {
            ...notif,
            _links: {
              self: {
                href: expect.stringContaining(`/notifications/${id}`) as string,
              },
            },
          };
        }),
        total: 11,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=2&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=2&page[size]=10"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return a list with only 1 notification", async () => {
      expect.assertions(2);
      const pageAfter = 2;
      const pageSize = 10;
      const response = await request(server)
        .get(`/notifications?page[after]=${pageAfter}&page[size]=${pageSize}`)
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=2&page[size]=10"
        ) as string,
        items: expectedNotifications.slice(10, 11).map((notif) => {
          const id = crypto
            .createHash("sha3-256")
            .update(JSON.stringify(notif), "utf8")
            .digest("hex");
          return {
            ...notif,
            _links: {
              self: {
                href: expect.stringContaining(`/notifications/${id}`) as string,
              },
            },
          };
        }),
        total: 11,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=2&page[size]=10"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=2&page[size]=10"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return page 1 with 2 notifications", async () => {
      expect.assertions(2);
      const pageAfter = 1;
      const pageSize = 2;
      const response = await request(server)
        .get(`/notifications?page[after]=${pageAfter}&page[size]=${pageSize}`)
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=2"
        ) as string,
        items: expectedNotifications.slice(0, 2).map((notif) => {
          const id = crypto
            .createHash("sha3-256")
            .update(JSON.stringify(notif), "utf8")
            .digest("hex");
          return {
            ...notif,
            _links: {
              self: {
                href: expect.stringContaining(`/notifications/${id}`) as string,
              },
            },
          };
        }),
        total: 11,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=2&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return page 3 with 2 notifications", async () => {
      expect.assertions(2);
      const pageAfter = 3;
      const pageSize = 2;
      const response = await request(server)
        .get(`/notifications?page[after]=${pageAfter}&page[size]=${pageSize}`)
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=3&page[size]=2"
        ) as string,
        items: expectedNotifications.slice(4, 6).map((notif) => {
          const id = crypto
            .createHash("sha3-256")
            .update(JSON.stringify(notif), "utf8")
            .digest("hex");
          return {
            ...notif,
            _links: {
              self: {
                href: expect.stringContaining(`/notifications/${id}`) as string,
              },
            },
          };
        }),
        total: 11,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=2&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=4&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return page 6 with only 1 notifications", async () => {
      expect.assertions(2);
      const pageAfter = 6;
      const pageSize = 2;
      const response = await request(server)
        .get(`/notifications?page[after]=${pageAfter}&page[size]=${pageSize}`)
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=6&page[size]=2"
        ) as string,
        items: expectedNotifications.slice(10, 11).map((notif) => {
          const id = crypto
            .createHash("sha3-256")
            .update(JSON.stringify(notif), "utf8")
            .digest("hex");
          return {
            ...notif,
            _links: {
              self: {
                href: expect.stringContaining(`/notifications/${id}`) as string,
              },
            },
          };
        }),
        total: 11,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=5&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return last page when page > lastPage", async () => {
      expect.assertions(2);
      const pageAfter = 20;
      const pageSize = 2;
      const response = await request(server)
        .get(`/notifications?page[after]=${pageAfter}&page[size]=${pageSize}`)
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=20&page[size]=2"
        ) as string,
        items: [],
        total: 11,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/notifications?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
          ) as string,
          last: expect.stringContaining(
            "/notifications?page[after]=6&page[size]=2"
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
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual(notification);
      expect(response.status).toBe(200);
    });

    it("should throw NotFoundError if notification does not exist", async () => {
      expect.assertions(2);
      const notificationId = "fakeId";
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
    });

    it("should throw NotFoundError if specified notification does not match receiver", async () => {
      expect.assertions(2);
      const anotherDid = randomDid();
      const anotherToken = createToken(anotherDid);
      const [notification] = expectedNotifications;
      const notificationId = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");
      const response = await request(server)
        .get(`/notifications/${notificationId}`)
        .set("Authorization", `Bearer ${anotherToken}`);
      expect(response.body).toStrictEqual({
        detail: "Id parameter not found",
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /notifications/{id}", () => {
    it("should delete the notification", async () => {
      expect.assertions(5);

      const notification = createNotification(did);
      const responseInsert = await request(server)
        .post("/notifications")
        .send(notification);
      expect(responseInsert.status).toBe(201);
      const { location } = responseInsert.headers as { location: string };
      const id = location.slice(location.lastIndexOf("/") + 1);

      const response = await request(server)
        .delete(`/notifications/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);

      const responseGet = await request(server)
        .get(`/notifications/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(responseGet.body).toStrictEqual({
        detail: "Id parameter not found",
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(responseGet.status).toBe(404);
    });

    it("should delete the notification after the ttl", async () => {
      expect.assertions(3);

      const notification = createNotification(did);
      // expiration in 10 seconds
      const ttl = 5000; // ms
      notification.expirationDate = new Date(
        new Date(notification.issuanceDate).getTime() + ttl
      ).toISOString();
      const responseInsert = await request(server)
        .post("/notifications")
        .send(notification);
      expect(responseInsert.status).toBe(201);
      const { location } = responseInsert.headers as { location: string };
      const id = location.slice(location.lastIndexOf("/") + 1);

      // wait the ttl
      await new Promise((r) => setTimeout(r, ttl + 200));

      const responseGet = await request(server)
        .get(`/notifications/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(responseGet.body).toStrictEqual({
        detail: "Id parameter not found",
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
        .set("Authorization", `Bearer ${token}`);
      expect(response.body).toStrictEqual({
        detail: "Id parameter not found",
        status: 404,
        title: "Notification Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
