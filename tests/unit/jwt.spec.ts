import httpMocks from "node-mocks-http";
import { JWT, JWK } from "jose";
import parseEntityJWT from "../../src/middleware/jwt";
import {
  InternalServerError,
  ApiErrorMessages,
  UnauthorizedError,
} from "../../src/errors";

describe("jwt test suite", () => {
  it("should throw an error when no token is found", () => {
    expect.assertions(2);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/a-simple-call",
      headers: {},
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeInstanceOf(InternalServerError);
      expect((error as InternalServerError).detail).toStrictEqual(
        ApiErrorMessages.NO_BEARER_TOKEN
      );
    };
    parseEntityJWT(req, res, next);
    jest.resetAllMocks();
  });

  it("should throw an UnauthorizedError when no did is found", () => {
    expect.assertions(2);
    const payload = {
      sub: "user001",
      userName: "EBSI&Eva",
    };
    const key = JWK.generateSync("EC", "secp256k1", { use: "sig" });
    const token = JWT.sign(payload, key);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/a-simple-call",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).detail).toStrictEqual(
        "Error parsing JWT: DID not found"
      );
    };
    parseEntityJWT(req, res, next);
    jest.resetAllMocks();
  });

  it("should throw an UnauthorizedError when token is neither User or Legal Entity AuthZToken", () => {
    expect.assertions(2);
    const payload = {
      data: "user001",
      moreData: "EBSI&Eva",
    };
    const key = JWK.generateSync("EC", "secp256k1", { use: "sig" });
    const token = JWT.sign(payload, key);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/a-simple-call",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).detail).toStrictEqual(
        "token is neither a User or Legal Entity AuthZ Token"
      );
    };
    parseEntityJWT(req, res, next);
    jest.resetAllMocks();
  });

  it("should return a user AuthZ token decoded", () => {
    expect.assertions(6);
    const payload = {
      sub: "user001",
      userName: "EBSI&Eva",
      did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
    };
    const key = JWK.generateSync("EC", "secp256k1", { use: "sig" });
    const token = JWT.sign(payload, key);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/a-simple-call",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = httpMocks.createResponse();
    const next = () => {};
    parseEntityJWT(req, res, next);
    expect(req.params).toHaveProperty("jwt");
    expect(req.params.jwt).toMatch(JSON.stringify(JWT.decode(token)));
    expect(req.params).toHaveProperty("didJwt");
    expect(req.params.didJwt).toMatch(payload.did);
    expect(req.params).toHaveProperty("token");
    expect(req.params.token).toMatch(token);
    jest.resetAllMocks();
  });

  it("should throw an UnauthorizedError when no did is found on enterprise", () => {
    expect.assertions(2);
    const payload = {
      sub: "ENTERPRISE EBSI",
      aud: "ebsi-wallet",
      nonce: "axxu878.",
    };
    const key = JWK.generateSync("EC", "secp256k1", { use: "sig" });
    const token = JWT.sign(payload, key);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/a-simple-call",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = httpMocks.createResponse();
    const next = (error?: any) => {
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect((error as UnauthorizedError).detail).toStrictEqual(
        "Error parsing JWT: DID not found"
      );
    };
    parseEntityJWT(req, res, next);
    jest.resetAllMocks();
  });

  it("should return an enterprise AuthZ token decoded", () => {
    expect.assertions(6);
    const payload = {
      sub: "ENTERPRISE EBSI",
      did: "did:ebsi:0xc9A8940Ab318d4d4631a86DcF9E0b9A3594214E5",
      aud: "ebsi-wallet",
      nonce: "axxu878.",
    };
    const key = JWK.generateSync("EC", "secp256k1", { use: "sig" });
    const token = JWT.sign(payload, key);
    const req = httpMocks.createRequest({
      method: "POST",
      baseUrl: "/a-simple-call",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = httpMocks.createResponse();
    const next = () => {};
    parseEntityJWT(req, res, next);
    expect(req.params).toHaveProperty("jwt");
    expect(req.params.jwt).toMatch(JSON.stringify(JWT.decode(token)));
    expect(req.params).toHaveProperty("didJwt");
    expect(req.params.didJwt).toMatch(payload.did);
    expect(req.params).toHaveProperty("token");
    expect(req.params.token).toMatch(token);
    jest.resetAllMocks();
  });
});
