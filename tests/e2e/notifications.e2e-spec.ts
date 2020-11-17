import crypto from "crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer, Logger } from "@nestjs/common";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { EbsiValidationPipe } from "../../src/pipes/ebsi-validation.pipe";
import { validNotifications } from "../utils/notifications";
import { Notification } from "../../src/modules/notifications/notifications.interface";
import { initSetupForTesting } from "../utils/tokens";
import { ConfigObject } from "../../src/config/configuration";

jest.setTimeout(30000);

describe("Notifications module (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
  let validNoti = new Array<Notification>();
  let testDid: string;
  let testToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());
    const configService = app.get<ConfigService<ConfigObject>>(ConfigService);
    const { did, token } = initSetupForTesting(configService);
    testDid = did;
    testToken = token;
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
    it("should create a notification", async () => {
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
      notification.to = testDid;
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
      notification.to = testDid;

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
    beforeAll(async () => {
      const expiredInsertions = [...Array(3).keys()];
      const validInsertions = [...Array(11).keys()];
      const today = new Date();
      const issuanceDate = new Date(today);
      const past = new Date(today);
      const future = new Date(today);
      issuanceDate.setDate(past.getDate() - 2);
      past.setDate(past.getDate() - 3);
      let noti = validNotifications[0];
      const expiredInsertionsPromises = expiredInsertions.map(async () => {
        noti = {
          schemaId: noti.schemaId,
          "@context": noti["@context"],
          type: noti.type,
          from: noti.from,
          to: testDid,
          issuanceDate: issuanceDate.toISOString(),
          expirationDate: past.toISOString(),
          payload: {},
          proof: noti.proof,
        };
        return request(server).post("/notifications").send(noti);
      });
      await Promise.all(expiredInsertionsPromises);
      const validInsertionsPromises = validInsertions.map(async () => {
        future.setDate(future.getDate() + 1);
        issuanceDate.setDate(future.getDate() - 1);
        noti = {
          schemaId: noti.schemaId,
          "@context": noti["@context"],
          type: noti.type,
          from: noti.from,
          to: testDid,
          issuanceDate: issuanceDate.toISOString(),
          expirationDate: future.toISOString(),
          payload: {},
          proof: noti.proof,
        };
        validNoti = validNoti.concat(noti);
        return request(server).post("/notifications").send(noti);
      });
      await Promise.all(validInsertionsPromises);
    });

    it("should return a list of notifications", async () => {
      expect.assertions(2);
      const response = await request(server)
        .get("/notifications")
        .set("Authorization", `Bearer ${testToken}`);
      const expectedNotifications = validNoti.slice(0, 10);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=10"
        ) as string,
        items: expectedNotifications.map((notif) => {
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
        .set("Authorization", `Bearer ${testToken}`);
      const expectedNotifications = validNoti.slice(10, 11);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=2&page[size]=10"
        ) as string,
        items: expectedNotifications.map((notif) => {
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
        .set("Authorization", `Bearer ${testToken}`);
      const expectedNotifications = validNoti.slice(0, 2);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=2"
        ) as string,
        items: expectedNotifications.map((notif) => {
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
        .set("Authorization", `Bearer ${testToken}`);
      const expectedNotifications = validNoti.slice(4, 6);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=3&page[size]=2"
        ) as string,
        items: expectedNotifications.map((notif) => {
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
        .set("Authorization", `Bearer ${testToken}`);
      const expectedNotifications = validNoti.slice(10, 11);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=6&page[size]=2"
        ) as string,
        items: expectedNotifications.map((notif) => {
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
        .set("Authorization", `Bearer ${testToken}`);
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
    it("should retrieve the notification", async () => {
      expect.assertions(2);
      const response = await request(server).get(`/notifications/123`);
      const expected = validNotifications[0];
      expected.to = "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93";
      expect(response.body).toStrictEqual(expected);
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
