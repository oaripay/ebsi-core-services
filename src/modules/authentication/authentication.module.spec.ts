import request from "supertest";
import crypto from "crypto";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { Test, TestingModule } from "@nestjs/testing";
import { JWK } from "jose/types";
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
import { Resolver } from "did-resolver";
import didJwt, { JWTVerified, createJWT, ES256KSigner } from "did-jwt";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import { AuthenticationModule } from "./authentication.module";
import {
  AuthenticationResponse,
  VerifiableAuthorization,
} from "../../shared/interfaces/index";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { createFakeToken } from "../../../tests/auxTests";
import AuthService from "../auth/auth.service";

describe("Authentication Module", () => {
  let app: INestApplication;
  let server: HttpServer;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

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
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  describe("POST /authentication-requests", () => {
    it("should reject bad requests", async () => {
      expect.assertions(4);

      let response = await request(server)
        .post("/authentication-requests")
        .send("invalid string");
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `Invalid scope`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/authentication-requests")
        .send({ scope: "invalid scope" });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `Invalid scope`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an authentication request", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "ebsi users onboarding",
        });
      expect(response.status).toBe(201);
      const responseBody = response.body as AuthenticationResponse;
      expect(responseBody.session_token).toBeDefined();
    });
  });

  describe("POST /authentication-responses", () => {
    it("should reject request without JWT", async () => {
      expect.assertions(2);

      const idToken =
        "id_token=eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3RydXN0ZWQtYXBwcy1yZWdpc3RyeS92Mi9hcHBzLzB4MTlkMDA0ZTdmNmVjZjI2NDUyM2UxMzY5MjRjYjY4Nzk2Y2E5ZGJmYTI1YmNhMDUzYjJmNmFmMGZjNmZkZDg4YyJ9.eyJpYXQiOjE2MTkxOTAxMzQsImV4cCI6MTYxOTE5MDQzNCwiaXNzIjoiZGlkOmVic2k6NlFZSmMzdExSaGV5ODhXUEtDMmt2NTg4djF1WjFvaWQzeWZjNUxwNUFiWUQiLCJzY29wZSI6Im9wZW5pZCBkaWRfYXV0aG4iLCJyZXNwb25zZV90eXBlIjoiaWRfdG9rZW4iLCJjbGllbnRfaWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6Ly9vbmJvYXJkaW5nL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsInN0YXRlIjoiOWY1YzFjMTgwNjczY2NjZDM5N2Q2MmQ1Iiwibm9uY2UiOiJtNERoVUN1Q2tjNUhvR09SZFQtSTNqakRsUTlxVjFGSnhJMDZXUDUzUFNvIn0.63o7hoAL-5CeXIXAZBrt0HE0Qc_Yi8WNwSkZAovOOJO-tVTrTFYKCtDdtQZEy7rnCA9g2P5wrq013P_KO8Jpmg&state=af0ifjsldkj";

      const response = await request(server)
        .post("/authentication-responses")
        .send({ id_token: idToken });

      const responseBody = response.body as UnauthorizedError;

      expect(responseBody.detail).toStrictEqual("Missing JWT");
      expect(response.status).toBe(401);
    });

    it("should reject request with wrong token", async () => {
      expect.assertions(4);

      const idToken =
        "id_token=eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3RydXN0ZWQtYXBwcy1yZWdpc3RyeS92Mi9hcHBzLzB4MTlkMDA0ZTdmNmVjZjI2NDUyM2UxMzY5MjRjYjY4Nzk2Y2E5ZGJmYTI1YmNhMDUzYjJmNmFmMGZjNmZkZDg4YyJ9.eyJpYXQiOjE2MTkxOTAxMzQsImV4cCI6MTYxOTE5MDQzNCwiaXNzIjoiZGlkOmVic2k6NlFZSmMzdExSaGV5ODhXUEtDMmt2NTg4djF1WjFvaWQzeWZjNUxwNUFiWUQiLCJzY29wZSI6Im9wZW5pZCBkaWRfYXV0aG4iLCJyZXNwb25zZV90eXBlIjoiaWRfdG9rZW4iLCJjbGllbnRfaWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6Ly9vbmJvYXJkaW5nL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsInN0YXRlIjoiOWY1YzFjMTgwNjczY2NjZDM5N2Q2MmQ1Iiwibm9uY2UiOiJtNERoVUN1Q2tjNUhvR09SZFQtSTNqakRsUTlxVjFGSnhJMDZXUDUzUFNvIn0.63o7hoAL-5CeXIXAZBrt0HE0Qc_Yi8WNwSkZAovOOJO-tVTrTFYKCtDdtQZEy7rnCA9g2P5wrq013P_KO8Jpmg&state=af0ifjsldkj";
      const fakeToken = await createFakeToken();
      let response = await request(server)
        .post("/authentication-responses")
        .auth(fakeToken, { type: "bearer" })
        .send({ id_token: idToken });
      const responseBody = response.body as UnauthorizedError;

      expect(responseBody.title).toStrictEqual(
        "unexpected issuer found in session token"
      );
      expect(response.status).toBe(401);

      const wrongToken = "very.bad.token.123.abc";
      response = await request(server)
        .post("/authentication-responses")
        .auth(wrongToken, { type: "bearer" })
        .send({ id_token: idToken });
      expect(response.body).toStrictEqual({
        title: "Unauthorized",
        detail:
          "Invalid Authorisation Token: invalid_argument: Incorrect format JWT",
        status: 401,
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should reject bad requests", async () => {
      expect.assertions(2);

      jest
        .spyOn(AuthService.prototype, "validateToken")
        .mockResolvedValue({} as JWTVerified);

      const response = await request(server)
        .post("/authentication-responses")
        .auth("token", { type: "bearer" })
        .send({ id_token: "" });

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `ID Token is missing`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should reject a request with a token with an existing did but bad signature", async () => {
      const did = EbsiWallet.createDid();
      const privateKey = crypto.randomBytes(32).toString("hex");
      const publicKey = new EbsiWallet(privateKey).getPublicKey({
        format: "jwk",
      }) as JWK;
      const idToken = await createJWT(
        {},
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
        },
        {
          kid: `${did}#keys-1`,
        }
      );

      // Mock access token verification
      jest
        .spyOn(AuthService.prototype, "validateToken")
        .mockResolvedValue({} as JWTVerified);

      const didResolved = {
        didResolutionMetadata: {
          contenType: "application/did+ld+json",
        },
        didDocumentMetadata: {},
        didDocument: {
          "@context": "https://w3id.org/did/v1",
          id: did,
          verificationMethod: [
            {
              id: `${did}#keys-1`,
              type: "EcdsaSecp256k1VerificationKey2019",
              controller: did,
              publicKeyJWK: publicKey,
            },
          ],
        },
      };

      jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue(didResolved);

      jest
        .spyOn(didJwt, "verifyJWT")
        .mockRejectedValue(new Error("invalid signature"));

      const response = await request(server)
        .post("/authentication-responses")
        .auth("token", { type: "bearer" })
        .send({ id_token: idToken });

      expect(response.body).toStrictEqual({
        title: "invalid signature",
        status: 400,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return a verifiable authorization", async () => {
      expect.assertions(2);

      const idToken =
        "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJkaWQ6ZWJzaTpBYUVrbjczc2VjRk1VVFNnNHZUTGtoWDc5a0pFOG9hQUs3NDhUb1M4WXM5ZSNrZXktMSJ9.eyJpYXQiOjE2MTk1MTk4MzIsImV4cCI6MTYxOTUyMDEzMiwiaXNzIjoiaHR0cHM6Ly9zZWxmLWlzc3VlZC5tZSIsInN1YiI6IkFoQXBwbGx4UklSVGJQZFhJOUY4am9ka19vYWtQYnBfZVBlc094WjVTRFUiLCJhdWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3VzZXJzLW9uYm9hcmRpbmctYXBpL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsIm5vbmNlIjoiQmh5S2ZoNWJSQ1JsVjR4WDRxeG9zNm9MMzh5am5DZkxaZFVCRGFxbjRlayIsInN1Yl9qd2siOnsia2lkIjoiZGlkOmVic2k6QWFFa243M3NlY0ZNVVRTZzR2VExraFg3OWtKRThvYUFLNzQ4VG9TOFlzOWUja2V5LTEiLCJrdHkiOiJFQyIsImNydiI6InNlY3AyNTZrMSIsIngiOiJSSkFtTDBERTl1bmRGdlRUWmFSRElMU1BmRzlWN29lMG8waExJakhmT0I0IiwieSI6IjJONjVoWlZPTWpfUUlXWGx3cjR1RlpzcmxvMEZOQWJ1dWl6VTJzdjFURm8ifX0.B57fv76LGHvuRo62ArrJ1zQbTrHmVaqCa2aS86ER6FQc-HRCv6tlAdPstIFN2Gb_LjIOqy7YTz5qTCqs8fmYYQ";

      // Mock access token verification
      jest
        .spyOn(AuthService.prototype, "validateToken")
        .mockResolvedValue({} as JWTVerified);

      jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue({
        didResolutionMetadata: {
          error: "notFound",
          message: "did not found",
        },
        didDocumentMetadata: {},
        didDocument: null,
      });

      const response = await request(server)
        .post("/authentication-responses")
        .auth("token", { type: "bearer" })
        .send({ id_token: idToken });

      expect(response.status).toBe(201);

      const responseBody = response.body as VerifiableAuthorization;

      expect(responseBody.verifiableCredential).toBeDefined();
    });

    it("should return a verifiable authorisation (existing did)", async () => {
      const did = EbsiWallet.createDid();
      const privateKey = crypto.randomBytes(32).toString("hex");
      const publicKey = new EbsiWallet(privateKey).getPublicKey({
        format: "jwk",
      }) as JWK;
      const idToken = await createJWT(
        {},
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
        },
        {
          kid: `${did}#keys-1`,
        }
      );

      // Mock access token verification
      jest
        .spyOn(AuthService.prototype, "validateToken")
        .mockResolvedValue({} as JWTVerified);

      const didResolved = {
        didResolutionMetadata: {
          contenType: "application/did+ld+json",
        },
        didDocumentMetadata: {},
        didDocument: {
          "@context": "https://w3id.org/did/v1",
          id: did,
          verificationMethod: [
            {
              id: `${did}#keys-1`,
              type: "EcdsaSecp256k1VerificationKey2019",
              controller: did,
              publicKeyJWK: publicKey,
            },
          ],
        },
      };

      jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue(didResolved);

      jest.spyOn(didJwt, "verifyJWT").mockResolvedValue(
        Promise.resolve({
          payload: {},
          didResolutionResult: didResolved,
          issuer: "issuer",
          signer: {
            id: "id",
            type: "type",
            controller: "controller",
          },
          jwt: idToken,
        })
      );

      const response = await request(server)
        .post("/authentication-responses")
        .auth("token", { type: "bearer" })
        .send({ id_token: idToken });

      expect(response.status).toBe(201);

      const responseBody = response.body as VerifiableAuthorization;

      expect(responseBody.verifiableCredential).toBeDefined();
    });
  });
});
