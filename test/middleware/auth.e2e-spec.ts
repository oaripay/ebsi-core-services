/* eslint-disable no-underscore-dangle */

import httpMocks from "node-mocks-http";
import { decodeJWT } from "did-jwt";
import * as auth from "../../src/middleware/auth";
import { BadRequestError, InvalidTokenError } from "../../src/errors";
import {
  GRANT_TYPE,
  AccessTokenRequestBody,
  AccessTokenResponseBody,
  TOKEN_TYPE,
  IComponentAuthZToken,
} from "../../src/libs/authManager/secureEnclave/jwt";
import { testAuthNToken } from "../utils/auxAPICalls";
import { API_NAME } from "../../src/config";

jest.setTimeout(1000000);

const invalidJWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("auth middleware test suite", () => {
  it("should throw a BadRequestError with a body without Grant type", () => {
    expect.assertions(3);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: {},
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
      expect((error as BadRequestError).Detail).toMatch(
        `grantType must be '${GRANT_TYPE.jwtBearer}'`
      );
    };

    auth.callNewSession(req, res, next);
  });

  it("should throw a BadRequestError when using body without assertion", () => {
    expect.assertions(3);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: {
        grantType: GRANT_TYPE.jwtBearer,
      },
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BadRequestError);
      expect((error as BadRequestError).Detail).toMatch(
        `No assertion present in the body`
      );
    };

    auth.callNewSession(req, res, next);
  });

  it("should throw a JWTMalformed error", () => {
    expect.assertions(2);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: {
        grantType: GRANT_TYPE.jwtBearer,
        assertion: "invalid token",
      } as AccessTokenRequestBody,
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeDefined();
      expect((error as Error).name).toMatch("JWTMalformed");
    };

    auth.callNewSession(req, res, next);
  });

  it("should throw a InvalidTokenError with an invalid jwt", () => {
    expect.assertions(3);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: {
        grantType: GRANT_TYPE.jwtBearer,
        assertion: invalidJWT,
      } as AccessTokenRequestBody,
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(InvalidTokenError);
      expect((error as InvalidTokenError).Detail).toMatch(
        "The token requires iss, aud, iat, and exp in the payload"
      );
    };

    auth.callNewSession(req, res, next);
  });

  it("should return a signed Component AuthZtoken", async () => {
    expect.assertions(2);
    const next = () => {};
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: {
        grantType: GRANT_TYPE.jwtBearer,
        assertion: (await testAuthNToken()).token,
      } as AccessTokenRequestBody,
    });
    const res = httpMocks.createResponse({
      // eslint-disable-next-line global-require
      eventEmitter: require("events").EventEmitter,
    });
    const expectedResult: AccessTokenResponseBody = {
      accessToken: expect.any(String),
      tokenType: TOKEN_TYPE.bearer,
      expiresIn: expect.any(Number),
      issuedAt: expect.any(Number),
    };
    const expectedComponentAuthZ: IComponentAuthZToken = {
      iss: API_NAME,
      aud: API_NAME,
      iat: expect.any(Number),
      exp: expect.any(Number),
    };
    res.on("end", () => {
      const result: AccessTokenResponseBody = res._getData();
      expect(result).toMatchObject(expectedResult);
      const { payload } = decodeJWT(result.accessToken);
      expect(payload).toMatchObject(expectedComponentAuthZ);
    });

    await auth.callNewSession(req, res, next);
  });
});
