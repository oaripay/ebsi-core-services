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
import { AuthenticationRequest } from "../../shared/interfaces";
import * as utils from "./authentication.utils";

describe("users module tests", () => {
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
    const authenticationService: AuthenticationService = new AuthenticationService(
      configService
    );
    const mockedRequest: AuthenticationRequest = {
      scope: "wrong scope",
    };
    await expect(
      authenticationService.startAuthentication(mockedRequest)
    ).rejects.toThrow("Unknown scope");
  });

  it("should prepare the did auth request and returns a session token", async () => {
    expect.assertions(1);
    const authenticationService: AuthenticationService = new AuthenticationService(
      configService
    );
    const mockedRequest: AuthenticationRequest = {
      scope: "ebsi users onboarding",
    };
    const didAuthRequest =
      "openid://?response_type=id_token&client_id=https%3A%2F%2Fapi.ebsi.zyz%2Faccess-tokens&scope=openid%20did_authn&request=eyJhbGciOiJIUzI1Ni...";

    jest
      .spyOn(utils, "prepareDidAuthRequest")
      .mockResolvedValue(didAuthRequest);
    const authenticationRequest = await authenticationService.startAuthentication(
      mockedRequest
    );
    expect(authenticationRequest).toStrictEqual({
      session_token: didAuthRequest,
    });
  });
});
