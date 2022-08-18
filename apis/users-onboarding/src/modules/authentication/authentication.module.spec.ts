import crypto from "node:crypto";
import request from "supertest";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { Test, TestingModule } from "@nestjs/testing";
import * as jose from "jose";
import type { JWK } from "jose";
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
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { JsonWebKey, Resolver } from "did-resolver";
import { createJWT, ES256KSigner } from "did-jwt";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import { AuthenticationModule } from "./authentication.module";
import {
  AuthenticationResponse,
  VerifiableAuthorization,
} from "../../shared/interfaces/index";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { createFakeToken } from "../../../tests/auxTests";
import AuthService from "../auth/auth.service";
import { ApiConfig } from "../../config/configuration";

describe("Authentication Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthenticationModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = app.getHttpServer() as HttpServer;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
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

      expect(responseBody.detail).toBe("Missing JWT");
      expect(response.status).toBe(401);
    });

    it("should reject request with wrong token", async () => {
      expect.assertions(4);

      const idToken =
        "id_token=eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3RydXN0ZWQtYXBwcy1yZWdpc3RyeS92Mi9hcHBzLzB4MTlkMDA0ZTdmNmVjZjI2NDUyM2UxMzY5MjRjYjY4Nzk2Y2E5ZGJmYTI1YmNhMDUzYjJmNmFmMGZjNmZkZDg4YyJ9.eyJpYXQiOjE2MTkxOTAxMzQsImV4cCI6MTYxOTE5MDQzNCwiaXNzIjoiZGlkOmVic2k6NlFZSmMzdExSaGV5ODhXUEtDMmt2NTg4djF1WjFvaWQzeWZjNUxwNUFiWUQiLCJzY29wZSI6Im9wZW5pZCBkaWRfYXV0aG4iLCJyZXNwb25zZV90eXBlIjoiaWRfdG9rZW4iLCJjbGllbnRfaWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6Ly9vbmJvYXJkaW5nL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsInN0YXRlIjoiOWY1YzFjMTgwNjczY2NjZDM5N2Q2MmQ1Iiwibm9uY2UiOiJtNERoVUN1Q2tjNUhvR09SZFQtSTNqakRsUTlxVjFGSnhJMDZXUDUzUFNvIn0.63o7hoAL-5CeXIXAZBrt0HE0Qc_Yi8WNwSkZAovOOJO-tVTrTFYKCtDdtQZEy7rnCA9g2P5wrq013P_KO8Jpmg&state=af0ifjsldkj";

      const fakeToken = await createFakeToken({
        apiName: configService.get<string>("apiName"),
        authorisationApiName: configService.get<string>("authorisationApiName"),
        trustedAppsRegistryApiUrl: configService.get<string>(
          "trustedAppsRegistryApiUrl"
        ),
      });

      let response = await request(server)
        .post("/authentication-responses")
        .auth(fakeToken, { type: "bearer" })
        .send({ id_token: idToken });
      const responseBody = response.body as UnauthorizedError;

      expect(responseBody.title).toBe(
        "Unexpected issuer found in session token"
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
          "Invalid Authorisation Token: Only JWTs using Compact JWS serialization can be decoded",
        status: 401,
        type: "about:blank",
      });
      expect(response.status).toBe(401);
    });

    it("should reject bad requests", async () => {
      expect.assertions(2);

      jest.spyOn(AuthService.prototype, "validateToken").mockResolvedValue();

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

    it("should reject a request with a token with an existing DID but no verification method as JWK", async () => {
      const did = EbsiWallet.createDid();
      const privateKey = crypto.randomBytes(32).toString("hex");
      const publicKey = new EbsiWallet(privateKey).getPublicKey({
        format: "jwk",
      }) as JWK;
      const idToken = await createJWT(
        {},
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(crypto.randomBytes(32)),
        },
        {
          kid: `${did}#keys-1`,
        }
      );

      // Mock access token verification with invalid verification method ("publicKeyJWK" instead of publicKeyJwk)
      jest.spyOn(AuthService.prototype, "validateToken").mockResolvedValue();

      const didResolved = {
        didResolutionMetadata: {
          contenType: "application/did+ld+json",
        },
        didDocumentMetadata: {},
        didDocument: {
          "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/jws-2020/v1",
          ],
          id: did,
          verificationMethod: [
            {
              id: `${did}#keys-1`,
              type: "JsonWebKey2020",
              controller: did,
              publicKeyJWK: publicKey,
            },
          ],
        },
      };

      jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue(didResolved);

      const response = await request(server)
        .post("/authentication-responses")
        .auth("token", { type: "bearer" })
        .send({ id_token: idToken });

      expect(response.body).toStrictEqual({
        title: `Can't find verification method related to ${did}#keys-1`,
        status: 400,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return a verifiable authorization", async () => {
      expect.assertions(2);

      const idToken =
        "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJkaWQ6ZWJzaTp6MjU2YXNCV21IQnNqMlpOVnhHNU1oa3Aja2V5LTEifQ.eyJpYXQiOjE2NDMwMzg0NTYsImV4cCI6MTY0MzAzODc1NiwiaXNzIjoiaHR0cHM6Ly9zZWxmLWlzc3VlZC5tZSIsInN1YiI6IlI3cmlHcUkwN0pGV2Y3MnU0bE44RWt4RGJ1NEpTQXZ2WVFBdzNJX2NGUWsiLCJhdWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3VzZXJzLW9uYm9hcmRpbmcvdjEvYXV0aGVudGljYXRpb24tcmVzcG9uc2VzIiwibm9uY2UiOiI5NzgxMWQ4ZC1jYjg0LTQzNGUtODRkZC0xMTNjY2YzOWFiZWIiLCJzdWJfandrIjp7Imt0eSI6IkVDIiwiY3J2Ijoic2VjcDI1NmsxIiwieCI6IjN2RzQ5ODB3WGNiLW4yRHlSNEdMU290X1dNQ1d0bF9ibldVc0NreDRONVUiLCJ5IjoiVC1abE5feUFnOTRCZlZOOVUtRUNnaDlTblJ6T2Zjam41WlJWdWJ0MjVyayIsImtpZCI6ImRpZDplYnNpOnoyNTZhc0JXbUhCc2oyWk5WeEc1TWhrcCNrZXktMSJ9LCJkaWQiOiJkaWQ6ZWJzaTp6MjU2YXNCV21IQnNqMlpOVnhHNU1oa3AifQ.nDssH_Rx4OJJH85YcUpZ_n4quQ9bxd3aPFzHpBaUjyoScZ9Ur_c9cwcvZ0gC-UfeDt10Wv3CCCmitUr9T0xJBA";

      // Mock access token verification
      jest.spyOn(AuthService.prototype, "validateToken").mockResolvedValue();

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

    it("should return a verifiable authorisation (existing DID)", async () => {
      const did = EbsiWallet.createDid();
      const privateKey = crypto.randomBytes(32).toString("hex");
      const publicKey = new EbsiWallet(privateKey).getPublicKey({
        format: "jwk",
      }) as JWK;
      const idToken = await createJWT(
        {},
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(crypto.randomBytes(32)),
        },
        {
          kid: `${did}#keys-1`,
        }
      );

      // Mock access token verification
      jest.spyOn(AuthService.prototype, "validateToken").mockResolvedValue();

      const didResolved = {
        didResolutionMetadata: {
          contenType: "application/did+ld+json",
        },
        didDocumentMetadata: {},
        didDocument: {
          "@context": [
            "https://www.w3.org/ns/did/v1",
            "https://w3id.org/security/suites/jws-2020/v1",
          ],
          id: did,
          verificationMethod: [
            {
              id: `${did}#keys-1`,
              type: "JsonWebKey2020",
              controller: did,
              publicKeyJwk: publicKey as JsonWebKey,
            },
          ],
        },
      };

      jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue(didResolved);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      jest.spyOn(jose, "jwtVerify").mockResolvedValue({});

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
