/* global page */
import { describe, beforeAll, it, expect } from "@jest/globals";
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
import expectPuppeteer from "expect-puppeteer";
import type { Request } from "puppeteer";
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

describe("EU Login onboarding", () => {
  let app: NestFastifyApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig, true>;
  let usersOnboardingAppUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe());

    Logger.overrideLogger(false);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    // Infer Users Onboarding webapp URL from the API's domain
    usersOnboardingAppUrl = `${(
      configService.get<string>("testLoadBalancerDomain") ||
      configService.get<string>("domain")
    ).replace("api", "app")}/users-onboarding/v2`;
  });

  it("should allow any EU Login user to onboard", async () => {
    expect.assertions(11); // Note: expectPuppeteer doesn't count

    // 0 - Use puppeteer to get EU Login ticket
    const euLoginUsername = configService.get<string>("testEuLoginUsername");
    const euLoginPassword = configService.get<string>("testEuLoginPassword");

    // Let all the requests pass except [Users Onboarding App]/authentication?ticket=...
    let ticket = "";
    await page.setRequestInterception(true);
    page.on("request", (req: Request) => {
      if (
        !req.url().startsWith(`${usersOnboardingAppUrl}/authentication?ticket=`)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        req.continue();
      } else {
        ticket = req
          .url()
          .replace(`${usersOnboardingAppUrl}/authentication?ticket=`, "");
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        req.abort();
      }
    });

    await page.goto(usersOnboardingAppUrl);

    await expectPuppeteer(page).toMatch("Choose your onboarding method");

    await expectPuppeteer(page).toClick("button", {
      text: "Onboard with EU Login",
    });

    await page.waitForNavigation({ waitUntil: "networkidle0" });

    // EU Login's body element is hidden by default. Wait until it becomes visible.
    await page.waitForSelector("body", { visible: true });

    // On EU Login Acceptance, the message is: "EBSI requires you to authenticate"
    // On EU Login Prod, the message is "EBSI Users Onboarding Service v2 requires you to authenticate"
    await expectPuppeteer(page).toMatch("requires you to authenticate");

    await page.waitForSelector('form[id="whoamiForm"]');

    await expectPuppeteer(page).toFillForm('form[id="whoamiForm"]', {
      username: euLoginUsername,
    });

    await page.waitForSelector('button[title="Next"]:not([disabled])');

    await expectPuppeteer(page).toClick("button", { text: "Next" });

    await page.waitForNavigation();

    await page.waitForSelector("body", { visible: true });

    await expectPuppeteer(page).toMatch(euLoginUsername);

    await page.waitForSelector('form[id="loginForm"]');

    await expectPuppeteer(page).toFillForm('form[id="loginForm"]', {
      password: euLoginPassword,
    });

    await page.waitForSelector('input[title="Sign in"]:not([disabled])');

    await Promise.all([
      page.waitForRequest((req) =>
        req.url().startsWith(`${usersOnboardingAppUrl}/authentication?ticket=`)
      ),
      Promise.all([
        await new Promise((resolve) => {
          setTimeout(() => resolve(null), 500);
        }),
        await expectPuppeteer(page).toClick('input[title="Sign in"]'),
      ]),
    ]);

    await page.waitForTimeout(3000);

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
    const urlParams = new URLSearchParams(authenticationRequest.session_token);
    const params = Object.fromEntries(urlParams);
    Object.keys(params).forEach((k) => {
      params[k] = decodeURIComponent(params[k]);
    });

    const didAuthRequestJwt = params.request;

    const testUserKid = configService.get<string>("testUserKid");
    const testUserPrivateKey = prefix0x(
      configService.get<string>("testUserPrivateKey")
    );

    const alg = "ES256K";
    const agent = new Agent({
      privateKey: await importJWK(
        encode.privateKey.fromHexToJWK(testUserPrivateKey),
        alg
      ),
      kid: testUserKid,
      alg,
      siopV2: true,
    });

    let trustedAppsRegistry = configService.get<string>(
      "trustedAppsRegistryApiUrl"
    );

    // Use TEST_LB_DOMAIN if defined
    if (configService.get<string>("testLoadBalancerDomain")) {
      trustedAppsRegistry = trustedAppsRegistry.replace(
        configService.get<string>("domain"),
        configService.get<string>("testLoadBalancerDomain")
      );
    }

    const { payload: requestPayload } = await verifyJwtTar(didAuthRequestJwt, {
      trustedAppsRegistry,
    });

    expect(requestPayload.iss.startsWith("users-onboarding-api")).toBe(true);
    expect(requestPayload.client_id).toStrictEqual(
      expect.stringContaining("/users-onboarding/v2/authentication-responses")
    );

    // 3 - Create a DID-Auth response
    const didAuthResponseJwt = await agent.createResponse({
      nonce: params.nonce,
      redirectUri: params.client_id,
      responseMode: "form_post",
    });

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
    const domain = configService.get<string>("domain");
    const validation = await verifyCredentialJwt(
      authenticationServerResponse.body.verifiableCredential,
      {
        ebsiAuthority: domain.replace(/^https?:\/\//, ""), // remove http protocol scheme
      }
    );
    expect(validation).toBeDefined();
  });
});
