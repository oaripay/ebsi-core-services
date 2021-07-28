import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger, HttpServer } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { STORES } from "../../src/modules/stores/stores.constants";
import { fastifyAdapterConfig } from "../../src/config/server.config";

describe("Stores (e2e)", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig)
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  describe("GET /stores", () => {
    it("should return a paginated collection of stores", async () => {
      expect.assertions(2);

      const response = await request(server).get("/stores");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/stores?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/stores?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/stores?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining("/stores?page[after]=") as string,
          last: expect.stringContaining("/stores?page[after]=") as string,
        },
      });
      expect(response.status).toBe(200);
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
