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
import { createFakeToken } from "../auxTests";
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

describe("/onboarding/v1 authentication e2e tests", () => {
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

  it("should test the response from startAuthentication is correct", async () => {
    expect.assertions(5);
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse =
      await request(server).post("/authentication-requests").send({
        scope: "ebsi users onboarding",
      });
    // 1 - User create the request
    expect(authenticationRequestResponse.status).toBe(201);
    const authenticationRequest = authenticationRequestResponse.body;
    expect(
      authenticationRequest.session_token.startsWith(
        "openid://?response_type=id_token"
      )
    ).toBe(true);
    expect(authenticationRequest.session_token).toContain("&request");
    expect(authenticationRequest.session_token).toContain("&client_id");
    expect(authenticationRequest.session_token).toContain("&nonce");
  });

  it("should test the authentication session with a wrong token", async () => {
    expect.assertions(5);

    const authenticationRequestResponse: SupertestAuthenticationRequestResponse =
      await request(server).post("/authentication-requests").send({
        scope: "ebsi users onboarding",
      });

    // 1 - User create the request
    const authenticationRequest = authenticationRequestResponse.body;

    const params = new URLSearchParams(authenticationRequest.session_token);

    // 2-User creates the DID-Auth Response
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

    // Send the request without a token
    const authenticationServerResponseWithoutToken: SupertestAuthenticationResponse =
      await request(server).post("/authentication-responses").send({
        id_token: didAuthResponseJwt.urlEncoded,
      });

    expect(authenticationServerResponseWithoutToken.status).toBe(401);
    expect(authenticationServerResponseWithoutToken.body).toStrictEqual({
      detail: "Missing JWT",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });

    // Send the request with a fakeToken
    const fakeToken = await createFakeToken();
    const authenticationServerResponseWrongToken: SupertestAuthenticationResponse =
      await request(server)
        .post("/authentication-responses")
        .auth(fakeToken, { type: "bearer" })
        .send({
          id_token: didAuthResponseJwt.urlEncoded,
        });

    expect(authenticationServerResponseWrongToken.status).toBe(401);
    expect(authenticationServerResponseWrongToken.body).toStrictEqual({
      status: 401,
      title: "unexpected issuer found in session token",
      type: "about:blank",
    });
  });

  /**
   * In order to enable and run the test below successfully, you need to set a one time valid eu-login ticket or a recaptcha token.
   * EU Login:
   * 1 - https://ecas.acceptance.ec.europa.eu/cas/login?service=http%3A%2F%2Flocalhost%3A3000%2Fonboarding%2Fauthentication&renew=false
   * 2 - Login with you EULogin user
   * 3 - Copy the ticket from redirected URL
   * 4 - Set ticket variable below
   * reCAPTCHA:
   * 1 - Run locally users-onboarding-web-client
   * 2 - Inspect console and click on Sign in with Captcha
   * 3 - Copy the token printed
   * 4 - Set token variable below
   */
  it.skip("should test the full flow", async () => {
    expect.assertions(10);

    // 1 - User create the request
    const ticket =
      "ST-1673653-zLHa6H26OMFjMvVgFxuebgTKhIQlS8UPhiMEh1zRGjVRHWNBctWNee2WUAkNsasS7dAK2Vy99zzic1JOtLxSfD8-NaAc23CqASexIeoxDbDZLC-MYkDIiLRnYFxbxzrhJzTDq3qR6zMHEeeqDC9EwAvy56Hbx4GqfbnuB3lLpnDWALd8DTE6OXC3Y8HqJldiPQYCL0"; // set valid ticket
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse =
      await request(server).post("/authentication-requests").send({
        scope: "ebsi users onboarding",
      });
    expect(authenticationRequestResponse.status).toBe(201);
    const authenticationRequest = authenticationRequestResponse.body;
    expect(authenticationRequest.session_token).toBeDefined();

    // 2- user verify it
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

    // 3- CREATE A DID-AUTH RESPONSE
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

    // Obtain valid token
    const body = {
      onboarding: "eu-login",
      info: {
        "eul-ticket": ticket,
      },
    } as UserAuthentication;

    const response = await request(app.getHttpServer())
      .post("/sessions")
      .send(body);

    const token = (response.body as SessionToken).Bearer;
    expect(token).toBeDefined();

    // 4 - RP verifies the response and create the verifiable Authorization and creates the verifiable Authorization (requires bearer token)
    const authenticationServerResponse: SupertestAuthenticationResponse =
      await request(server)
        .post("/authentication-responses")
        .auth(token, { type: "bearer" })
        .send({
          id_token: didAuthResponseJwt.urlEncoded,
        });
    expect(authenticationServerResponse.status).toBe(201);
    expect(authenticationServerResponse.body).toBeDefined();
    expect(authenticationServerResponse.body).toHaveProperty(
      "verifiableCredential"
    );

    // 5- validate the verifiable auth
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
