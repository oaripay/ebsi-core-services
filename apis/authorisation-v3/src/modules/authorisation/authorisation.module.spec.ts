import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import type { INestApplication, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import type { PresentationDefinitionV2 } from "@sphereon/pex-models";
import { AuthorisationModule } from "./authorisation.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import type { ApiConfig } from "../../config/configuration";
import type { Scope } from "./authorisation.interfaces";

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

      const domain = configService.get<string>("domain");
      const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
      const issuer = `${domain}${apiUrlPrefix}`;

      const response = await request(server).get(
        "/.well-known/openid-configuration"
      );

      expect(response.body).toStrictEqual({
        issuer: expect.any(String),
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        pushed_authorization_request_endpoint: `${issuer}/par`,
        presentation_definition_endpoint: `${issuer}/presentation-definitions`,
        jwks_uri: `${issuer}/jwks`,
        scopes_supported: expect.arrayContaining(["openid"]),
        response_types_supported: expect.arrayContaining(["code"]),
        subject_types_supported: expect.arrayContaining(["public"]),
        id_token_signing_alg_values_supported: expect.arrayContaining(["none"]),
        subject_syntax_types_supported: expect.arrayContaining([
          "did:ebsi",
          "did:ebsinp",
        ]),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /jwks", () => {
    it("should return the OP's JWKS", async () => {
      expect.assertions(2);

      const response = await request(server).get("/jwks");

      expect(response.body).toStrictEqual({
        keys: expect.arrayContaining([
          {
            kty: "EC",
            crv: "P-256",
            alg: "ES256",
            x: expect.any(String),
            y: expect.any(String),
          },
        ]),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /presentation-definitions", () => {
    it("should return an error if the scope is invalid", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/presentation-definitions?scope=test"
      );

      expect(response.body).toStrictEqual({
        detail:
          '["scope must be one of the following values: openid, did_write, tir_write, generic_write"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the expected presentation definition for the given scope", async () => {
      expect.assertions(10);

      const expectedPresentationDefinitions: Record<
        Scope,
        PresentationDefinitionV2
      > = {
        openid: {
          id: "openid_presentation",
          input_descriptors: [
            {
              id: "Any type of Verifiable Attestation",
              name: "Any type of Verifiable Attestation",
              purpose: "Please present a valid Verifiable Attestation",
              constraints: {
                fields: [
                  {
                    path: ["$.vc.credentialSchema.id"],
                    filter: {
                      type: "string",
                      pattern: configService.get<string>("oidSchemaPattern"),
                    },
                  },
                ],
              },
            },
          ],
          format: {
            jwt_vc: {
              alg: ["ES256", "ES256K"],
            },
            jwt_vp: {
              alg: ["ES256", "ES256K"],
            },
          },
        },
        did_write: {
          id: "did_write_presentation",
          input_descriptors: [],
        },
        tir_write: {
          id: "tir_write_presentation",
          input_descriptors: [],
        },
        generic_write: {
          id: "generic_write_presentation",
          input_descriptors: [],
        },
      };

      // 1. Without explicit scope (default scope: "openid")
      let response = await request(server).get("/presentation-definitions");

      expect(response.body).toStrictEqual(
        expectedPresentationDefinitions.openid
      );
      expect(response.status).toBe(200);

      // 2. With explicit scope "openid"
      response = await request(server).get(
        "/presentation-definitions?scope=openid"
      );

      expect(response.body).toStrictEqual(
        expectedPresentationDefinitions.openid
      );
      expect(response.status).toBe(200);

      // 3. With explicit scope "did_write"
      response = await request(server).get(
        "/presentation-definitions?scope=did_write"
      );

      expect(response.body).toStrictEqual(
        expectedPresentationDefinitions.did_write
      );
      expect(response.status).toBe(200);

      // 4. With explicit scope "tir_write"
      response = await request(server).get(
        "/presentation-definitions?scope=tir_write"
      );

      expect(response.body).toStrictEqual(
        expectedPresentationDefinitions.tir_write
      );
      expect(response.status).toBe(200);

      // 5. With explicit scope "generic_write"
      response = await request(server).get(
        "/presentation-definitions?scope=generic_write"
      );

      expect(response.body).toStrictEqual(
        expectedPresentationDefinitions.generic_write
      );
      expect(response.status).toBe(200);
    });
  });
});
