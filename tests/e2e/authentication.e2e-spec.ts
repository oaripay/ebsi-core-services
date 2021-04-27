import { Test, TestingModule } from "@nestjs/testing";
import crypto from "crypto";
import { HttpServer, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import { Logger } from "@nestjs/common/services/logger.service";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import {
  DidAuthRequestPayload,
  EbsiDidAuth,
  DidAuthResponseCall,
} from "@cef-ebsi/siop-auth";
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

describe("/users-onboarding (generic tests)", () => {
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
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse = await request(
      server
    )
      .post("/authentication-requests")
      .send({
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
    expect.assertions(3);
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse = await request(
      server
    )
      .post("/authentication-requests")
      .send({
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
      hexPrivatekey: testUserPrivateKey, // private key managed by the user. Should be passed in hexadecimal format
      did: testUserDid, // User DID
      state: params.get("state"), // same state received as a Request Payload after verifying it
      nonce: params.get("nonce"), // same nonce received as a Request Payload after verifying it
      redirectUri: params.get("client_id"), // parsed URI from the DID Auth Request payload
    };
    const didAuthResponseJwt = await EbsiDidAuth.createAuthenticationResponse(
      didAuthResponseCall
    );
    expect(didAuthResponseJwt.urlEncoded).toBeDefined();

    // Send the request with a fakeTken

    const authenticationServerResponseWithoutToken: SupertestAuthenticationResponse = await request(
      server
    )
      .post("/authentication-responses")
      .send({
        id_token: didAuthResponseJwt.urlEncoded,
      });
    expect(authenticationServerResponseWithoutToken.status).toBe(500);
    const fakeToken = await createFakeToken();
    const authenticationServerResponseWrongToken: SupertestAuthenticationResponse = await request(
      server
    )
      .post("/authentication-responses")
      .auth(fakeToken, { type: "bearer" })
      .send({
        id_token: didAuthResponseJwt.urlEncoded,
      });
    expect(authenticationServerResponseWrongToken.status).toBe(401);
  });

  it("should test the full flow", async () => {
    expect.assertions(8);
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse = await request(
      server
    )
      .post("/authentication-requests")
      .send({
        scope: "ebsi users onboarding",
      });
    // 1 - User create the request
    expect(authenticationRequestResponse.status).toBe(201);
    const authenticationRequest = authenticationRequestResponse.body;
    expect(authenticationRequest.session_token).toBeDefined();

    // 2- user verify it
    const didResolver =
      "https://api.test.intebsi.xyz/did-registry/v2/identifiers";

    const params = new URLSearchParams(authenticationRequest.session_token);
    const didAuthRequestJwt = params.get("request");

    const requestPayload: DidAuthRequestPayload = await EbsiDidAuth.verifyAuthenticationRequest(
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
      hexPrivatekey: testUserPrivateKey, // private key managed by the user. Should be passed in hexadecimal format
      did: testUserDid, // User DID
      state: params.get("state"), // same state received as a Request Payload after verifying it
      nonce: params.get("nonce"), // same nonce received as a Request Payload after verifying it
      redirectUri: params.get("client_id"), // parsed URI from the DID Auth Request payload
    };
    const didAuthResponseJwt = await EbsiDidAuth.createAuthenticationResponse(
      didAuthResponseCall
    );
    expect(didAuthResponseJwt.urlEncoded).toBeDefined();

    // Obtain valid token
    const testApp = configService.get<{
      id: string;
      name: string;
      privateKey: string;
    }>("testApp");
    const agent = new Agent(testApp.privateKey, {
      issuer: testApp.name,
      kid: `${configService.get<string>("trustedAppsRegistry")}/${testApp.id}`,
    });
    const nonce = crypto.randomBytes(12).toString("base64");
    const requestOauth2 = await agent.createRequestPayload(
      configService.get<string>("apiName"),
      {
        nonce,
      }
    );
    const authApi = configService.get<string>("authorisationApiUrl");
    const response = await request(authApi)
      .post("/oauth2-sessions")
      .send(requestOauth2);
    const token = await agent.verifyAuthenticationResponse(
      response.body as AkeResponse,
      nonce
    );
    // 4 - RP verifies the response and create the verifiable Authorization and creates the verifiable Authorization (requires bearer token)
    const authenticationServerResponse: SupertestAuthenticationResponse = await request(
      server
    )
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
    // 6- validate the verifiable auth
    // const options: Options = {
    //   tirUrl: "test",
    //   resolverUrl: "https://api.test.intebsi.xyz/did-registry/v2/identifiers",
    // };
    // const validation = await validateVerifiableCredential(
    //   response.verifiableCredential,
    //   options
    // );
    // expect(validation).toBe("OK");
  });
});
