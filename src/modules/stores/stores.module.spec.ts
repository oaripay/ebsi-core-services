import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer, Logger } from "@nestjs/common";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { StoresModule } from "./stores.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { STORES } from "./stores.constants";

describe("Stores Module", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [StoresModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /stores", () => {
    it("should return the first 10 stores", async () => {
      expect.assertions(2);

      const response = await request(server).get("/stores").send();

      expect(response.body).toStrictEqual({
        items: STORES.slice(0, 10),
        links: {
          first: expect.stringContaining(
            "/stores?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/stores?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/stores?page[after]=${Math.min(
              2,
              Math.ceil(STORES.length / 10)
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/stores?page[after]=${Math.ceil(STORES.length / 10)}&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          "/stores?page[after]=1&page[size]=10"
        ) as string,
        total: STORES.length,
      });
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/stores?page[size]=2");
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/stores?page[after]=1&page[size]=2"
        ) as string,
        items: STORES.slice(0, 2),
        total: STORES.length,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/stores?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/stores?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            `/stores?page[after]=${Math.min(
              2,
              Math.ceil(STORES.length / 2)
            )}&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/stores?page[after]=${Math.ceil(STORES.length / 2)}&page[size]=2`
          ) as string,
        },
      });
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/stores?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/stores?page[after]=2&page[size]=2"
        ) as string,
        items: STORES.slice(2, 4),
        total: STORES.length,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/stores?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/stores?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            `/stores?page[after]=${Math.min(
              3,
              Math.ceil(STORES.length / 2)
            )}&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/stores?page[after]=${Math.ceil(STORES.length / 2)}&page[size]=2`
          ) as string,
        },
      });
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/stores?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/stores?page[after]=100&page[size]=2"
        ) as string,
        items: STORES.slice(198, 200),
        total: STORES.length,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/stores?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            `/stores?page[after]=${Math.min(
              99,
              Math.ceil(STORES.length / 2)
            )}&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/stores?page[after]=${Math.min(
              101,
              Math.ceil(STORES.length / 2)
            )}&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/stores?page[after]=${Math.ceil(STORES.length / 2)}&page[size]=2`
          ) as string,
        },
      });
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get("/stores?page[after]=1");
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/stores?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: STORES.length,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/stores?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/stores?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/stores?page[after]=${Math.min(
              2,
              Math.ceil(STORES.length / 10)
            )}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/stores?page[after]=${Math.ceil(STORES.length / 10)}&page[size]=10`
          ) as string,
        },
      });
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get("/stores?page[size]=100");
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/stores?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/stores?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get("/stores?page[after]=abc");
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /stores/{store}", () => {
    it("should return 204 if the store exists", async () => {
      expect.assertions(1);

      const store = STORES[0];

      const response = await request(server).get(`/stores/${store}`).send();

      expect(response.status).toBe(204);
    });

    it("should throw a NotFound error if the store doesn't exist", async () => {
      expect.assertions(2);

      const response = await request(server).get("/stores/test");

      expect(response.body).toStrictEqual({
        detail: 'Store "test" does not exist.',
        status: 404,
        title: "Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
