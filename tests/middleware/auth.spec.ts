import httpMocks from "node-mocks-http";
import axios from "axios";
import { JWT } from "jose";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import handleToken from "../../src/middleware/auth";
import * as config from "../../src/config";
import { InvalidTokenError } from "../../src/errors";

describe("auth middleware unit testing suite", () => {
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

      await handleToken(req, res, next);
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
      await handleToken(req, res, next);
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
      await handleToken(req, res, next);
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
      handleToken(req, res, next);
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
        aud: config.EBSI_APPS.WALLET,
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
      await handleToken(req, res, next);
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
      await handleToken(req, res, next);
      jest.resetAllMocks();
    });
  });
});
