import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import AppModule from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  HashesListResponseObject,
  HashResponseObject,
} from "../../src/modules/hashes/types/hashes.interface";

interface SupertestHashesResponse {
  status: number;
  body: HashesListResponseObject;
}

jest.setTimeout(60000);
describe("appController (e2e)", () => {
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
    Logger.overrideLogger(false);
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  it(`(GET) timestamp/v1/health`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(`/health`);

    expect(response.body).toStrictEqual({
      details: { "ebsi-apis": { status: "up" } },
      error: {},
      info: { "ebsi-apis": { status: "up" } },
      status: "ok",
    });
    expect(response.status).toBe(200);
  });
  it("rejects a bad method", async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get("/bad-method");

    expect(response.body).toStrictEqual({
      title: "Invalid service",
      status: 404,
      detail: "Cannot GET /bad-method",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });
  it(`gets a specific Hash`, async () => {
    expect.assertions(3);
    const hashes: SupertestHashesResponse = await request(
      app.getHttpServer()
    ).get(`/hashes?page[size]=1`);
    expect(hashes.status).toBe(200);
    const lastRec: HashResponseObject = hashes.body.items[0];

    const response = await request(app.getHttpServer()).get(
      `/hashes/${lastRec.hash}`
    );

    expect(response.body).toStrictEqual({
      hash: lastRec.hash,
      txHash: lastRec.txHash,
      blockNumber: lastRec.blockNumber,
      timestamp: lastRec.timestamp,
      registeredBy: lastRec.registeredBy,
    });
    expect(response.status).toBe(200);
  });

  it(`throws error for malformed hash`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/hashes/unknown-Hash`
    );
    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail: expect.stringContaining("INVALID_ARGUMENT") as unknown,
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });
  it(`throws error for Hash not found`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/hashes/9d835ec5cc060cbef177a45ec9219e2831c11048aaf130e5f6690619f999999f`
    );
    expect(response.body).toStrictEqual({
      title: "Not Found",
      status: 404,
      detail:
        "Document hash '9d835ec5cc060cbef177a45ec9219e2831c11048aaf130e5f6690619f999999f' not found",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });
});
