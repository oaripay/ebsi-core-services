import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, HttpServer, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";

describe("App Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    // Mock WebSocketProvider
    jest
      .spyOn(ethers.providers, "WebSocketProvider")
      .mockImplementation(
        () =>
          new ethers.providers.BaseProvider(
            "any"
          ) as ethers.providers.WebSocketProvider
      );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  it("GET / should return 'ok'", async () => {
    expect.assertions(2);
    const response = await request(server).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("ok");
  });
});
