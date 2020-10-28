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
import { validNotifications } from "../utils/notifications";
import { Notification } from "../../src/modules/notifications/notifications.interface";

jest.setTimeout(10000);

describe("AppController (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /notifications", () => {
    it("should", async () => {
      expect.assertions(3);

      const notification = validNotifications[0];

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
      notification = { ...validNotifications[0] };
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
      notification = { ...validNotifications[0] };
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
    it("should return a list of notification", async () => {
      expect.assertions(2);

      const response = await request(server).get("/notifications");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=10"
        ) as string,
        items: validNotifications.map((notif) => {
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
    });
  });

  describe("GET /notifications/{id}", () => {
    it("should retrieve the notification", async () => {
      expect.assertions(2);

      const response = await request(server).get("/notifications/123");

      expect(response.body).toStrictEqual(validNotifications[0]);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /notifications/{id}", () => {
    it("should delete the notification", async () => {
      expect.assertions(2);

      const response = await request(server).delete("/notifications/123");

      expect(response.body).toStrictEqual({});
      expect(response.status).toBe(204);
    });
  });
});
