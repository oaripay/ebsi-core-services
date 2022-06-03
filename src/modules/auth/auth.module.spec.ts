import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Logger } from "@nestjs/common";
import * as DidJwt from "did-jwt";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import type { JwtTarVefifyResult } from "@cef-ebsi/oauth2-auth";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
import { JwtCacheService } from "./jwt-cache.service";

jest.mock("did-jwt", () => ({
  decodeJWT: jest.fn(),
}));

jest.mock("@cef-ebsi/oauth2-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/oauth2-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

describe("Auth Module", () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtCacheService: JwtCacheService;

  const mockVerifyAccessToken = jest.spyOn(OAuth2Lib, "verifyJwtTar");
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

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    authService = moduleFixture.get<AuthService>(AuthService);
    jwtCacheService = moduleFixture.get<JwtCacheService>(JwtCacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Auth Service", () => {
    it("should not need validate a JWT that has already been validated", async () => {
      expect.assertions(29);

      const now = Math.floor(Date.now() / 1000);

      let jwtPayload = { exp: now + 30, sub: "test" };

      // Prepare mocks
      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVefifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
          } as unknown as JwtTarVefifyResult)
      );

      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
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
      let returnedPayload = await authService.validateOAuth2Token(
        "token",
        "api.local"
      );

      expect(returnedPayload).toStrictEqual({ name: "test" });
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(1);
      expect(mockDecodeJwt).toHaveBeenCalledTimes(0);
      // The token doesn't exist yet in cache
      expect(jwtCacheIsValidSpy).toHaveLastReturnedWith(false);
      // The JWT is added to the cache
      expect(jwtCacheAddSpy).toHaveBeenCalledTimes(1);
      expect(jwtCacheAddSpy).toHaveBeenCalledWith("token", jwtPayload.exp);

      /*
       * Run a second time
       */
      returnedPayload = await authService.validateOAuth2Token(
        "token",
        "api.local"
      );
      expect(returnedPayload).toStrictEqual({ name: "test" });
      // Check that mockVerifyAccessToken has not been called a second time, and mockDecodeJwt has been called
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(1);
      expect(mockDecodeJwt).toHaveBeenCalledTimes(1);
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
      jwtPayload = { exp: now + 40, sub: "test 2" };

      // Update mocks
      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVefifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
          } as unknown as JwtTarVefifyResult)
      );

      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
        },
        signature: "",
        payload: jwtPayload,
        data: "",
      }));

      returnedPayload = await authService.validateOAuth2Token(
        "token",
        "api.local"
      );

      expect(returnedPayload).toStrictEqual({ name: "test 2" });
      expect(dateSpy).toHaveBeenCalledTimes(1);
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(2);
      expect(mockDecodeJwt).toHaveBeenCalledTimes(1);
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
      jwtPayload = { exp: now + 6 * 60 + 5, sub: "test 3" };

      // Update mocks
      dateSpy.mockImplementation(() => futureNow * 1000);

      mockVerifyAccessToken.mockImplementation(
        async (): Promise<JwtTarVefifyResult> =>
          Promise.resolve({
            payload: jwtPayload,
          } as unknown as JwtTarVefifyResult)
      );

      mockDecodeJwt.mockImplementation(() => ({
        header: {
          typ: "JWT",
          alg: "ES256K",
        },
        signature: "",
        payload: jwtPayload,
        data: "",
      }));

      returnedPayload = await authService.validateOAuth2Token(
        "token",
        "api.local"
      );

      expect(returnedPayload).toStrictEqual({ name: "test 3" });
      expect(mockVerifyAccessToken).toHaveBeenCalledTimes(3);
      expect(mockDecodeJwt).toHaveBeenCalledTimes(1);
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
  });
});
