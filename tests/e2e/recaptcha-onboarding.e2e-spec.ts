import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer } from "@nestjs/common";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import {
  DidAuthRequestPayload,
  EbsiDidAuth,
  DidAuthResponseCall,
} from "@cef-ebsi/siop-auth";
import {
  Options,
  validateVerifiableCredential,
} from "@cef-ebsi/verifiable-credential";
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

interface SupertestAuthenticationRequestResponse {
  status: number;
  body: AuthenticationResponse;
}

interface SupertestAuthenticationResponse {
  status: number;
  body: VerifiableAuthorization;
}

/**
 * In order to enable and run the test below successfully, you need to set a valid recaptcha token
 * 1 - Locally run users-onboarding-web-client
 * 2 - Inspect console and click on "Onboard with Captcha"
 * 3 - Copy the token sent as { info: { token: "03A..." } } to /users-onboarding/v1/sessions
 * 4 - Define TEST_RECAPTCHA_TOKEN with the copied token (in .env.test.local)
 */
describe("reCAPTCHA onboarding", () => {
  let app: NestFastifyApplication;
  let server: HttpServer;
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
    server = app.getHttpServer() as HttpServer;

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
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
    const didResolver =
      "https://api.test.intebsi.xyz/did-registry/v2/identifiers";

    const params = new URLSearchParams(authenticationRequest.session_token);
    const didAuthRequestJwt = params.get("request");

    const requestPayload: DidAuthRequestPayload =
      await EbsiDidAuth.verifyAuthenticationRequest(
        didAuthRequestJwt,
        didResolver as string
      );
    const appDid = configService.get<string>("applicationDid");
    expect(requestPayload.iss).toBe(appDid);
    expect(requestPayload.client_id).toBe(
      "https://api.test.intebsi.xyz/users-onboarding/v1/authentication-responses"
    );

    // 3 - Create a DID-Auth response
    const testUserDid = configService.get<string>("testUserDid");
    const testUserPrivateKey = prefix0x(
      configService.get<string>("testUserPrivateKey")
    );

    const didAuthResponseCall: DidAuthResponseCall = {
      hexPrivateKey: testUserPrivateKey, // private key managed by the user. Should be passed in hexadecimal format
      did: testUserDid, // User DID
      nonce: params.get("nonce"), // same nonce received as a Request Payload after verifying it
      redirectUri: params.get("client_id"), // parsed URI from the DID Auth Request payload
    };
    const didAuthResponseJwt = await EbsiDidAuth.createAuthenticationResponse(
      didAuthResponseCall
    );
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

    const idToken = didAuthResponseJwt.urlEncoded.substring(
      didAuthResponseJwt.urlEncoded.indexOf("#") + 1
    );

    // 4 - RP verifies the response and create the verifiable Authorization and creates the verifiable Authorization (requires bearer token)
    const authenticationServerResponse: SupertestAuthenticationResponse =
      await request(server)
        .post("/authentication-responses")
        .auth(token, { type: "bearer" })
        .send(`${idToken}&state=test`); // check if state is set the api handles it
    expect(authenticationServerResponse.status).toBe(201);
    expect(authenticationServerResponse.body).toBeDefined();
    expect(authenticationServerResponse.body).toHaveProperty(
      "verifiableCredential"
    );

    // 5 - Validate the Verifiable Auth
    const options: Options = {
      tirUrl:
        "https://api.test.intebsi.xyz/trusted-issuers-registry/v2/issuers",
      resolver: "https://api.test.intebsi.xyz/did-registry/v2/identifiers",
    };
    const validation = await validateVerifiableCredential(
      authenticationServerResponse.body.verifiableCredential,
      options
    );
    expect(validation).toBe("OK");
  });
});
