import { describe, beforeAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { INestApplication, HttpServer } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import type { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";

describe("Authorisation (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let apiDid: string;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    apiDid = configService.get<string>("apiDid");
  });

  describe("GET /.well-known/openid-configuration", () => {
    it("should return the well-known OpenID configuration", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/.well-known/openid-configuration"
      );

      expect(response.body).toStrictEqual({
        issuer: apiDid,
        authorization_endpoint: "",
        token_endpoint: "",
        userinfo_endpoint: "",
        jwks_uri: "",
        scopes_supported: "",
        response_types_supported: "",
        response_modes_supported: "",
        grant_types_supported: "",
        subject_types_supported: "",
        id_token_signing_alg_values_supported: "",
        userinfo_signing_alg_values_supported: "",
        request_object_signing_alg_values_supported: "",
        request_parameter_supported: true,
        request_uri_parameter_supported: true,
      });

      expect(response.status).toBe(200);
    });
  });
});
