import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Logger, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AppModule } from "./app.module";
import { EbsiValidationPipe } from "./pipes/ebsi-validation.pipe";
import { AllExceptionsFilter } from "./filters/http-exception.filter";
import { EbsiThrottler } from "./guards";
import { ApiConfig } from "./config/configuration";

describe("App module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new EbsiValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("GET /", () => {
    it("should return 'ok'", async () => {
      expect.assertions(2);

      const response = await request(server).get("/");

      expect(response.text).toStrictEqual("ok");
      expect(response.status).toBe(200);
    });

    it("throw an error 429 when too many requests are made from the same IP", async () => {
      expect.assertions(2);

      // If the requester isn't allowed to bypass the throttler (e.g. not a local request)
      jest
        .spyOn(EbsiThrottler.prototype, "canBypassThrottler")
        .mockReturnValue(false);

      let response: request.Response;
      for (
        let i = 0;
        i < configService.get<number>("throttleLimit") + 1;
        i += 1
      ) {
        // eslint-disable-next-line no-await-in-loop
        response = await request(server).get("/");
      }

      // Check last response
      expect(response.body).toStrictEqual({
        title: "Too Many Requests",
        status: 429,
        type: "about:blank",
      });
      expect(response.status).toBe(429);
    });
  });
});
