import { URLSearchParams } from "node:url";
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
import { DidAuthResponseCall, Agent } from "@cef-ebsi/siop-auth";
import {
  Options,
  validateVerifiableCredential,
} from "@cef-ebsi/verifiable-credential";
import "expect-puppeteer";
import type { HTTPRequest } from "puppeteer";
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

describe("EU Login onboarding", () => {
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

  it("should allow any EU Login user to onboard", async () => {
    expect.assertions(19);

    // 0 - Use puppeteer to get EU Login ticket
    const euLoginUsername = configService.get<string>("testEuLoginUsername");
    const euLoginPassword = configService.get<string>("testEuLoginPassword");

    // Let all the requests pass except https://app.test.intebsi.xyz/users-onboarding/authentication?ticket=...
    await page.setRequestInterception(true);
    page.on("request", (req: HTTPRequest) => {
      if (
        !req
          .url()
          .startsWith(
            "https://app.test.intebsi.xyz/users-onboarding/authentication?ticket="
          )
      ) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        req.continue();
      }
    });

    await page.goto("https://app.test.intebsi.xyz/users-onboarding");

    await expect(page).toMatch("Welcome to the Test environment");

    await expect(page).toClick("button", { text: "Onboard with EU Login" });

    await page.waitForNavigation({ waitUntil: "networkidle0" });

    await expect(page).toMatch("EBSI requires you to authenticate");

    await page.waitForTimeout(3000);
    await expect(page).toFillForm('form[id="whoamiForm"]', {
      username: euLoginUsername,
    });
    await page.waitForTimeout(300);
    await expect(page).toClick("button", { text: "Next" });

    await page.waitForNavigation();

    await expect(page).toMatch(euLoginUsername);

    await page.waitForTimeout(100);
    await expect(page).toFillForm('form[id="loginForm"]', {
      password: euLoginPassword,
    });
    await page.waitForTimeout(100);
    await expect(page).toClick('input[title="Sign in"]');

    const httpReq = await page.waitForRequest((req) =>
      req
        .url()
        .startsWith(
          "https://app.test.intebsi.xyz/users-onboarding/authentication?ticket="
        )
    );

    await httpReq.abort();

    const ticket = httpReq
      .url()
      .replace(
        "https://app.test.intebsi.xyz/users-onboarding/authentication?ticket=",
        ""
      );

    // The EU Login ticket starts with ST-
    expect(ticket).toContain("ST-");

    // 1 - User creates the request
    const authenticationRequestResponse: SupertestAuthenticationRequestResponse =
      await request(server).post("/authentication-requests").send({
        scope: "ebsi users onboarding",
      });
    expect(authenticationRequestResponse.status).toBe(201);
    const authenticationRequest = authenticationRequestResponse.body;
    expect(authenticationRequest.session_token).toBeDefined();

    // 2 - User verifies it
    const didRegistry =
      "https://api.test.intebsi.xyz/did-registry/v2/identifiers";

    const params = new URLSearchParams(authenticationRequest.session_token);
    const didAuthRequestJwt = params.get("request");

    const testUserPrivateKey = prefix0x(
      configService.get<string>("testUserPrivateKey")
    );

    const agent = new Agent({
      privateKey: testUserPrivateKey,
      didRegistry,
    });

    const requestPayload = await agent.verifyAuthenticationRequest(
      didAuthRequestJwt
    );

    const appDid = configService.get<string>("applicationDid");
    expect(requestPayload.iss).toBe(appDid);
    expect(requestPayload.client_id).toBe(
      "https://api.test.intebsi.xyz/users-onboarding/v1/authentication-responses"
    );

    // 3 - Create a DID-Auth response
    const testUserDid = configService.get<string>("testUserDid");

    const didAuthResponseCall: DidAuthResponseCall = {
      did: testUserDid, // User DID
      nonce: params.get("nonce"), // same nonce received as a Request Payload after verifying it
      redirectUri: params.get("client_id"), // parsed URI from the DID Auth Request payload
    };
    const didAuthResponseJwt = await agent.createAuthenticationResponse(
      didAuthResponseCall
    );

    expect(didAuthResponseJwt.urlEncoded).toBeDefined();

    // EU Login
    const body = {
      onboarding: "eu-login",
      info: {
        "eul-ticket": ticket,
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
