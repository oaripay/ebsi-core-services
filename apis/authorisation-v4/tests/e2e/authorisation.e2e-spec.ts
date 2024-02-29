import { randomBytes, randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import { describe, beforeAll, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  EbsiIssuer,
  EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { PresentationSubmission } from "@sphereon/pex-models";
import qs from "qs";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { encode } from "@ebsiint-api/shared";
import { createJWT, decodeJWT, ES256KSigner } from "did-jwt";
import { calculateJwkThumbprint, importJWK, jwtVerify, SignJWT } from "jose";
import type { JWK } from "jose";
import { AppModule } from "../../src/app.module.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import {
  CUSTOM_SCOPES,
  DIDR_INVITE_PRESENTATION_DEFINITION,
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_PRESENTATION_DEFINITION,
  DIDR_WRITE_SCOPE,
  TIMESTAMP_WRITE_PRESENTATION_DEFINITION,
  TIMESTAMP_WRITE_SCOPE,
  TIR_INVITE_PRESENTATION_DEFINITION,
  TIR_INVITE_SCOPE,
  TIR_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_SCOPE,
  TNT_AUTHORISE_PRESENTATION_DEFINITION,
  TNT_AUTHORISE_SCOPE,
  TNT_CREATE_PRESENTATION_DEFINITION,
  TNT_CREATE_SCOPE,
  TNT_WRITE_PRESENTATION_DEFINITION,
  TNT_WRITE_SCOPE,
} from "../../src/modules/authorisation/authorisation.constants.js";
import type {
  JsonWebKeySet,
  Scope,
  TokenResponse,
} from "../../src/modules/authorisation/authorisation.interfaces.js";
import { getServer } from "../utils/getServer.js";
import { configureApp } from "../utils/app.js";
import {
  createLegalEntity,
  createPresentationSubmission,
} from "../utils/data.js";
import { CreateAccessTokenDto } from "../../src/modules/authorisation/dto/index.js";

describe("Authorisation  API v4 (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let authorisationApiV4Url: string;
  let trustedHostnames: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture, configService);

    // Turn off logger
    Logger.overrideLogger(false);

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    const domain = configService.get("domain", { infer: true });
    const apiUrlPrefix = configService.get("apiUrlPrefix", { infer: true });
    authorisationApiV4Url = `${domain}${apiUrlPrefix}`;
    trustedHostnames = configService.get("trustedHostnames", { infer: true });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /.well-known/openid-configuration", () => {
    it("should return the well-known OpenID configuration", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/.well-known/openid-configuration",
      );

      expect(response.body).toStrictEqual({
        issuer: expect.any(String),
        authorization_endpoint: `${authorisationApiV4Url}/authorize`,
        token_endpoint: `${authorisationApiV4Url}/token`,
        presentation_definition_endpoint: `${authorisationApiV4Url}/presentation-definitions`,
        jwks_uri: `${authorisationApiV4Url}/jwks`,
        scopes_supported: ["openid", ...CUSTOM_SCOPES],
        response_types_supported: ["token"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["none"],
        subject_syntax_types_supported: ["did:ebsi", "did:key"],
        token_endpoint_auth_methods_supported: ["private_key_jwt"],
        vp_formats_supported: {
          jwt_vp: {
            alg_values_supported: ["ES256"],
          },
          jwt_vp_json: {
            alg_values_supported: ["ES256"],
          },
          jwt_vc: {
            alg_values_supported: ["ES256"],
          },
          jwt_vc_json: {
            alg_values_supported: ["ES256"],
          },
        },
        grant_types_supported: ["vp_token"],
        subject_trust_frameworks_supported: ["ebsi"],
        id_token_types_supported: ["subject_signed_id_token"],
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /jwks", () => {
    it("should return the OP's JWKS", async () => {
      expect.assertions(4);

      const response = await request(server).get("/jwks");

      expect(response.body).toStrictEqual({
        keys: expect.arrayContaining([
          {
            kty: "EC",
            crv: "P-256",
            alg: "ES256",
            x: expect.any(String),
            y: expect.any(String),
            kid: expect.any(String),
          },
        ]),
      });
      expect(
        (response.headers as Record<string, unknown>)["content-type"],
      ).toBe("application/jwk-set+json; charset=utf-8");
      expect(response.status).toBe(200);

      const jwk = (response.body as { keys: JWK[] }).keys[0]!;
      const thumbprint = await calculateJwkThumbprint(jwk);

      expect(jwk.kid).toBe(thumbprint);
    });
  });

  describe("GET /presentation-definitions", () => {
    it("should return an error if the scope is invalid", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/presentation-definitions?scope=test",
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the expected presentation definition for the given scope", async () => {
      expect.assertions(16);

      //  With explicit scope "openid didr_invite"
      let response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${DIDR_INVITE_SCOPE}`,
        )}`,
      );

      expect(response.body).toStrictEqual(DIDR_INVITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid didr_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${DIDR_WRITE_SCOPE}`,
        )}`,
      );

      expect(response.body).toStrictEqual(DIDR_WRITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid tir_invite"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TIR_INVITE_SCOPE}`,
        )}`,
      );

      expect(response.body).toStrictEqual(TIR_INVITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid tir_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TIR_WRITE_SCOPE}`,
        )}`,
      );

      expect(response.body).toStrictEqual(TIR_WRITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid timestamp_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TIMESTAMP_WRITE_SCOPE}`,
        )}`,
      );

      expect(response.body).toStrictEqual(
        TIMESTAMP_WRITE_PRESENTATION_DEFINITION,
      );
      expect(response.status).toBe(200);

      // With explicit scope "openid tnt_authorise"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TNT_AUTHORISE_SCOPE}`,
        )}`,
      );

      const tntAuthorisePresentationDefinition = structuredClone(
        TNT_AUTHORISE_PRESENTATION_DEFINITION,
      );
      // @ts-expect-error presentationDefinition is supposed to be immutable, but we're working on a clone.
      tntAuthorisePresentationDefinition.input_descriptors[0].constraints.fields[1].filter.enum =
        configService.get("tntAuthoriseIssuersAllowlist", { infer: true });
      expect(response.body).toStrictEqual(tntAuthorisePresentationDefinition);
      expect(response.status).toBe(200);

      // With explicit scope "openid tnt_create"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TNT_CREATE_SCOPE}`,
        )}`,
      );

      expect(response.body).toStrictEqual(TNT_CREATE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid tnt_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TNT_WRITE_SCOPE}`,
        )}`,
      );

      const tntWritePresentationDefinition = structuredClone(
        TNT_WRITE_PRESENTATION_DEFINITION,
      );
      expect(response.body).toStrictEqual(tntWritePresentationDefinition);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /token", () => {
    it("should return an error if the grant_type is invalid", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          new URLSearchParams({
            grant_type: "test",
          }).toString(),
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description: "grant_type must be equal to vp_token",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"],
      ).toBe("application/json; charset=utf-8");
    });

    it("should return an error if the scope is invalid", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          new URLSearchParams({
            grant_type: "vp_token",
            scope: "test",
          }).toString(),
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write')",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"],
      ).toBe("application/json; charset=utf-8");
    });

    it("should return an error if the vp_token is invalid", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          new URLSearchParams({
            grant_type: "vp_token",
            scope: "openid didr_invite",
            vp_token: "test",
          }).toString(),
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description: "vp_token must be a jwt string",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"],
      ).toBe("application/json; charset=utf-8");
    });

    describe.each(CUSTOM_SCOPES)("with scope 'openid %s'", (customScope) => {
      const scope: Scope = `openid ${customScope}`;

      describe.each(["jwt_vc", "jwt_vc_json"] as const)(
        "and format '%s'",
        (format) => {
          let issuer: EbsiIssuer;
          let client: EbsiIssuer;
          let vcPayload: EbsiVerifiableAttestation;
          let vpPayload: EbsiVerifiablePresentation;
          let presentationSubmission: PresentationSubmission;
          let issuanceDate: Date;
          let expirationDate: Date;

          beforeAll(async () => {
            const issuerKid = configService.get("testIssuerKid", {
              infer: true,
            });
            if (!issuerKid) throw new Error("TEST_ISSUER_KID must be defined");

            const issuerAlg = configService.get("testIssuerAlg", {
              infer: true,
            });
            if (!issuerAlg) throw new Error("TEST_ISSUER_ALG must be defined");
            // Only support ES256K issuer (temporary)
            if (issuerAlg !== "ES256K") {
              throw new Error("TEST_ISSUER_ALG must be ES256K");
            }

            const issuerPrivateKey = configService.get("testIssuerPrivateKey", {
              infer: true,
            });
            if (!issuerPrivateKey) {
              throw new Error("TEST_ISSUER_PRIVATE_KEY must be defined");
            }

            const issuerAttribute = configService.get("testIssuerAttribute", {
              infer: true,
            });
            if (!issuerAttribute) {
              throw new Error("TEST_ISSUER_ATTRIBUTE must be defined");
            }

            const privateKeyJwk =
              encode.privateKey.fromHexToJWK(issuerPrivateKey);
            const { d, ...publicKeyJwk } = privateKeyJwk;

            issuer = {
              kid: issuerKid,
              did: issuerKid.split("#")[0]!,
              publicKeyJwk,
              privateKeyJwk,
              alg: issuerAlg,
            };

            if (
              [
                DIDR_INVITE_SCOPE,
                TIR_INVITE_SCOPE,
                TNT_AUTHORISE_SCOPE,
              ].includes(customScope)
            ) {
              // client is a new LE
              client = await createLegalEntity("ES256K");
            } else if (
              customScope === TNT_CREATE_SCOPE ||
              customScope === TNT_WRITE_SCOPE
            ) {
              const clientKid = configService.get("testTntAuthorisedUserKid", {
                infer: true,
              });

              if (!clientKid) {
                throw new Error("TEST_TNT_AUTHORISED_USER_KID must be defined");
              }

              const clientPrivateKey = configService.get(
                "testTntAuthorisedUserPrivateKey",
                { infer: true },
              );

              if (!clientPrivateKey) {
                throw new Error(
                  "TEST_TNT_AUTHORISED_USER_PRIVATE_KEY must be defined",
                );
              }

              const clientPrivateKeyJwk =
                encode.privateKey.fromHexToJWK(clientPrivateKey);
              const { d: unusedD, ...clientPublicKeyJwk } = privateKeyJwk;

              client = {
                kid: clientKid,
                did: clientKid.split("#")[0]!,
                publicKeyJwk: clientPublicKeyJwk,
                privateKeyJwk: clientPrivateKeyJwk,
                alg: "ES256K",
              };
            } else {
              client = issuer;
            }

            issuanceDate = new Date();
            // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
            expirationDate = new Date(
              issuanceDate.getTime() + 2 * 60 * 60 * 1000,
            );

            // Note: in this test, the VC issuer is also the VC subject and the VP holder
            vcPayload = {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              id: `urn:uuid:${randomUUID()}`,
              type: ["VerifiableCredential", "VerifiableAttestation"],
              issuer: issuer.did,
              issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
              issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
              validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
              expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
              credentialSubject: { id: client.did, type: "same-device" },
              credentialSchema: {
                id: configService.get("testOidSchemaPattern", { infer: true }),
                type: "FullJsonSchemaValidator2021",
              },
              termsOfUse: {
                id: issuerAttribute,
                type: "IssuanceCertificate",
              },
            };

            if (customScope === TIR_INVITE_SCOPE) {
              vcPayload.type.push("VerifiableAccreditationToAccredit");
            } else if (
              customScope === DIDR_INVITE_SCOPE ||
              customScope === TNT_AUTHORISE_SCOPE
            ) {
              vcPayload.type.push("VerifiableAuthorisationToOnboard");
            }

            vpPayload = {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: ["VerifiablePresentation"],
              verifiableCredential: [],
              holder: client.did,
            };
          });

          beforeEach(() => {
            // Reset to valid presentation submission before each test
            presentationSubmission = createPresentationSubmission(
              customScope,
              format,
            );
            // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
            vpPayload.verifiableCredential = [];
            vpPayload["id"] = randomUUID(); // VP ID is used as JWT JTI.
          });

          describe("vp_token validation", () => {
            beforeEach(() => {
              // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
              vpPayload.verifiableCredential = [];
              vpPayload["id"] = randomUUID(); // VP ID is used as JWT JTI.
            });

            it("should return an error the audience is not the service", async () => {
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  issuer,
                  {
                    ebsiAuthority: "example.net",
                    skipValidation: true,
                    trustedHostnames,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                client,
                "authentication-service-v3",
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  nonce: randomUUID(),
                  trustedHostnames,
                  ...([
                    DIDR_WRITE_SCOPE,
                    TIR_WRITE_SCOPE,
                    TIMESTAMP_WRITE_SCOPE,
                    TNT_CREATE_SCOPE,
                    TNT_WRITE_SCOPE,
                  ].includes(customScope)
                    ? {
                        // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                        exp: Math.floor(Date.now() / 1000) + 100,
                        nbf: Math.floor(Date.now() / 1000) - 100,
                      }
                    : {}),
                },
              );

              const response = await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpJwt,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              expect(response.body).toStrictEqual({
                error: "invalid_request",
                error_description: `Invalid Verifiable Presentation: JWT "aud" property MUST match the expected audience "${authorisationApiV4Url}"`,
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error if sub is not the client's DID", async () => {
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  issuer,
                  {
                    ebsiAuthority: "example.net",
                    skipValidation: true,
                    trustedHostnames,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                client,
                authorisationApiV4Url,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  nonce: randomUUID(),
                  trustedHostnames,
                  ...([
                    DIDR_WRITE_SCOPE,
                    TIR_WRITE_SCOPE,
                    TIMESTAMP_WRITE_SCOPE,
                    TNT_CREATE_SCOPE,
                    TNT_WRITE_SCOPE,
                  ].includes(customScope)
                    ? {
                        // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                        exp: Math.floor(Date.now() / 1000) + 100,
                        nbf: Math.floor(Date.now() / 1000) - 100,
                      }
                    : {}),
                },
              );

              // Fake a change in original vpJwt
              const vpJwtDecoded = decodeJWT(vpJwt);
              const anotherDid = EbsiWallet.createDid();
              vpJwtDecoded.payload.sub = anotherDid;
              const vpTokenTampered = await createJWT(
                vpJwtDecoded.payload,
                {
                  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                  issuer: vpJwtDecoded.payload.iss as string,
                  signer: ES256KSigner(randomBytes(32)),
                },
                {
                  kid: client.kid,
                },
              );

              const response = await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpTokenTampered,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              expect(response.body).toStrictEqual({
                error: "invalid_request",
                error_description: `Invalid Verifiable Presentation: JWT "sub" property MUST match the VP holder "${client.did}"`,
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error if the VP JWT has expired", async () => {
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  issuer,
                  {
                    ebsiAuthority: "example.net",
                    skipValidation: true,
                    trustedHostnames,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                client,
                authorisationApiV4Url,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  nonce: randomUUID(),
                  trustedHostnames,
                  // Override "exp" and "nbf"
                  exp: Math.floor(Date.now() / 1000) - 100,
                  nbf: Math.floor(Date.now() / 1000) - 1000,
                },
              );

              const response = await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpJwt,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              expect(response.body).toStrictEqual({
                error: "invalid_request",
                error_description:
                  "Invalid Verifiable Presentation: JWT has expired",
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error if the VP JWT is not valid yet", async () => {
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  issuer,
                  {
                    ebsiAuthority: "example.net",
                    skipValidation: true,
                    trustedHostnames,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                client,
                authorisationApiV4Url,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  nonce: randomUUID(),
                  trustedHostnames,
                  // Override "exp" and "nbf"
                  exp: Math.floor(Date.now() / 1000) + 1000,
                  nbf: Math.floor(Date.now() / 1000) + 100,
                },
              );

              const response = await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpJwt,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              expect(response.body).toStrictEqual({
                error: "invalid_request",
                error_description:
                  "Invalid Verifiable Presentation: JWT is not valid yet",
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error if nonce is not included in vp_token", async () => {
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  issuer,
                  {
                    ebsiAuthority: "example.net",
                    skipValidation: true,
                    trustedHostnames,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                client,
                authorisationApiV4Url,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  trustedHostnames,
                  // We don't add any nonce
                  ...([
                    DIDR_WRITE_SCOPE,
                    TIR_WRITE_SCOPE,
                    TIMESTAMP_WRITE_SCOPE,
                    TNT_CREATE_SCOPE,
                    TNT_WRITE_SCOPE,
                  ].includes(customScope)
                    ? {
                        // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                        exp: Math.floor(Date.now() / 1000) + 100,
                        nbf: Math.floor(Date.now() / 1000) - 100,
                      }
                    : {}),
                },
              );

              // Try submitting a vp without neither a nonce.
              const response = await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpJwt,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              expect(response.body).toStrictEqual({
                error: "invalid_request",
                error_description:
                  "The vp_token must contain a nonce in order to prevent replay attacks.",
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error when a nonce has been used twice", async () => {
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  issuer,
                  {
                    ebsiAuthority: "example.net",
                    skipValidation: true,
                    trustedHostnames,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              // Create VP JWT manually
              const privateKey = await importJWK(
                client.privateKeyJwk,
                client.alg,
              );
              const vpJwt = await new SignJWT({
                aud: authorisationApiV4Url,
                sub: client.did,
                iat: Math.floor(issuanceDate.getTime() / 1000),
                nbf: Math.floor(issuanceDate.getTime() / 1000),
                exp: Math.floor(expirationDate.getTime() / 1000),
                vp: vpPayload,
                nonce: randomUUID(),
                iss: client.did,
              })
                .setProtectedHeader({
                  alg: client.alg,
                  typ: "JWT",
                  kid: client.kid,
                })
                .sign(privateKey);

              await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpJwt,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              // Try submitting the same VP again.
              const response = await request(server)
                .post("/token")
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(
                  new URLSearchParams({
                    grant_type: "vp_token",
                    scope,
                    vp_token: vpJwt,
                    presentation_submission: JSON.stringify(
                      presentationSubmission,
                    ),
                  } satisfies CreateAccessTokenDto).toString(),
                );

              expect(response.body).toStrictEqual({
                error: "invalid_request",
                error_description:
                  "The vp_token contains a nonce which has already been used.",
              });
              expect(response.status).toBe(400);
            });
          });

          it("should return an error if the presentation submission is invalid (including error details)", async () => {
            presentationSubmission = {
              id: randomUUID(),
              definition_id: "openid_presentation",
              descriptor_map: [
                {
                  id: "same-device-in-time-credential",
                  path: "$",
                  format: "jwt_vp",
                  path_nested: {
                    id: randomUUID(),
                    format,
                    path: "$vp.verifiableCredential[0]", // wrong path
                  },
                },
              ],
            };

            if (
              [
                DIDR_INVITE_SCOPE,
                TIR_INVITE_SCOPE,
                TNT_AUTHORISE_SCOPE,
              ].includes(customScope)
            ) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                issuer,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  trustedHostnames,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            let vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce: randomUUID(),
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            let response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  scope,
                  vp_token: vpJwt,
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels
- [root.presentation_submission] each path should be a valid jsonPath`,
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");

            presentationSubmission = {
              id: randomUUID(),
              definition_id: "openid_presentation",
              descriptor_map: [
                {
                  id: "same-device-in-time-credential",
                  path: "$",
                  format: "jwt_vp",
                  path_nested: {
                    id: randomUUID(),
                    format,
                    path: "$.vp.verifiableCredential[1]", // no credential at this index
                  },
                },
              ],
            };

            vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce: randomUUID(),
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  scope,
                  vp_token: vpJwt,
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels`,
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");

            presentationSubmission = {
              id: randomUUID(),
              definition_id: "openid_presentation",
              descriptor_map: [
                {
                  id: "same-device-in-time-credential",
                  path: "$.vp", // wrong path
                  format: "jwt_vp",
                  path_nested: {
                    id: randomUUID(),
                    format,
                    path: "$.vc.verifiableCredential[0]", // wrong path
                  },
                },
              ],
            };

            vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce: randomUUID(),
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  scope,
                  vp_token: vpJwt,
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels`,
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");

            vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce: randomUUID(),
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                qs.stringify({
                  grant_type: "vp_token",
                  scope,
                  vp_token: vpJwt,
                  presentation_submission: presentationSubmission,
                }),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description:
                "presentation_submission must be a json string",
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");

            vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce: randomUUID(),
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  scope,
                  vp_token: vpJwt,
                  presentation_submission: JSON.stringify({ foo: "bar" }), // invalid json
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description: `Invalid Presentation Submission:
- Validation error. Path: 'presentation_submission.id'. Reason: Required
- Validation error. Path: 'presentation_submission.definition_id'. Reason: Required
- Validation error. Path: 'presentation_submission.descriptor_map'. Reason: Required`,
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");
          });

          it("should return an error if the content is not application/x-www-form-urlencoded", async () => {
            if (
              [
                DIDR_INVITE_SCOPE,
                TIR_INVITE_SCOPE,
                TNT_AUTHORISE_SCOPE,
              ].includes(customScope)
            ) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                issuer,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  trustedHostnames,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const nonce = randomUUID();

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce,
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/json")
              .send({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              });

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description:
                "Content-type must be application/x-www-form-urlencoded",
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");
          });

          it("should return an access token and an ID token when the presentation is valid", async () => {
            if (
              customScope === TIR_INVITE_SCOPE ||
              customScope === TNT_AUTHORISE_SCOPE
            ) {
              // /!\ Skip test - Could be implemented later
              // In order to pass this test, we would have to register a new DID into the DID Registry
              // and a new Trusted Issuer into the TIR. It can only be run in an environment where we
              // can use write operations, and where the DIDR API v4 and TIR API v4 support the new
              // auth mechanism.
              expect.assertions(0);
              return;
            }

            if (customScope === DIDR_INVITE_SCOPE) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                issuer,
                {
                  ebsiAuthority: "example.net",
                  skipValidation: true,
                  trustedHostnames,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const nonce = randomUUID();

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              client,
              authorisationApiV4Url,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
                nonce,
                trustedHostnames,
                ...([
                  DIDR_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                ].includes(customScope)
                  ? {
                      // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                      exp: Math.floor(Date.now() / 1000) + 100,
                      nbf: Math.floor(Date.now() / 1000) - 100,
                    }
                  : {}),
              },
            );

            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  scope,
                  vp_token: vpJwt,
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              access_token: expect.any(String),
              expires_in: 7200,
              id_token: expect.any(String),
              scope,
              token_type: "Bearer",
            });

            expect(response.status).toBe(200);

            // Decode access token
            const { access_token: accessToken } =
              response.body as TokenResponse;
            const decodedAccessToken = decodeJWT(accessToken);

            expect(decodedAccessToken.header).toStrictEqual({
              alg: "ES256",
              kid: expect.any(String),
              typ: "JWT",
            });

            expect(decodedAccessToken.payload).toStrictEqual({
              aud: authorisationApiV4Url,
              exp: expect.any(Number),
              iat: expect.any(Number),
              iss: authorisationApiV4Url,
              jti: expect.any(String),
              scp: scope,
              sub: client.did,
            });

            // Get API public key in order to verify the signature
            const { kid: accessTokenKid } = decodedAccessToken.header;
            const jwksResponse = await request(server).get("/jwks");

            expect(jwksResponse.status).toBe(200);

            const { keys } = jwksResponse.body as JsonWebKeySet;
            const apiPublicKeyJwk = keys.find(
              (key) => key["kid"] === accessTokenKid,
            );

            expect(apiPublicKeyJwk).toBeDefined();

            const apiPublicKey = await importJWK(apiPublicKeyJwk as JWK);

            // Verify the signature of the access token
            await expect(
              jwtVerify(accessToken, apiPublicKey),
            ).resolves.not.toThrow();

            // Decode and verify ID Token
            const { id_token: idToken } = response.body as TokenResponse;
            const decodedIdToken = decodeJWT(idToken);

            expect(decodedIdToken.header).toStrictEqual({
              alg: "ES256",
              kid: expect.any(String),
              typ: "JWT",
            });

            expect(decodedIdToken.payload).toStrictEqual({
              aud: client.did,
              exp: expect.any(Number),
              iat: expect.any(Number),
              iss: authorisationApiV4Url,
              jti: expect.any(String),
              sub: client.did,
              nonce,
            });

            await expect(
              jwtVerify(idToken, apiPublicKey),
            ).resolves.not.toThrow();
          });
        },
      );
    });
  });
});
