import { describe, beforeAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpServer } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { OpenApiModule } from "./openapi.module";

describe("OpenApiController", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OpenApiModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  it("should serve yaml", async () => {
    const response = await request(server).get("/openapi.yaml");
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, unknown>)["content-type"]).toBe(
      "application/openapi+yaml"
    );
    expect(response.body).toBeDefined();
  });

  it("should serve json", async () => {
    const response = await request(server).get("/openapi.json");
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, unknown>)["content-type"]).toBe(
      "application/openapi+json; charset=utf-8"
    );
    expect(response.body).toBeDefined();
  });
});
