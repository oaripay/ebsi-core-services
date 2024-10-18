import { describe, beforeAll, it, expect } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import { OpenApiModule } from "./openapi.module.js";

describe("OpenApiController", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OpenApiModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    const fastifyInstance = app.getHttpAdapter().getInstance();
    await fastifyInstance.ready();
    server = app.getHttpServer();
  });

  it("should serve yaml", async () => {
    const response = await request(server).get("/openapi.yaml");
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, unknown>)["content-type"]).toBe(
      "application/openapi+yaml",
    );
    expect(response.body).toBeDefined();
  });

  it("should serve json", async () => {
    const response = await request(server).get("/openapi.json");
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, unknown>)["content-type"]).toBe(
      "application/openapi+json; charset=utf-8",
    );
    expect(response.body).toBeDefined();
  });
});
