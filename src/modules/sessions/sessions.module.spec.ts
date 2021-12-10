import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  HttpServer,
  ValidationPipe,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import { decodeJWT } from "did-jwt";
import { ApiConfig } from "../../config/configuration";
import { SessionsModule } from "./sessions.module";
import { SessionToken, UserEU } from "../../shared/interfaces/index";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import SessionsService from "./sessions.service";

describe("Sessions Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SessionsModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("POST /sessions", () => {
    it("should reject bad requests", async () => {
      expect.assertions(3);
      const response = await request(server)
        .post("/sessions")
        .send("invalid string");
      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["onboarding must be one of the following values: eu-login, recaptcha","info must be a non-empty object"]',
        type: "about:blank",
      });
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a session token for recaptcha", async () => {
      expect.assertions(3);
      const body = {
        onboarding: "recaptcha",
        info: {
          token: "fakeToken",
        },
      };
      const validatedInfo = {
        success: true,
        score: 1,
        action: "onboarding",
        challenge_ts: 1616575166,
        hostname: configService.get<string>("recaptchaService"),
        "error-codes": [],
      };
      jest
        .spyOn(SessionsService.prototype, "validateOnboarding")
        .mockResolvedValueOnce(validatedInfo);
      const response = await request(server).post("/sessions").send(body);
      expect(response.status).toBe(201);
      const responseBody = response.body as SessionToken;
      expect(responseBody.Bearer).toBeDefined();
      expect(decodeJWT(responseBody.Bearer).payload).toStrictEqual(
        expect.objectContaining({
          iat: expect.any(Number) as number,
          iss: configService.get<string>("applicationDid"),
          onboarding: body.onboarding,
          validatedInfo,
        })
      );
    });

    it("should return a session token for eu-login", async () => {
      expect.assertions(3);

      const body = {
        onboarding: "eu-login",
        info: {
          "eul-ticket": "EUL login ticket number",
        },
      };
      const validatedInfo = {
        validatedUser: {
          user: "test",
        } as UserEU,
      };
      jest
        .spyOn(SessionsService.prototype, "validateOnboarding")
        .mockResolvedValueOnce(validatedInfo);
      const response = await request(server).post("/sessions").send(body);
      expect(response.status).toBe(201);
      const responseBody = response.body as SessionToken;
      expect(responseBody.Bearer).toBeDefined();
      expect(decodeJWT(responseBody.Bearer).payload).toStrictEqual(
        expect.objectContaining({
          iat: expect.any(Number) as number,
          iss: configService.get<string>("applicationDid"),
          onboarding: body.onboarding,
          validatedInfo,
        })
      );
    });
  });
});
