import httpMocks from "node-mocks-http";
import axios from "axios";
import { JWT } from "jose";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import { EventEmitter } from "events";
import * as auth from "../../src/middleware/auth";
import * as config from "../../src/config";
import { TokenType } from "../../src/libs/authManager/secureEnclave/jwt";

describe("auth middleware unit testing suite", () => {
  it("should return a signed component session", async () => {
    expect.assertions(1);
    const agent = new EBSI_JWT.Agent(config.API_NAME, config.API_PRIVATE_KEY);
    const payload = agent.createRequestPayload(config.API_NAME);
    const next = () => {};
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: payload as any,
    });
    const res = httpMocks.createResponse({
      eventEmitter: EventEmitter,
    });
    const expectedResult = {
      accessToken: "a sample token",
      tokenType: TokenType.bearer,
      expiresIn: Date.now() + 900,
      issuedAt: Date.now(),
    };
    res.on("end", () => {
      // eslint-disable-next-line no-underscore-dangle
      const result = res._getData();
      expect(result).toMatchObject(expectedResult);
    });
    jest
      .spyOn(EBSI_JWT.Session.prototype, "newSession")
      .mockResolvedValue(expectedResult);
    await auth.callNewSession(req, res, next);
    jest.resetAllMocks();
  }, 10000);

  it("should throw an error while creating a new session", async () => {
    expect.assertions(2);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/sessions",
      body: {},
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toStrictEqual("Internal Error");
    };
    jest
      .spyOn(EBSI_JWT.Session.prototype, "newSession")
      .mockRejectedValue(new Error("Internal Error"));
    await auth.callNewSession(req, res, next);
    jest.resetAllMocks();
  }, 10000);

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
        aud: config.EbsiApps.WALLET,
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

    it("should throw an error while retrieving the public key", async () => {
      expect.assertions(2);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EbsiApps.WALLET,
      };
      jest.spyOn(JWT, "decode").mockReturnValue(tokenDecoded as any);
      jest.spyOn(JWT, "verify").mockReturnValue({} as any);
      jest
        .spyOn(EBSI_JWT.Session.prototype, "newSession")
        .mockRejectedValue(new Error("an error"));
      const next = (error?: any) => {
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(Error);
      };
      await auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });

    it("should throw a InvalidTokenError on verify token", async () => {
      expect.assertions(1);
      const req = httpMocks.createRequest({
        method: "POST",
        baseUrl: "/a-simple-call",
        headers: { Authorization: `Bearer ${"aaaaaaTOKEN"}` },
      });
      const res = httpMocks.createResponse();
      const tokenDecoded = {
        aud: config.EbsiApps.WALLET,
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
        expect(error.detail).toStrictEqual("error on verify");
      };
      await auth.handleToken(req, res, next);
      jest.resetAllMocks();
    });
  });
});
