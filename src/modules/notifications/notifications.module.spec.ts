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
import { ConfigService } from "@nestjs/config";
import { CassandraService } from "../cassandra/cassandra.service";
import { NotificationsModule } from "./notifications.module";
import { Notification } from "./notifications.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { EbsiValidationPipe } from "../../pipes/ebsi-validation.pipe";
import {
  validNotifications,
  resultNotifications,
  storedNotifications,
} from "../../../tests/utils/notifications";
import { initSetupForTesting } from "../../../tests/utils/tokens";
import { ConfigObject } from "../../config/configuration";

jest.mock("cassandra-driver");

describe("Notifications module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    const configService = app.get<ConfigService<ConfigObject>>(ConfigService);
    const { token } = initSetupForTesting(configService);
    testToken = token;
    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
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

      const notification = validNotifications[0];

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
      jest.resetAllMocks();
    });
  });

  describe("GET /notifications", () => {
    it("should return a list of notification", async () => {
      expect.assertions(2);
      jest
        .spyOn(CassandraService.prototype, "getNotifications")
        .mockResolvedValue(storedNotifications);

      const response = await request(server)
        .get("/notifications")
        .set("Authorization", `Bearer ${testToken}`);
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/notifications?page[after]=1&page[size]=10"
        ) as string,
        items: resultNotifications.map((result) => {
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
