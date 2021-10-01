import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, HttpServer } from "@nestjs/common";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { Agent, DidAuthResponseCall } from "@cef-ebsi/siop-auth";
import { createFakeToken } from "../auxTests";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import {
  AuthenticationResponse,
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
    const didRegistry =
      "https://api.test.intebsi.xyz/did-registry/v2/identifiers";

    const agent = new Agent({
      privateKey: testUserPrivateKey,
      didRegistry,
    });

    const didAuthResponseCall: DidAuthResponseCall = {
      did: testUserDid, // User DID
      nonce: params.get("nonce"), // same nonce received as a Request Payload after verifying it
      redirectUri: params.get("client_id"), // parsed URI from the DID Auth Request payload
    };

    const didAuthResponseJwt = await agent.createAuthenticationResponse(
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
});
