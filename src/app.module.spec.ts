import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";

import AppModule from "./app.module";
import AllExceptionsFilter from "./filters/http-exception.filter";

describe("App Module", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("Get /health returns ok", async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      "/trusted-issuers-registry/v2/health"
    );
    expect(response.status).toBe(200);
    expect(response.text).toBe("ok");
  });
});
