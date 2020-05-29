import httpMocks from "node-mocks-http";
import axios from "axios";
import { JWT } from "jose";
import * as auth from "../../src/middleware/auth";
import {
  GRANT_TYPE,
  AccessTokenRequestBody,
  AccessTokenResponseBody,
  TOKEN_TYPE,
} from "../../src/libs/authManager/secureEnclave/jwt";
import * as config from "../../src/config";
import AuthManager from "../../src/libs/authManager/authManager";
import {
  InvalidTokenError,
  TrustedAppNotFoundError,
  InvalidAppError,
  BadRequestError,
} from "../../src/errors";

describe("auth middleware unit testing suite", () => {
  describe("auth callNewSession test suite", () => {
    it("should return a signed Component AuthZtoken", async () => {
      expect.assertions(2);
      const next = () => {};
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse({
        // eslint-disable-next-line global-require
        eventEmitter: require("events").EventEmitter,
      });
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: config.API_NAME,
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest
        .spyOn(AuthManager.Instance, "createAuthorizationToken")
        .mockResolvedValue("token1");
      const expectedResult: AccessTokenResponseBody = {
        accessToken: expect.any(String),
        tokenType: TOKEN_TYPE.bearer,
        expiresIn: expect.any(Number),
        issuedAt: expect.any(Number),
      };
      const mockedAxiosGet = jest
        .spyOn(axios, "get")
        .mockResolvedValueOnce({
          data: {
            appName: "ebsi-idhub",
            pubKey:
              "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=",
          },
        })
        .mockResolvedValueOnce({ data: {} });

      res.on("end", () => {
        // eslint-disable-next-line no-underscore-dangle
        const result: AccessTokenResponseBody = res._getData();
        expect(result).toMatchObject(expectedResult);
        expect(mockedAxiosGet).toHaveBeenCalledTimes(2);
      });

      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidTokenError with bad payload: no audience", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "The token requires iss, aud, iat, and exp in the payload"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidTokenError with bad payload: no iss", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.API_NAME,
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "The token requires iss, aud, iat, and exp in the payload"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidTokenError with bad payload: no iat", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: config.API_NAME,
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "The token requires iss, aud, iat, and exp in the payload"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidTokenError with bad payload: no exp", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: config.API_NAME,
        iat: Date.now(),
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "The token requires iss, aud, iat, and exp in the payload"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidTokenError with bad payload: audience name", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: "other api name",
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "The aud in the token must be ebsi-idhub"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an BadRequestError with no grantType", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).Detail).toStrictEqual(
          "grantType must be 'urn:ietf:params:oauth:grant-type:jwt-bearer'"
        );
      };
      await auth.callNewSession(req, res, next);
    });

    it("should throw an BadRequestError with no assertion", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const next = (error?: any) => {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).Detail).toStrictEqual(
          "No assertion present in the body"
        );
      };
      await auth.callNewSession(req, res, next);
    });

    it("should throw an InvalidTokenError on verify token", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: config.API_NAME,
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockImplementation(() => {
        throw new Error("error on verify");
      });
      jest.spyOn(axios, "get").mockResolvedValue({
        data: {
          appName: "ebsi-idhub",
          pubKey:
            "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=",
        },
      });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "error on verify"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidAppError on verify token with status=500", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: config.API_NAME,
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest
        .spyOn(axios, "get")
        .mockResolvedValueOnce({
          data: {
            appName: "ebsi-idhub",
            pubKey:
              "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=",
          },
        })
        .mockRejectedValueOnce({
          response: {
            status: 500,
            data: "some error",
          },
        });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(InvalidAppError);
        expect((error as InvalidAppError).Detail).toStrictEqual(
          "Trusted Apps Registry: some error"
        );
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw an InvalidAppError on verify token with status<500", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/sessions",
        body: {
          grantType: GRANT_TYPE.jwtBearer,
          assertion: "token1",
        } as AccessTokenRequestBody,
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        iss: config.EBSI_APPS.WALLET,
        aud: config.API_NAME,
        iat: Date.now(),
        exp: Date.now() + 1000,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest
        .spyOn(axios, "get")
        .mockResolvedValueOnce({
          data: {
            appName: "ebsi-idhub",
            pubKey:
              "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=",
          },
        })
        .mockRejectedValueOnce({
          response: {
            status: 400,
            data: "some error",
          },
        });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(InvalidAppError);
        expect((error as InvalidAppError).Detail).toStrictEqual("some error");
      };
      await auth.callNewSession(req, res, next);
      jest.resetAllMocks();
    });
  });

  describe("handleToken test suite", () => {
    it("should return an authenticated session", async () => {
      expect.assertions(1);
      const next = () => {};
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EBSI_APPS.WALLET,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest.spyOn(axios, "get").mockResolvedValue({
        data: {
          appName: "ebsi-idhub",
          pubKey:
            "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=",
        },
      });

      await auth.handleToken(req, res, next);
      expect(req.params.authenticated).toBe(true);
      jest.resetAllMocks();
    });

    it("should return an authenticated session false", async () => {
      expect.assertions(1);
      const next = () => {};
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ` },
      });
      const res = httpMocks.createResponse();
      await auth.handleToken(req, res, next);
      expect(req.params.authenticated).toBe(false);
      jest.resetAllMocks();
    });

    it("should return an authenticated session false with no authorization", async () => {
      expect.assertions(1);
      const next = () => {};
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: {},
      });
      const res = httpMocks.createResponse();
      await auth.handleToken(req, res, next);
      expect(req.params.authenticated).toBe(false);
      jest.resetAllMocks();
    });

    it("should throw an invalidtoken when no aud correct is set", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: "another audience",
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "Token with incorrect audience. Please create a new session with 'ebsi-idhub'"
        );
      };
      auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw a TrustedAppNotFoundError", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EBSI_APPS.WALLET,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest.spyOn(axios, "get").mockRejectedValue({
        response: {
          status: 500,
          data: "some error",
        },
      });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(TrustedAppNotFoundError);
        expect((error as TrustedAppNotFoundError).Detail).toStrictEqual(
          "Trusted Apps Registry: some error"
        );
      };
      await auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw a TrustedAppNotFoundError with status < 500", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EBSI_APPS.WALLET,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest.spyOn(axios, "get").mockRejectedValue({
        response: {
          status: 400,
          data: "some error",
        },
      });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(TrustedAppNotFoundError);
        expect((error as TrustedAppNotFoundError).Detail).toStrictEqual(
          "some error"
        );
      };
      await auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw a TrustedAppNotFoundError with no pubkey", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EBSI_APPS.WALLET,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest.spyOn(axios, "get").mockResolvedValue({
        data: {
          appName: "ebsi-idhub",
        },
      });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(TrustedAppNotFoundError);
        expect((error as TrustedAppNotFoundError).Detail).toStrictEqual(
          "'ebsi-wallet' not found in the list of trusted apps"
        );
      };
      await auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw a InvalidTokenError on verify token", async () => {
      expect.assertions(3);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EBSI_APPS.WALLET,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockImplementation(() => {
        throw new Error("error on verify");
      });
      jest.spyOn(axios, "get").mockResolvedValue({
        data: {
          appName: "ebsi-idhub",
          pubKey:
            "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZZd0VBWUhLb1pJemowQ0FRWUZLNEVFQUFvRFFnQUVMeWlydDEvOWNuWm1Nd1Y2VjczSEhtaDhPSFdjZ05CVQpmL0U0T3M4Y1QyVWYrUjNsVzloQ2lQbTM3ZjlvakNxb2VyaG9HZm9NZ2lOSklSaEsrckRVZlE9PQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0=",
        },
      });
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as InvalidTokenError).Detail).toStrictEqual(
          "Error verifying token: error on verify"
        );
      };
      await auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });
  });
});
