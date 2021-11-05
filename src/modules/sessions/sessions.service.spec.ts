import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "did-jwt";
import * as fs from "fs";
import axios from "axios";
import { UserAuthentication } from "../../shared/dto";
import { UserEU } from "../../shared/interfaces";
import { InvalidUserAuthentication } from "../../errors";
import { OnboardingErrors } from "../../errors/errorCodes";
import * as SessionsModule from "./sessions.module";
import { ApiConfig } from "../../config/configuration";
import SessionsService from "./sessions.service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("sessions service tests", () => {
  let app: INestApplication;
  let configService: ConfigService<ApiConfig>;
  let sessionsService: SessionsService;
  let userEU: Buffer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [SessionsModule.default],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    Logger.overrideLogger(false);

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    sessionsService = new SessionsService(configService);
    userEU = fs.readFileSync("tests/data/ecasTicket.xml");
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("validateOnboarding", () => {
    it("should validate recaptcha onboarding", async () => {
      expect.assertions(1);
      const userAuthentication: UserAuthentication = {
        onboarding: "recaptcha",
        info: {
          token: "fakeToken",
        },
      };
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          score: 1,
          action: "onboarding",
          challenge_ts: 1616575166,
          hostname: configService.get<string>("recaptchaRegisteredHostname"),
          "error-codes": [],
        },
      });
      const validation = await sessionsService.validateOnboarding(
        userAuthentication
      );
      expect(validation).toBeDefined();
    });

    it("should validate eu-login onboarding", async () => {
      expect.assertions(1);
      const userAuthentication: UserAuthentication = {
        onboarding: "eu-login",
        info: {
          "eul-ticket": "EU Login ticket number",
        },
      };
      mockedAxios.get.mockResolvedValue({
        data: userEU,
      });
      const validation = await sessionsService.validateOnboarding(
        userAuthentication
      );
      expect(validation).toBeDefined();
    });

    it("should throw UNSUPPORTED_ONBOARDING error for unsupported onboarding", async () => {
      expect.assertions(1);
      const userAuthentication: UserAuthentication = {
        onboarding: "random",
        info: {
          token: "fakeToken",
        },
      };
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          score: 1,
          action: "onboarding",
          challenge_ts: 1616575166,
          hostname: configService.get<string>("recaptchaRegisteredHostname"),
          "error-codes": [],
        },
      });
      await expect(
        sessionsService.validateOnboarding(userAuthentication)
      ).rejects.toThrow(
        new InvalidUserAuthentication(OnboardingErrors.UNSUPPORTED_ONBOARDING)
      );
    });
  });

  describe("parseEULoginUser", () => {
    it("should parse eu-login user", async () => {
      expect.assertions(1);
      const json = await sessionsService.parseEULoginUser(userEU.toString());
      expect(json.uid).toBe("evatest");
    });

    it("should throw ERROR_EUTICKET_PARSE error to parse eu-login user", async () => {
      expect.assertions(1);
      await expect(
        sessionsService.parseEULoginUser("Invalid xml")
      ).rejects.toThrow(
        new InvalidUserAuthentication(OnboardingErrors.ERROR_EUTICKET_PARSE)
      );
    });

    it("should throw ERROR_EUTICKET_VALIDATION error when authentication fails", async () => {
      expect.assertions(1);

      await expect(
        sessionsService.parseEULoginUser(`<?xml version="1.0" encoding="utf-8"?>
    <cas:serviceResponse xmlns:cas="https://ecas.ec.europa.eu/cas/schemas"
        server="EU Login ACCEPTANCE_GENESIS version 1.2.3.a.4567 - 22/03/2021 - 18:39"
        date="2021-05-25T13:44:05.313+02:00"
        version="8.3">
        <cas:authenticationFailure code="INVALID_SERVICE">
            ticket &apos;ST-XXXXXXXX-YYYYYYYY&apos; does not match supplied service
        </cas:authenticationFailure>
    </cas:serviceResponse>`)
      ).rejects.toThrow(
        new InvalidUserAuthentication(
          OnboardingErrors.ERROR_EUTICKET_VALIDATION
        )
      );
    });
  });

  describe("validateTicket", () => {
    it("should validate eu-login ticket", async () => {
      expect.assertions(1);
      mockedAxios.get.mockResolvedValue({
        data: userEU,
      });
      const json = await sessionsService.parseEULoginUser(userEU.toString());
      const validation = await sessionsService.validateTicket("dummyTicket");
      expect(validation).toStrictEqual({ validatedUser: json });
    });

    it("should throw error when EUTICKET_NOT_RESOLVED", async () => {
      expect.assertions(1);
      mockedAxios.get.mockResolvedValue({});
      await expect(
        sessionsService.validateTicket(userEU.toString())
      ).rejects.toThrow(
        new InvalidUserAuthentication(OnboardingErrors.EUTICKET_NOT_RESOLVED)
      );
    });

    it("should throw error when ERROR_EUTICKET_VALIDATION", async () => {
      expect.assertions(1);
      mockedAxios.get.mockResolvedValue({
        data: userEU,
      });
      jest
        .spyOn(sessionsService, "parseEULoginUser")
        .mockResolvedValue(undefined);
      await expect(
        sessionsService.validateTicket(userEU.toString())
      ).rejects.toThrow(
        new InvalidUserAuthentication(
          OnboardingErrors.ERROR_EUTICKET_VALIDATION
        )
      );
    });
  });

  describe("validateRecaptcha", () => {
    it("should return true for a valid CaptchaAuthenticationInfo", () => {
      expect.assertions(1);
      mockedAxios.get.mockResolvedValue({
        data: {
          success: true,
          score: 1,
          action: "onboarding",
          challenge_ts: 1616575166,
          hostname: configService.get<string>("recaptchaRegisteredHostname"),
          "error-codes": [],
        },
      });
      expect(sessionsService.validateRecaptcha("fakeToken")).toBeTruthy();
    });

    it("should return undefined for a unsuccess CaptchaAuthenticationInfo", async () => {
      expect.assertions(1);
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          score: 1,
          action: "onboarding",
          challenge_ts: 1616575166,
          hostname: configService.get<string>("recaptchaRegisteredHostname"),
          "error-codes": [],
        },
      });
      expect(
        await sessionsService.validateRecaptcha("fakeToken")
      ).toBeUndefined();
    });

    it("should return undefined for a unknown hostname CaptchaAuthenticationInfo", async () => {
      expect.assertions(1);
      mockedAxios.get.mockResolvedValue({
        data: {
          success: false,
          score: 1,
          action: "onboarding",
          challenge_ts: 1616575166,
          hostname: configService.get<string>("recaptchaRegisteredHostname"),
          "error-codes": [],
        },
      });
      expect(
        await sessionsService.validateRecaptcha("fakeToken")
      ).toBeUndefined();
    });
  });

  describe("provideSessionToken", () => {
    it("should create a valid session token for a validated recaptcha UserAuthentication", async () => {
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
        hostname: configService.get<string>("recaptchaRegisteredHostname"),
        "error-codes": [],
      };
      const token = await sessionsService.provideSessionToken(
        body,
        validatedInfo
      );
      expect(token).toBeDefined();
      expect(token).toHaveProperty("Bearer");
      expect(decodeJWT(token.Bearer).payload).toStrictEqual(
        expect.objectContaining({
          iat: expect.any(Number) as number,
          iss: configService.get<string>("applicationDid"),
          exp: expect.any(Number) as number,
          onboarding: body.onboarding,
          validatedInfo,
        })
      );
    });

    it("should create a valid session token for a validated eu-login UserAuthentication", async () => {
      expect.assertions(3);
      const body = {
        onboarding: "eu-login",
        info: {
          "eul-ticket": "EU Login ticket number",
        },
      };
      const validatedInfo = {
        validatedUser: {
          user: "test",
        } as UserEU,
      };
      const token = await sessionsService.provideSessionToken(
        body,
        validatedInfo
      );
      expect(token).toBeDefined();
      expect(token).toHaveProperty("Bearer");
      expect(decodeJWT(token.Bearer).payload).toStrictEqual(
        expect.objectContaining({
          iat: expect.any(Number) as number,
          iss: configService.get<string>("applicationDid"),
          exp: expect.any(Number) as number,
          onboarding: body.onboarding,
          validatedInfo,
        })
      );
    });
  });
});
