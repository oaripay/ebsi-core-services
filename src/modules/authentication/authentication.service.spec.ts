import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import * as authenticationModule from "./authentication.module";
import { ApiConfig } from "../../config/configuration";
import AuthenticationService from "./authentication.service";
import {
  AuthenticationRequest,
  AuhtenticationResponseRequest,
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

  it("should validate the response and call the getDidFromKid", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const mockedAuthRequest: AuhtenticationResponseRequest = {
      id_token:
        "id_token=eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJkaWQ6ZWJzaTpBYUVrbjczc2VjRk1VVFNnNHZUTGtoWDc5a0pFOG9hQUs3NDhUb1M4WXM5ZSNrZXktMSJ9.eyJpYXQiOjE2MTk1MTk4MzIsImV4cCI6MTYxOTUyMDEzMiwiaXNzIjoiaHR0cHM6Ly9zZWxmLWlzc3VlZC5tZSIsInN1YiI6IkFoQXBwbGx4UklSVGJQZFhJOUY4am9ka19vYWtQYnBfZVBlc094WjVTRFUiLCJhdWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3VzZXJzLW9uYm9hcmRpbmctYXBpL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsIm5vbmNlIjoiQmh5S2ZoNWJSQ1JsVjR4WDRxeG9zNm9MMzh5am5DZkxaZFVCRGFxbjRlayIsInN1Yl9qd2siOnsia2lkIjoiZGlkOmVic2k6QWFFa243M3NlY0ZNVVRTZzR2VExraFg3OWtKRThvYUFLNzQ4VG9TOFlzOWUja2V5LTEiLCJrdHkiOiJFQyIsImNydiI6InNlY3AyNTZrMSIsIngiOiJSSkFtTDBERTl1bmRGdlRUWmFSRElMU1BmRzlWN29lMG8waExJakhmT0I0IiwieSI6IjJONjVoWlZPTWpfUUlXWGx3cjR1RlpzcmxvMEZOQWJ1dWl6VTJzdjFURm8ifX0.B57fv76LGHvuRo62ArrJ1zQbTrHmVaqCa2aS86ER6FQc-HRCv6tlAdPstIFN2Gb_LjIOqy7YTz5qTCqs8fmYYQ&state=af0ifjsldkj",
    };

    const jwtKid =
      "did:ebsi:AaEkn73secFMUTSg4vTLkhX79kJE8oaAK748ToS8Ys9e#key-1";

    const mockedDidFromKid = jest.spyOn(utils, "getDidFromKid");
    await authenticationService.validateResponse(mockedAuthRequest);
    expect(mockedDidFromKid).toHaveBeenCalledWith(jwtKid);
  });

  it("should throw an error if the validation of the response is not ok", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const mockedAuthRequest: AuhtenticationResponseRequest = {
      id_token:
        "id_token=eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6L3RydXN0ZWQtYXBwcy1yZWdpc3RyeS92Mi9hcHBzLzB4MTlkMDA0ZTdmNmVjZjI2NDUyM2UxMzY5MjRjYjY4Nzk2Y2E5ZGJmYTI1YmNhMDUzYjJmNmFmMGZjNmZkZDg4YyJ9.eyJpYXQiOjE2MTkxOTAxMzQsImV4cCI6MTYxOTE5MDQzNCwiaXNzIjoiZGlkOmVic2k6NlFZSmMzdExSaGV5ODhXUEtDMmt2NTg4djF1WjFvaWQzeWZjNUxwNUFiWUQiLCJzY29wZSI6Im9wZW5pZCBkaWRfYXV0aG4iLCJyZXNwb25zZV90eXBlIjoiaWRfdG9rZW4iLCJjbGllbnRfaWQiOiJodHRwczovL2FwaS50ZXN0LmludGVic2kueHl6Ly9vbmJvYXJkaW5nL3YxL2F1dGhlbnRpY2F0aW9uLXJlc3BvbnNlcyIsInN0YXRlIjoiOWY1YzFjMTgwNjczY2NjZDM5N2Q2MmQ1Iiwibm9uY2UiOiJtNERoVUN1Q2tjNUhvR09SZFQtSTNqakRsUTlxVjFGSnhJMDZXUDUzUFNvIn0.63o7hoAL-5CeXIXAZBrt0HE0Qc_Yi8WNwSkZAovOOJO-tVTrTFYKCtDdtQZEy7rnCA9g2P5wrq013P_KO8Jpmg&state=af0ifjsldkj",
    };

    await expect(
      authenticationService.validateResponse(mockedAuthRequest)
    ).rejects.toThrow("sub_jwk missing in token payload");
  });

  it("should createVerifiableAuthorisation", async () => {
    expect.assertions(15);
    const authenticationService: AuthenticationService =
      new AuthenticationService(configService);
    const did = "did:ebsi:FKdEpX5Mkub8ZP2JkVJms4SH5g13n7599incwHQg2PYn";
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
      "did:ebsi:6QYJc3tLRhey88WPKC2kv588v1uZ1oid3yfc5Lp5AbYD"
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
      "did:ebsi:FKdEpX5Mkub8ZP2JkVJms4SH5g13n7599incwHQg2PYn"
    );
    expect(response.verifiableCredential.credentialSchema).toBeDefined();
    expect(response.verifiableCredential.credentialSchema).toHaveProperty("id");
    expect(response.verifiableCredential.credentialSchema).toHaveProperty(
      "type"
    );
  });
});
