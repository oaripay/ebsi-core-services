import { URLSearchParams } from "node:url";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer, Logger } from "@nestjs/common";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { Agent, encode, verifyJwtTar } from "@cef-ebsi/siop-auth";
import { verifyCredentialJwt } from "@cef-ebsi/verifiable-credential";
import isCI from "is-ci";
import { importJWK } from "jose";
import { UserAuthentication } from "../../src/shared/dto";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import {
  AuthenticationResponse,
  SessionToken,
  VerifiableAuthorization,
} from "../../src/shared/interfaces";
import { prefix0x } from "../../src/modules/authentication/authentication.utils";
import { getServer } from "../utils/getServer";

interface SupertestAuthenticationRequestResponse {
  status: number;
  body: AuthenticationResponse;
}

interface SupertestAuthenticationResponse {
  status: number;
  body: VerifiableAuthorization;
}

const describeSkipCI = isCI ? describe.skip : describe;

/**
 * In order to enable and run the test below successfully, you need to set a valid recaptcha token
 * 1 - Locally run users-onboarding-web-client
 * 2 - Inspect console and click on "Onboard with Captcha"
 * 3 - Copy the token sent as { info: { token: "03A..." } } to /users-onboarding/v2/sessions
 * 4 - Define TEST_RECAPTCHA_TOKEN with the copied token (in .env.test.local)
 */
describeSkipCI("reCAPTCHA onboarding", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    server = getServer(app, configService);
  });

  it("should allow any user passing reCAPTCHA test to onboard", async () => {
    expect.assertions(10);

    // 1 - User creates the request
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse =
      await request(server).post("/authentication-requests").send({
        scope: "ebsi users onboarding",
      });
    expect(authenticationRequestResponse.status).toBe(201);
    const authenticationRequest = authenticationRequestResponse.body;
    expect(authenticationRequest.session_token).toBeDefined();

    // 2 - User verifies it
    const testUserKid = configService.get<string>("testUserKid");
    const testUserPrivateKey = prefix0x(
      configService.get<string>("testUserPrivateKey")
    );
    const alg = "ES256K";
    const agent = new Agent({
      privateKey: await importJWK(
        encode.privateKey.fromHextoJWK(testUserPrivateKey),
        alg
      ),
      kid: testUserKid,
      alg,
      siopV2: true,
    });

    const urlParams = new URLSearchParams(authenticationRequest.session_token);
    const params = Object.fromEntries(urlParams);
    Object.keys(params).forEach((k) => {
      params[k] = decodeURIComponent(params[k]);
    });
    const didAuthRequestJwt = params.request;

    const { payload: requestPayload } = await verifyJwtTar(didAuthRequestJwt, {
      trustedAppsRegistry: configService.get<string>(
        "trustedAppsRegistryApiUrl"
      ),
    });

    expect(requestPayload.iss).toBe(configService.get<string>("apiName"));
    expect(requestPayload.client_id).toBe(
      "https://api.test.intebsi.xyz/users-onboarding/v2/authentication-responses"
    );

    // 3 - Create a DID-Auth response
    const didAuthResponseJwt = await agent.createResponse({
      nonce: params.nonce,
      redirectUri: params.client_id,
      responseMode: "form_post",
    });

    expect(didAuthResponseJwt.urlEncoded).toBeDefined();

    const recaptchaToken = configService.get<string>("testRecaptchaToken");

    const body = {
      onboarding: "recaptcha",
      info: {
        token: recaptchaToken,
      },
    } as UserAuthentication;

    const response = await request(server).post("/sessions").send(body);

    const token = (response.body as SessionToken).Bearer;
    expect(token).toBeDefined();

    const { idToken } = didAuthResponseJwt;

    // 4 - RP verifies the response and create the verifiable Authorization and creates the verifiable Authorization (requires bearer token)
    const authenticationServerResponse: SupertestAuthenticationResponse =
      await request(server)
        .post("/authentication-responses")
        .auth(token, { type: "bearer" })
        .send(
          new URLSearchParams({
            id_token: idToken,
            // check if state is set the api handles it
            state: "test",
          }).toString()
        );

    expect(authenticationServerResponse.status).toBe(201);
    expect(authenticationServerResponse.body).toBeDefined();
    expect(authenticationServerResponse.body).toHaveProperty(
      "verifiableCredential"
    );

    // 5 - Validate the Verifiable Auth
    const ebsiEnv = configService.get<
      "test" | "conformance" | "pilot" | "prod"
    >("ebsiEnv");
    const validation = await verifyCredentialJwt(
      authenticationServerResponse.body.verifiableCredential,
      { ebsiEnv }
    );
    expect(validation).toBeDefined();
  });
});
