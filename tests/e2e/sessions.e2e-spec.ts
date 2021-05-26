import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { SessionToken } from "../../src/shared/interfaces";
import { UserAuthentication } from "../../src/shared/dto";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";

jest.setTimeout(60000);

describe("/onboarding/v1 sessions e2e tests", () => {
  let app: NestFastifyApplication;

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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  describe("POST /sessions", () => {
    /**
     * In order to enable and run the test below successfully, you need to set a one time valid eu-login ticket.
     * 1 - https://ecas.acceptance.ec.europa.eu/cas/login?service=http%3A%2F%2Flocalhost%3A3000%2Fonboarding%2Fauthentication&renew=false
     * 2 - Login with you EULogin user
     * 3 - Copy the ticket from redirected URL
     * 4 - Set ticket variable below
     */
    it.skip("should return session token for eulogin", async () => {
      expect.assertions(3);
      const ticket =
        "ST-1417448-Kl8HuFEiounCndj6IbQDUmqYKpCDY9kH1wxUQ39DOUmNT8phOg66r5ErqWMxH3JHLKurMHzoIfJ3S9ube3COC8-NaAc23CqASexIeoxDbDZLC-cp8icIJW7Z2RVzmXJZyCPvMKcCyPI712GF2T3ZL6caYRBKfuC08ueZm1TJIyNr6ajzhix1ZMVpa1fh5cSBqmNd"; // set valid ticket
      const body = {
        onboarding: "eu-login",
        info: {
          "eul-ticket": ticket,
        },
      } as UserAuthentication;
      const response = await request(app.getHttpServer())
        .post(`/sessions`)
        .send(body);

      expect(response.body).toHaveProperty("Bearer");
      const token = (response.body as SessionToken).Bearer;
      expect(token).toBeDefined();
      expect(response.status).toBe(201);
    });

    /**
     * In order to enable and run the test below successfully, you need to set a valid recaptcha token
     * 1 - Run locally users-onboarding-web-client
     * 2 - Inspect console and click on Sign in with Captcha
     * 3 - Copy the token printed
     * 4 - Set token variable below
     */
    it.skip("should return session token for recaptcha", async () => {
      expect.assertions(3);
      const recaptchaToken =
        "03AGdBq27RQJBTEqUlIHLdA99RNVXyCqq1EdrD2pJ_xt8f4AHaYCLR7bgYQcaJdXkdM95-NSF5rozk3gzHNbFKsyxTCgHLuw0x3pinq_ueuugAjGJIowDYsSQxM0-PBL0sQC4sXeYluKBOExRXdjfYjLlI8FMrsQB9OSaF43OUjzStwohEnhnEKC9gFj1q46gGqKdvXA9ZZgjCW_gDLWjmJu-EPf_JqUrs9RAiGWJ5OefMXU8P_RpefWbuF0VPrqXS_KM4yjaQw1QVYaYG6PeHNS2wLwMxpRDkNoRybm2plV4Gd8jybUm-4bOtGeSuYIBr2csqg7qC7TY3IzYsPBQQMSZIOdaWeDnhceJlRDECyKVYk5nIZmMssSLTLFAwXgcOYxulRsNuWtnocF2W9Oed_7w7vnnU-tx0hFrqQ9vY17Gjsppo3EWtO-_9nmedFRkD0cQvcnsJNQu2"; // set valid token
      const body = {
        onboarding: "recaptcha",
        info: {
          token: recaptchaToken,
        },
      } as UserAuthentication;
      const response = await request(app.getHttpServer())
        .post(`/sessions`)
        .send(body);

      expect(response.body).toHaveProperty("Bearer");
      const token = (response.body as SessionToken).Bearer;
      expect(token).toBeDefined();
      expect(response.status).toBe(201);
    });
  });
});
