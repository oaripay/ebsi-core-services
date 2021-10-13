import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JWK } from "jose/types";
import { createJWT, ES256KSigner } from "did-jwt";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import type { FastifyInstance } from "fastify";
import { Resolver } from "did-resolver";
import crypto from "crypto";
import * as authenticationModule from "./authentication.module";
import { ApiConfig } from "../../config/configuration";
import AuthenticationService from "./authentication.service";
import {
  AuhtenticationResponseRequest,
  AuthenticationRequest,
} from "../../shared/interfaces";
import * as utils from "./authentication.utils";

describe("authentication service tests", () => {
  let app: INestApplication;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [authenticationModule.default],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await app.close();
  });

  it("should throw an error if the scope is not the required", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const mockedRequest: AuthenticationRequest = {
      scope: "wrong scope",
    };
    await expect(
      authenticationService.startAuthentication(mockedRequest)
    ).rejects.toThrow("Bad Request");
  });

  it("should prepare the did auth request and returns a session token", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const mockedRequest: AuthenticationRequest = {
      scope: "ebsi users onboarding",
    };
    const didAuthRequest =
      "openid://?response_type=id_token&client_id=https%3A%2F%2Fapi.ebsi.zyz%2Faccess-tokens&scope=openid%20did_authn&request=eyJhbGciOiJIUzI1Ni...";

    jest
      .spyOn(utils, "prepareDidAuthRequest")
      .mockResolvedValue(didAuthRequest);
    const authenticationRequest =
      await authenticationService.startAuthentication(mockedRequest);
    expect(authenticationRequest).toStrictEqual({
      session_token: didAuthRequest,
    });
  });

  it("should validate the response", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const kid = "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ#key-1";
    const privateKey = crypto.randomBytes(32).toString("hex");
    const jwk = new EbsiWallet(privateKey).getPublicKey({
      format: "jwk",
    }) as JWK;
    const mockedAuthRequest: AuhtenticationResponseRequest = {
      id_token: await createJWT(
        { sub_jwk: jwk },
        {
          issuer: "https://self-issued.me",
          signer: ES256KSigner(privateKey),
        },
        {
          kid,
        }
      ),
    };

    jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue({
      didResolutionMetadata: {
        error: "notFound",
        message: "did not found",
      },
      didDocumentMetadata: {},
      didDocument: null,
    });

    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).resolves.not.toThrow();
  });

  it("should throw an error if the id_token can not be decoded", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const mockedAuthRequest = {
      id_token: "badtoken",
    };
    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).rejects.toThrow("id_token could not be decoded");
  });

  it("should throw an error if the validation of the response is not ok", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const mockedAuthRequest = {
      id_token:
        "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3RydXN0ZWQtYXBwcy1yZWdpc3RyeS92Mi9hcHBzLzB4MTlkMDA0ZTdmNmVjZjI2NDUyM2UxMzY5MjRjYjY4Nzk2Y2E5ZGJmYTI1YmNhMDUzYjJmNmFmMGZjNmZkZDg4YyJ9.eyJpYXQiOjE2MTkxOTAxMzQsImV4cCI6MTYxOTE5MDQzNCwiaXNzIjoiZGlkOmVic2k6NlFZSmMzdExSaGV5ODhXUEtDMmt2NTg4djF1WjFvaWQzeWZjNUxwNUFiWUQiLCJzY29wZSI6Im9wZW5pZCBkaWRfYXV0aG4iLCJyZXNwb25zZV90eXBlIjoiaWRfdG9rZW4iLCJjbGllbnRfaWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6Ly9vbmJvYXJkaW5nL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsInN0YXRlIjoiOWY1YzFjMTgwNjczY2NjZDM5N2Q2MmQ1Iiwibm9uY2UiOiJtNERoVUN1Q2tjNUhvR09SZFQtSTNqakRsUTlxVjFGSnhJMDZXUDUzUFNvIn0.63o7hoAL-5CeXIXAZBrt0HE0Qc_Yi8WNwSkZAovOOJO-tVTrTFYKCtDdtQZEy7rnCA9g2P5wrq013P_KO8Jpmg",
    };

    jest.spyOn(Resolver.prototype, "resolve").mockResolvedValue({
      didResolutionMetadata: {
        error: "notFound",
        message: "did not found",
      },
      didDocumentMetadata: {},
      didDocument: null,
    });

    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).rejects.toThrow("sub_jwk missing in token payload");
  });

  it("should createVerifiableAuthorisation", async () => {
    expect.assertions(15);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const did = "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ";
    const response = await authenticationService.createVerifiableAuthorisation(
      did
    );
    expect(response.verifiableCredential.issuanceDate).toBeDefined();
    expect(response.verifiableCredential.proof).toBeDefined();
    expect(response.verifiableCredential["@context"]).toStrictEqual([
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1",
      "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json",
    ]);
    expect(response.verifiableCredential.id).toContain(
      "vc:ebsi:authentication#"
    );
    expect(response.verifiableCredential.type).toStrictEqual([
      "VerifiableCredential",
      "VerifiableAuthorisation",
    ]);
    expect(response.verifiableCredential.issuer).toStrictEqual(
      "did:ebsi:zwC56DZdiJh8kSxbgg4fMCu"
    );
    expect(response.verifiableCredential.issuanceDate).toBeDefined();
    expect(response.verifiableCredential.validFrom).toBeDefined();
    expect(response.verifiableCredential.validFrom).toBe(
      response.verifiableCredential.issuanceDate
    );
    expect(response.verifiableCredential.validFrom).toBeDefined();
    expect(
      response.verifiableCredential.validFrom <
        response.verifiableCredential.expirationDate
    ).toBeTruthy();
    expect(response.verifiableCredential.credentialSubject.id).toStrictEqual(
      "did:ebsi:znbuGDt6tEqpGZNAuGc2uvZ"
    );
    expect(response.verifiableCredential.credentialSchema).toBeDefined();
    expect(response.verifiableCredential.credentialSchema).toHaveProperty("id");
    expect(response.verifiableCredential.credentialSchema).toHaveProperty(
      "type"
    );
  });
});
