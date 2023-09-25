import { jest, describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { INestApplication, Logger } from "@nestjs/common";
import * as DidJwt from "did-jwt";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import * as OAuth2lib from "@cef-ebsi/oauth2-auth";
import type { JwtTarVerifyResult } from "@cef-ebsi/oauth2-auth";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
import { JwtCacheService } from "./jwt-cache.service";
import { ApiConfig } from "../../config/configuration";

jest.mock("did-jwt", () => ({
  decodeJWT: jest.fn(),
}));

jest.mock("@cef-ebsi/oauth2-auth", () => ({
  verifyJwtTar: jest.fn(),
}));

describe("Auth Module", () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtCacheService: JwtCacheService;
  let trustedAppsRegistryApiUrl: string;

  const mockVerifyAccessToken = jest.spyOn(OAuth2lib, "verifyJwtTar");
  const mockDecodeJwt = jest.spyOn(DidJwt, "decodeJWT");

  beforeAll(async () => {
    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
      app.get<ConfigService<ApiConfig, true>>(ConfigService);
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    authService = moduleFixture.get<AuthService>(AuthService);
    jwtCacheService = moduleFixture.get<JwtCacheService>(JwtCacheService);

    trustedAppsRegistryApiUrl = configService.get("trustedAppsRegistryApiUrl");
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Auth Service", () => {
    it("should not need validate a JWT that has already been validated", async () => {
      expect.assertions(24);

      const now = Math.floor(Date.now() / 1000);
      const kid = trustedAppsRegistryApiUrl;

      let jwtPayload = { exp: now + 30 };

      // Prepare mocks
      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
            protectedHeader: { kid },
          } as JwtTarVerifyResult)
      );

      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
          kid,
        },
        signature: "",
        payload: jwtPayload,
        data: "",
      }));

      // Setup spys
      const jwtCacheAddSpy = jest.spyOn(jwtCacheService, "add");
      const jwtCacheIsValidSpy = jest.spyOn(jwtCacheService, "isValid");
      const jwtCacheRemoveSpy = jest.spyOn(jwtCacheService, "remove");
      const jwtCacheClearSpy = jest.spyOn(jwtCacheService, "clear");

      /*
       * Validate a token for the first time
       */
      let returnedPayload = await authService.validateToken(
        "token",
        "api.local"
      );

      expect(returnedPayload).toStrictEqual(jwtPayload);
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(1);
      // The token doesn't exist yet in cache
      expect(jwtCacheIsValidSpy).toHaveLastReturnedWith(false);
      // The JWT is added to the cache
      expect(jwtCacheAddSpy).toHaveBeenCalledTimes(1);
      expect(jwtCacheAddSpy).toHaveBeenCalledWith("token", jwtPayload.exp);

      /*
       * Run a second time
       */
      returnedPayload = await authService.validateToken("token", "api.local");
      expect(returnedPayload).toStrictEqual(jwtPayload);
      // Check that mockVerifyAccessToken has not been called a second time, and mockDecodeJwt has been called
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(1);
      // The token exists yet in cache
      expect(jwtCacheIsValidSpy).toHaveLastReturnedWith(true);
      // The JWT is not added to the cache (same number of calls to "add" as before)
      expect(jwtCacheAddSpy).toHaveBeenCalledTimes(1);

      /*
       * Run a third time
       * Back to the future: the cached JWT should be expired
       */
      const dateSpy = jest
        .spyOn(global.Date, "now")
        .mockImplementation(() => (now + 35) * 1000);

      // The new token is more recent
      jwtPayload = { exp: now + 40 };

      // Update mocks
      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
            protectedHeader: { kid },
          } as JwtTarVerifyResult)
      );

      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
          kid,
        },
        signature: "",
        payload: jwtPayload,
        data: "",
      }));

      returnedPayload = await authService.validateToken("token", "api.local");

      expect(returnedPayload).toStrictEqual(jwtPayload);
      expect(dateSpy).toHaveBeenCalledTimes(1);
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(2);
      // The token in the cache is not valid anymore
      expect(jwtCacheIsValidSpy).toHaveLastReturnedWith(false);
      // The token is removed from the cache
      expect(jwtCacheRemoveSpy).toHaveBeenCalledTimes(1);
      expect(jwtCacheRemoveSpy).toHaveBeenCalledWith("token");
      // The new JWT is added to the cache
      expect(jwtCacheAddSpy).toHaveBeenCalledTimes(2);
      expect(jwtCacheAddSpy).toHaveBeenLastCalledWith("token", jwtPayload.exp);

      /*
       * Run a fourth time
       * Back to the future (2): it's time to clear the cache (6 minutes later)
       */
      const futureNow = now + 6 * 60;

      // The new token is more recent
      jwtPayload = { exp: now + 6 * 60 + 5 };

      // Update mocks
      dateSpy.mockImplementation(() => futureNow * 1000);

      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
            protectedHeader: { kid },
          } as JwtTarVerifyResult)
      );

      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
          kid,
        },
        signature: "",
        payload: jwtPayload,
        data: "",
      }));

      returnedPayload = await authService.validateToken("token", "api.local");

      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(3);
      // The cache has been cleared
      expect(jwtCacheClearSpy).toHaveBeenCalledWith(futureNow);
      expect(jwtCacheClearSpy).toHaveBeenCalledTimes(1);
      // The token is removed from the cache
      expect(jwtCacheRemoveSpy).toHaveBeenCalledTimes(2);
      expect(jwtCacheRemoveSpy).toHaveBeenLastCalledWith("token");
      // The new JWT is added to the cache
      expect(jwtCacheAddSpy).toHaveBeenCalledTimes(3);
      expect(jwtCacheAddSpy).toHaveBeenLastCalledWith("token", jwtPayload.exp);
    });

    it("should accept tokens issued by from Authorisation API v4", async () => {
      expect.assertions(1);

      const now = Math.floor(Date.now() / 1000);
      const jwtPayload = { exp: now + 30 };

      // kid using TAR v4
      const kid = `${trustedAppsRegistryApiUrl}/apps/authorisation-api`;

      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVerifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
            protectedHeader: { kid },
          } as JwtTarVerifyResult)
      );
      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
          kid,
        },
        signature: "",
        payload: jwtPayload,
        data: "",
      }));

      await authService.validateToken("tokenV4", "api.local");

      expect(mockVerifyAccessToken).toHaveBeenLastCalledWith("tokenV4", {
        trustedAppsRegistry: `${trustedAppsRegistryApiUrl}/apps`,
        op: expect.any(String),
        timeout: expect.any(Number),
      });
    });
  });
});
