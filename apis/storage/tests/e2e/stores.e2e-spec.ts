import { describe, beforeAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { STORES } from "../../src/modules/stores/stores.constants.js";
import { fastifyAdapterConfig } from "../../src/config/server.config.js";
import { getServer } from "../utils/getServer.js";
import type { ApiConfig } from "../../src/config/configuration.js";

describe("Stores (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(fastifyAdapterConfig),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);
  });

  describe("GET /stores", () => {
    it("should return a paginated collection of stores", async () => {
      expect.assertions(2);

      const response = await request(server).get("/stores");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/stores?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: 10,
        links: {
          first: expect.stringContaining("/stores?page[after]=1&page[size]=10"),
          prev: expect.stringContaining("/stores?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/stores?page[after]="),
          last: expect.stringContaining("/stores?page[after]="),
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
