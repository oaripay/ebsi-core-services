import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { INestApplication, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { AuthorisationModule } from "./authorisation.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import type { ApiConfig } from "../../config/configuration";

describe("Authorisation Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig, true>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthorisationModule],
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

    server = app.getHttpServer() as HttpServer;
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("GET /.well-known/openid-configuration", () => {
    it("should return the well-known OpenID configuration", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/.well-known/openid-configuration"
      );

      expect(response.body).toStrictEqual({
        issuer: configService.get<string>("apiDid"),
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
