import type {
  EbsiEnvConfiguration,
  EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { PresentationSubmission } from "@sphereon/pex-models";
import type { RawServerDefault } from "fastify";
import type { JWK } from "jose";

import { fromUrl } from "@cef-ebsi/ebsi-uri";
import { metadata as attestationMetadata } from "@cef-ebsi/vcdm1.1-attestation-schema";
import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { createJWT, decodeJWT, ES256KSigner } from "did-jwt";
import { calculateJwkThumbprint, importJWK, jwtVerify } from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { randomBytes, randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import qs from "qs";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  JsonWebKeySet,
  Scope,
  TokenResponse,
} from "./authorisation.interfaces.js";

import { configureApp } from "../../../tests/utils/app.js";
import {
  createLegalEntity,
  createPresentationSubmission,
  LegalEntity,
} from "../../../tests/utils/data.js";
import {
  CUSTOM_SCOPES,
  DIDR_INVITE_PRESENTATION_DEFINITION,
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_PRESENTATION_DEFINITION,
  DIDR_WRITE_SCOPE,
  TIR_INVITE_PRESENTATION_DEFINITION,
  TIR_INVITE_SCOPE,
  TIR_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_SCOPE,
} from "./authorisation.constants.js";
import { AuthorisationModule } from "./authorisation.module.js";
import { CreateAccessTokenDto } from "./dto/index.js";

/**
 * Escape DID in URLs mocked by MSW
 * @see https://github.com/mswjs/msw/discussions/739#discussioncomment-2524732
 */
function escapeDid(url: string) {
  return url.replace("did:ebsi:", String.raw`did\:ebsi\:`);
}

describe.each(["EBSI URI", "URL"] as const)(
  "Authorisation Module (using %s as resource locator)",
  (uriType) => {
    let app: NestFastifyApplication;
    let server: RawServerDefault;
    let domain: string;
    let serviceEndpoint: string;
    let credentialIssuer: LegalEntity;
    let credentialIssuerAccreditationUrl: string;
    let credentialSubject: LegalEntity;
    let ebsiEnvConfig: EbsiEnvConfiguration;
    const mockServer = setupServer();
    let authorisationCredentialSchema: string;

    beforeAll(async () => {
      // Intercept network requests
      mockServer.listen({
        onUnhandledRequest: ({ url }, print) => {
          // Bypass local requests
          if (new URL(url).hostname === "127.0.0.1") return;

          print.error();
        },
      });

      const moduleFixture = await Test.createTestingModule({
        imports: [AuthorisationModule],
      }).compile();

      // Turn off logger
      Logger.overrideLogger(false);

      app = await configureApp(moduleFixture);

      await app.init();
      const fastifyInstance = app.getHttpAdapter().getInstance();
      await fastifyInstance.ready();

      server = app.getHttpServer();

      const configService =
        moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

      ebsiEnvConfig = configService.get("ebsiEnvConfig");

      domain = configService.get("domain");
      const apiUrlPrefix = configService.get("apiUrlPrefix");
      serviceEndpoint = `${domain}${apiUrlPrefix}`;
      authorisationCredentialSchema = `${domain}/trusted-schemas-registry/v2/schemas/${attestationMetadata.id.multibase_base58btc}`;
      credentialIssuer = await createLegalEntity("ES256K");
      credentialIssuerAccreditationUrl = `${domain}/trusted-issuers-registry/v4/issuers/${
        credentialIssuer.did
      }/attributes/${randomBytes(16).toString("hex")}`;
      credentialSubject = await createLegalEntity("ES256K");
    });

    beforeEach(async () => {
      mockServer.use(
        http.get(
          escapeDid(
            `${domain}/did-registry/v4/identifiers/${credentialIssuer.did}`,
          ),
          () => HttpResponse.json(credentialIssuer.didDocument),
        ),
        http.get(
          escapeDid(
            `${domain}/trusted-issuers-registry/v4/issuers/${credentialIssuer.did}`,
          ),
          () => HttpResponse.json({}),
        ),
      );

      // Issuer Self-Accreditation
      const iat = Math.round(Date.now() / 1000) - 5; // issued 5 seconds ago
      const exp = iat + 365 * 24 * 3600;
      const jti = `urn:uuid:${randomUUID()}`;
      const issuanceDate = new Date(iat * 1000).toISOString();
      const expirationDate = new Date(exp * 1000).toISOString();
      const accreditation = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        credentialSchema: {
          id:
            uriType === "EBSI URI"
              ? fromUrl(authorisationCredentialSchema, ebsiEnvConfig)
              : authorisationCredentialSchema,
          type: "FullJsonSchemaValidator2021",
        },
        credentialSubject: {
          accreditedFor: [
            {
              policies: [
                {
                  type: "ebsiPilot2023",
                  uri: "{uri to EBSI gov documents}",
                },
              ],
              schemaId: authorisationCredentialSchema,
              types: [
                "VerifiableCredential",
                "VerifiableAttestation",
                "VerifiableAuthorisationForTrustChain",
              ],
            },
          ],
          id: credentialIssuer.did,
        },
        expirationDate,
        id: jti,
        issuanceDate,
        issued: issuanceDate,
        issuer: credentialIssuer.did,
        type: [
          "VerifiableCredential",
          "VerifiableAttestation",
          "VerifiableAccreditation",
          "VerifiableAccreditationToAttest",
        ],
        validFrom: issuanceDate,
        validUntil: expirationDate,
      } satisfies EbsiVerifiableAttestation;

      const accreditationVcJwt = await createJWT(
        {
          exp,
          iat,
          iss: accreditation.issuer,
          jti,
          nbf: iat,
          sub: accreditation.credentialSubject.id,
          vc: accreditation,
        },
        { issuer: credentialIssuer.did, signer: credentialIssuer.signer },
        {
          alg: credentialIssuer.alg,
          kid: credentialIssuer.kid,
          typ: "JWT",
        },
      );

      mockServer.use(
        http.get(escapeDid(credentialIssuerAccreditationUrl), () =>
          HttpResponse.json({ attribute: { body: accreditationVcJwt } }),
        ),
      );
    });

    afterEach(() => {
      mockServer.resetHandlers();
    });

    afterAll(async () => {
      mockServer.close();

      await app.close();
    });

    describe("GET /.well-known/openid-configuration", () => {
      it("should return the well-known OpenID configuration", async () => {
        expect.assertions(2);

        const response = await request(server).get(
          "/.well-known/openid-configuration",
        );

        expect(response.body).toStrictEqual({
          authorization_endpoint: `${serviceEndpoint}/authorize`,
          grant_types_supported: expect.arrayContaining(["vp_token"]),
          id_token_signing_alg_values_supported: expect.arrayContaining([
            "none",
          ]),
          id_token_types_supported: expect.arrayContaining([
            "subject_signed_id_token",
          ]),
          issuer: expect.any(String),
          jwks_uri: `${serviceEndpoint}/jwks`,
          presentation_definition_endpoint: `${serviceEndpoint}/presentation-definitions`,
          response_types_supported: expect.arrayContaining(["token"]),
          scopes_supported: expect.arrayContaining(["openid"]),
          subject_syntax_types_supported: expect.arrayContaining([
            "did:ebsi",
            "did:key",
          ]),
          subject_trust_frameworks_supported: expect.arrayContaining(["ebsi"]),
          subject_types_supported: expect.arrayContaining(["public"]),
          token_endpoint: `${serviceEndpoint}/token`,
          token_endpoint_auth_methods_supported: expect.arrayContaining([
            "private_key_jwt",
          ]),
          vp_formats_supported: expect.objectContaining({
            jwt_vc: expect.objectContaining({
              alg_values_supported: expect.arrayContaining(["ES256"]),
            }),
            jwt_vp: expect.objectContaining({
              alg_values_supported: expect.arrayContaining(["ES256"]),
            }),
          }),
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
              alg: "ES256",
              crv: "P-256",
              kid: expect.any(String),
              kty: "EC",
              x: expect.any(String),
              y: expect.any(String),
            },
          ]),
        });

        expect(response.status).toBe(200);
        expect(
          (response.headers as Record<string, unknown>)["content-type"],
        ).toBe("application/jwk-set+json; charset=utf-8");

        const jwk = (response.body as { keys: JWK[] }).keys[0]!;
        const thumbprint = await calculateJwkThumbprint(jwk);

        expect(jwk.kid).toBe(thumbprint);
      });
    });

    describe("GET /presentation-definitions", () => {
      it("should return an error if the scope is invalid", async () => {
        expect.assertions(12);

        // Without explicit scope
        let response = await request(server).get("/presentation-definitions");

        expect(response.body).toStrictEqual({
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"],
        ).toBe("application/problem+json; charset=utf-8");

        // With an invalid scope
        response = await request(server).get(
          "/presentation-definitions?scope=test",
        );

        expect(response.body).toStrictEqual({
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"],
        ).toBe("application/problem+json; charset=utf-8");

        // Doesn't contain "openid"
        response = await request(server).get(
          `/presentation-definitions?${new URLSearchParams({
            scope: "didr_write tir_write",
          }).toString()}`,
        );

        expect(response.body).toStrictEqual({
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"],
        ).toBe("application/problem+json; charset=utf-8");

        // Includes only "openid"
        response = await request(server).get(
          "/presentation-definitions?scope=openid",
        );

        expect(response.body).toStrictEqual({
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"],
        ).toBe("application/problem+json; charset=utf-8");
      });

      it("should return the expected presentation definition for the given scope", async () => {
        expect.assertions(8);

        //  With explicit scope "openid didr_invite"
        let response = await request(server).get(
          `/presentation-definitions?scope=${encodeURIComponent(
            `openid ${DIDR_INVITE_SCOPE}`,
          )}`,
        );

        expect(response.body).toStrictEqual(
          DIDR_INVITE_PRESENTATION_DEFINITION,
        );
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
              presentation_submission: "{}",
              // @ts-expect-error Type '"test"' is not assignable to type '"openid didr_write" | "openid tir_invite" | "openid tir_write" | "openid didr_invite"'
              scope: "test",
            } satisfies CreateAccessTokenDto).toString(),
          );

        expect(response.body).toStrictEqual({
          error: "invalid_request",
          error_description:
            "scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')",
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
              presentation_submission: "{}",
              scope: "openid didr_invite",
              vp_token: "test",
            } satisfies CreateAccessTokenDto).toString(),
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
        let vcPayload: EbsiVerifiableAttestation;
        let vpPayload: EbsiVerifiablePresentation;
        let presentationSubmission: PresentationSubmission;
        let issuanceDate: Date;
        let expirationDate: Date;

        beforeEach(() => {
          issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
          // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
          expirationDate = new Date(
            issuanceDate.getTime() + 2 * 60 * 60 * 1000,
          );

          vcPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            credentialSchema: {
              id:
                uriType === "EBSI URI"
                  ? fromUrl(authorisationCredentialSchema, ebsiEnvConfig)
                  : authorisationCredentialSchema,
              type: "FullJsonSchemaValidator2021",
            },
            credentialSubject: {
              id: credentialSubject.did,
              type: "same-device",
            },
            expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
            id: `urn:uuid:${randomUUID()}`,
            issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
            issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
            issuer: credentialIssuer.did,
            termsOfUse: {
              id:
                uriType === "EBSI URI"
                  ? fromUrl(credentialIssuerAccreditationUrl, ebsiEnvConfig)
                  : credentialIssuerAccreditationUrl,
              type: "IssuanceCertificate",
            },
            type: ["VerifiableCredential", "VerifiableAttestation"],
            validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          };

          if (customScope === TIR_INVITE_SCOPE) {
            vcPayload.type.push("VerifiableAccreditationToAccredit");
          } else if (customScope === DIDR_INVITE_SCOPE) {
            vcPayload.type.push("VerifiableAuthorisationToOnboard");
          }

          vpPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            holder: credentialSubject.did,
            id: randomUUID(),
            type: ["VerifiablePresentation"],
            verifiableCredential: [],
          };

          // Reset to valid presentation submission before each test
          presentationSubmission = createPresentationSubmission(customScope);

          // If scope=didr_invite, the DID is not yet registered in the DIDR and TIR
          if (customScope === DIDR_INVITE_SCOPE) {
            mockServer.use(
              http.get(
                escapeDid(
                  `${domain}/did-registry/v4/identifiers/${credentialSubject.did}`,
                ),
                () => new HttpResponse(undefined, { status: 404 }), // HttpResponse.text("Not found", { status: 404 }),
              ),
            );
          } else {
            mockServer.use(
              http.get(
                escapeDid(
                  `${domain}/did-registry/v4/identifiers/${credentialSubject.did}`,
                ),
                () => HttpResponse.json(credentialSubject.didDocument),
              ),
            );
          }

          if (customScope === TIR_INVITE_SCOPE) {
            mockServer.use(
              http.get(
                escapeDid(
                  `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}`,
                ),
                () =>
                  HttpResponse.json({
                    attributes: [
                      {
                        body: "",
                        hash: "c5f705998e64792887cca48553f57b67b2a511fc271c2a49e677a4c995320aa4",
                        issuerType: "RootTAO",
                        rootTao: credentialIssuer.did,
                        tao: credentialIssuer.did,
                      },
                      {
                        body: "",
                        hash: "04647216cf99e4ea91c5ee230129bededf92c349663d4d99945ac510c4897a12",
                        issuerType: "RootTAO",
                        rootTao: credentialIssuer.did,
                        tao: credentialIssuer.did,
                      },
                    ],
                    did: credentialSubject.did,
                  }),
              ),
            );
          }

          if (customScope === TIR_WRITE_SCOPE) {
            // For tir_invite, create empty revisions
            mockServer.use(
              http.get(
                escapeDid(
                  `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}`,
                ),
                () =>
                  HttpResponse.json({
                    attributes: [
                      {
                        body: "eyJhbGciOiJFUzI1NiI...",
                        hash: "c5f705998e64792887cca48553f57b67b2a511fc271c2a49e677a4c995320aa4",
                        issuerType: "RootTAO",
                        rootTao: credentialIssuer.did,
                        tao: credentialIssuer.did,
                      },
                      {
                        body: "eyJhbGciOiJFUzI1NiI...",
                        hash: "04647216cf99e4ea91c5ee230129bededf92c349663d4d99945ac510c4897a12",
                        issuerType: "RootTAO",
                        rootTao: credentialIssuer.did,
                        tao: credentialIssuer.did,
                      },
                    ],
                    did: credentialSubject.did,
                  }),
              ),
            );
          }
        });

        afterEach(() => {
          mockServer.resetHandlers();
        });

        describe("vp_token validation", () => {
          beforeEach(() => {
            // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
            vpPayload.verifiableCredential = [];
            vpPayload["id"] = randomUUID(); // VP ID is used as JWT JTI.
          });

          it("should return an error the audience is not the service", async () => {
            if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              credentialSubject,
              "authentication-service-v3",
              ebsiEnvConfig,
              {
                nonce: randomUUID(),
                skipValidation: true,
                ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description: `Invalid Verifiable Presentation: JWT "aud" property MUST match the expected audience "${domain}/authorisation/v3"`,
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");
          });

          it("should return an error if sub is not the client's DID", async () => {
            if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              credentialSubject,
              serviceEndpoint,
              ebsiEnvConfig,
              {
                nonce: randomUUID(),
                skipValidation: true,
                ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                issuer: vpJwtDecoded.payload.iss!,
                signer: ES256KSigner(randomBytes(32)),
              },
              {
                kid: credentialIssuer.kid,
              },
            );

            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpTokenTampered,
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description: `Invalid Verifiable Presentation: JWT "sub" property MUST match the VP holder "${credentialSubject.did}"`,
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");
          });

          it("should return an error if the VP JWT has expired", async () => {
            if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              credentialSubject,
              serviceEndpoint,
              ebsiEnvConfig,
              {
                // Override "exp" and "nbf"
                exp: Math.floor(Date.now() / 1000) - 100,
                nbf: Math.floor(Date.now() / 1000) - 1000,
                nonce: randomUUID(),
                skipValidation: true,
              },
            );

            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
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
            if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              credentialSubject,
              serviceEndpoint,
              ebsiEnvConfig,
              {
                // Override "exp" and "nbf"
                exp: Math.floor(Date.now() / 1000) + 1000,
                nbf: Math.floor(Date.now() / 1000) + 100,
                nonce: randomUUID(),
                skipValidation: true,
              },
            );

            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
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
            if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              credentialSubject,
              serviceEndpoint,
              ebsiEnvConfig,
              {
                skipValidation: true,
                // We don't add any nonce
                ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
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
            if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);
            }

            // Create VP JWT manually
            const vpJwt = await createJWT(
              {
                aud: serviceEndpoint,
                exp: Math.floor(expirationDate.getTime() / 1000),
                iat: Math.floor(issuanceDate.getTime() / 1000),
                iss: credentialIssuer.did,
                nbf: Math.floor(issuanceDate.getTime() / 1000),
                nonce: randomUUID(),
                sub: credentialIssuer.did,
                vp: vpPayload,
              },
              { issuer: credentialIssuer.did, signer: credentialIssuer.signer },
              {
                alg: credentialIssuer.alg,
                kid: credentialIssuer.kid,
                typ: "JWT",
              },
            );

            await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
                } satisfies CreateAccessTokenDto).toString(),
              );

            // Try submitting the same VP again.
            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description:
                "The vp_token contains a nonce which has already been used.",
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");
          });

          // Fix: EBSIINT-6065
          // require at least 1 verifiable credential
          it("should return error when the number of verifiable credentials is not correct", async () => {
            if ([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)) {
              // Skip test
              return;
            }

            const vpJwt = await createVerifiablePresentationJwt(
              vpPayload,
              credentialSubject,
              serviceEndpoint,
              ebsiEnvConfig,
              {
                exp: Math.floor(Date.now() / 1000) + 100,
                nbf: Math.floor(Date.now() / 1000) - 100,
                nonce: randomUUID(),
                skipValidation: true,
              },
            );

            const response = await request(server)
              .post("/token")
              .set("Content-Type", "application/x-www-form-urlencoded")
              .send(
                new URLSearchParams({
                  grant_type: "vp_token",
                  presentation_submission: JSON.stringify(
                    presentationSubmission,
                  ),
                  scope,
                  vp_token: vpJwt,
                } satisfies CreateAccessTokenDto).toString(),
              );

            expect(response.body).toStrictEqual({
              error: "invalid_request",
              error_description:
                "Invalid Presentation Submission: VP needs to have at least one verifiable credential at this point",
            });
            expect(response.status).toBe(400);
            expect(
              (response.headers as Record<string, unknown>)["content-type"],
            ).toBe("application/json; charset=utf-8");
          });
        });

        it("should return an error if the content is not application/x-www-form-urlencoded", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              ebsiEnvConfig,
              {
                skipValidation: true,
              },
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const nonce = randomUUID();

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce,
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
            .set("Content-Type", "application/json")
            .send({
              grant_type: "vp_token",
              presentation_submission: presentationSubmission,
              scope,
              vp_token: vpJwt,
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

          response = await request(server)
            .post("/token")
            .unset("Content-Type")
            .send();

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

        it("should return an error if the presentation submission is not a JSON string", async () => {
          presentationSubmission = {
            definition_id: "openid_presentation",
            descriptor_map: [
              {
                format: "jwt_vp",
                id: "same-device-in-time-credential",
                path: "$",
                path_nested: {
                  format: "jwt_vc",
                  id: randomUUID(),
                  path: "$vp.verifiableCredential[0]", // wrong path
                },
              },
            ],
            id: randomUUID(),
          };

          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              ebsiEnvConfig,
              {
                skipValidation: true,
              },
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce: randomUUID(),
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
              qs.stringify({
                grant_type: "vp_token",
                presentation_submission: presentationSubmission,
                scope,
                vp_token: vpJwt,
              }),
            );

          expect(response.body).toStrictEqual({
            error: "invalid_request",
            error_description: "presentation_submission must be a json string",
          });
          expect(response.status).toBe(400);
        });

        it("should return an error if the presentation submission is invalid (including error details)", async () => {
          presentationSubmission = {
            definition_id: "openid_presentation",
            descriptor_map: [
              {
                format: "jwt_vp",
                id: "same-device-in-time-credential",
                path: "$",
                path_nested: {
                  format: "jwt_vc",
                  id: randomUUID(),
                  path: "$vp.verifiableCredential[0]", // wrong path
                },
              },
            ],
            id: randomUUID(),
          };

          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              ebsiEnvConfig,
              {
                skipValidation: true,
              },
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          let vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce: randomUUID(),
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                presentation_submission: JSON.stringify(presentationSubmission),
                scope,
                vp_token: vpJwt,
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
            definition_id: "openid_presentation",
            descriptor_map: [
              {
                format: "jwt_vp",
                id: "same-device-in-time-credential",
                path: "$",
                path_nested: {
                  format: "jwt_vc",
                  id: randomUUID(),
                  path: "$.verifiableCredential[1]", // no credential at this index
                },
              },
            ],
            id: randomUUID(),
          };

          vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce: randomUUID(),
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                presentation_submission: JSON.stringify(presentationSubmission),
                scope,
                vp_token: vpJwt,
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
            definition_id: "openid_presentation",
            descriptor_map: [
              {
                format: "jwt_vp",
                id: "same-device-in-time-credential",
                path: "$.vp", // wrong path
                path_nested: {
                  format: "jwt_vc",
                  id: randomUUID(),
                  path: "$.vc.verifiableCredential[0]", // wrong path
                },
              },
            ],
            id: randomUUID(),
          };

          vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce: randomUUID(),
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                presentation_submission: JSON.stringify(presentationSubmission),
                scope,
                vp_token: vpJwt,
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
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce: randomUUID(),
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                presentation_submission: JSON.stringify({ foo: "bar" }), // invalid json
                scope,
                vp_token: vpJwt,
              } satisfies CreateAccessTokenDto).toString(),
            );

          expect(response.body).toStrictEqual({
            error: "invalid_request",
            error_description: `Invalid Presentation Submission:
- Validation error. Path: 'presentation_submission.definition_id'. Reason: Required
- Validation error. Path: 'presentation_submission.descriptor_map'. Reason: Required
- Validation error. Path: 'presentation_submission.id'. Reason: Required`,
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"],
          ).toBe("application/json; charset=utf-8");

          vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce: randomUUID(),
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
                ? {
                    // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                    exp: Math.floor(Date.now() / 1000) + 100,
                    nbf: Math.floor(Date.now() / 1000) - 100,
                  }
                : {}),
            },
          );

          const invalidPresentationSubmission =
            createPresentationSubmission(TIR_WRITE_SCOPE);
          invalidPresentationSubmission.definition_id = "invalid_def_id";
          response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              new URLSearchParams({
                grant_type: "vp_token",
                presentation_submission: JSON.stringify(
                  invalidPresentationSubmission,
                ),
                scope,
                vp_token: vpJwt,
              } satisfies CreateAccessTokenDto).toString(),
            );

          expect(response.body).toStrictEqual({
            error: "invalid_request",
            error_description:
              "Invalid Presentation Submission: definition_id doesn't match the expected Presentation Definition ID for the requested scope",
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"],
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an error if the conditions specific to the scope are not met", async () => {
          let expectedErrorMessage: string;
          let vpSigner = credentialSubject;

          switch (customScope) {
            case DIDR_INVITE_SCOPE: {
              // Present a VC without VerifiableAccreditationToAccredit
              vcPayload.type = [
                "VerifiableCredential",
                "VerifiableAttestation",
              ];
              expectedErrorMessage =
                "Invalid Presentation Submission:\nFilterEvaluation tag: Input candidate failed filter evaluation: $.input_descriptors[0]: $.verifiableCredential[0];,MarkForSubmissionEvaluation tag: The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0];";
              break;
            }
            case DIDR_WRITE_SCOPE: {
              // VP Signer is not registered in the DIDR
              vpSigner = await createLegalEntity("ES256K");
              vpPayload.holder = vpSigner.did;

              mockServer.use(
                http.get(
                  escapeDid(
                    `${domain}/did-registry/v4/identifiers/${vpSigner.did}`,
                  ),
                  () => HttpResponse.text("Not found", { status: 404 }),
                ),
              );

              expectedErrorMessage = `Invalid Verifiable Presentation: Unable to resolve ${vpSigner.did}. Error: notFound. Not Found | Registry used: ${domain}/did-registry/v4/identifiers`;
              break;
            }
            case TIR_INVITE_SCOPE: {
              // Present a VC without any of VerifiableAuthorisationForTrustChain, VerifiableAccreditationToAttest or VerifiableAccreditationToAccredit
              vcPayload.type = [
                "VerifiableCredential",
                "VerifiableAttestation",
              ];
              expectedErrorMessage =
                "Invalid Presentation Submission:\nFilterEvaluation tag: Input candidate failed filter evaluation: $.input_descriptors[0]: $.verifiableCredential[0];,MarkForSubmissionEvaluation tag: The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0];";
              break;
            }
            case TIR_WRITE_SCOPE: {
              // VP Signer is not registered in the TIR
              vpSigner = await createLegalEntity("ES256K");
              vpPayload.holder = vpSigner.did;

              mockServer.use(
                http.get(
                  escapeDid(
                    `${domain}/did-registry/v4/identifiers/${vpSigner.did}`,
                  ),
                  () => HttpResponse.json(vpSigner.didDocument),
                ),
                http.get(
                  escapeDid(
                    `${domain}/trusted-issuers-registry/v4/issuers/${
                      vpSigner.did
                    }`,
                  ),
                  () => HttpResponse.text("Not found", { status: 404 }),
                ),
              );

              expectedErrorMessage = `Invalid Verifiable Presentation: DID ${vpSigner.did} is not registered in the Trusted Issuers Registry`;
              break;
            }
            default: {
              expectedErrorMessage = "";
            }
          }

          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              ebsiEnvConfig,
              {
                skipValidation: true,
              },
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const nonce = randomUUID();

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            vpSigner,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce,
              skipValidation: true,
              ...([
                DIDR_WRITE_SCOPE,
                TIR_INVITE_SCOPE,
                TIR_WRITE_SCOPE,
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
                presentation_submission: JSON.stringify(presentationSubmission),
                scope,
                vp_token: vpJwt,
              } satisfies CreateAccessTokenDto).toString(),
            );

          expect(response.body).toStrictEqual({
            error: "invalid_request",
            error_description: expectedErrorMessage,
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"],
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an access token and an ID token when the presentation is valid", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              ebsiEnvConfig,
              {
                skipValidation: true,
              },
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const nonce = randomUUID();

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              nonce,
              skipValidation: true,
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
                presentation_submission: JSON.stringify(presentationSubmission),
                scope,
                vp_token: vpJwt,
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
          const { access_token: accessToken } = response.body as TokenResponse;
          const decodedAccessToken = decodeJWT(accessToken);

          expect(decodedAccessToken.header).toStrictEqual({
            alg: "ES256",
            kid: expect.any(String),
            typ: "JWT",
          });

          expect(decodedAccessToken.payload).toStrictEqual({
            aud: `${domain}/authorisation/v3`,
            exp: expect.any(Number),
            iat: expect.any(Number),
            iss: `${domain}/authorisation/v3`,
            jti: expect.any(String),
            scp: scope,
            sub: credentialSubject.did,
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
            aud: credentialSubject.did,
            exp: expect.any(Number),
            iat: expect.any(Number),
            iss: `${domain}/authorisation/v3`,
            jti: expect.any(String),
            nonce,
            sub: credentialSubject.did,
          });

          await expect(jwtVerify(idToken, apiPublicKey)).resolves.not.toThrow();
        });
      });
    });

    // Bug fix: EBSIINT-5937
    // Fix Axios error handling (was returning "Unexpected error")
    it("Fix EBSIINT-5937", async () => {
      const customScope = TIR_INVITE_SCOPE;

      const scope: Scope = `openid ${customScope}`;

      const issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
      // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
      const expirationDate = new Date(
        issuanceDate.getTime() + 2 * 60 * 60 * 1000,
      );

      const vcPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        credentialSchema: {
          id:
            uriType === "EBSI URI"
              ? fromUrl(authorisationCredentialSchema, ebsiEnvConfig)
              : authorisationCredentialSchema,
          type: "FullJsonSchemaValidator2021",
        },
        credentialSubject: {
          id: credentialSubject.did,
          type: "same-device",
        },
        expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
        id: `urn:uuid:${randomUUID()}`,
        issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
        issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
        issuer: credentialIssuer.did,
        termsOfUse: {
          id:
            uriType === "EBSI URI"
              ? fromUrl(credentialIssuerAccreditationUrl, ebsiEnvConfig)
              : credentialIssuerAccreditationUrl,
          type: "IssuanceCertificate",
        },
        type: ["VerifiableCredential", "VerifiableAttestation"],
        validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
      } satisfies EbsiVerifiableAttestation;

      if (customScope === TIR_INVITE_SCOPE) {
        vcPayload.type.push("VerifiableAccreditationToAccredit");
      } else if (customScope === DIDR_INVITE_SCOPE) {
        vcPayload.type.push("VerifiableAuthorisationToOnboard");
      }

      const vpPayload = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        holder: credentialSubject.did,
        id: randomUUID(),
        type: ["VerifiablePresentation"],
        verifiableCredential: [] as string[],
      };

      // Reset to valid presentation submission before each test
      const presentationSubmission = createPresentationSubmission(customScope);

      // VP Signer is not registered in the TIR
      const vpSigner = await createLegalEntity("ES256K");
      vpPayload.holder = vpSigner.did;

      if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
        vcPayload.credentialSubject.id = vpPayload.holder;
        const vcJwt = await createVerifiableCredentialJwt(
          vcPayload,
          credentialIssuer,
          ebsiEnvConfig,
          {
            skipValidation: true,
          },
        );

        vpPayload.verifiableCredential.push(vcJwt);
      }

      mockServer.use(
        http.get(
          escapeDid(`${domain}/did-registry/v4/identifiers/${vpSigner.did}`),
          () => HttpResponse.json(vpSigner.didDocument),
        ),
        http.get(
          escapeDid(
            `${domain}/trusted-issuers-registry/v4/issuers/${vpSigner.did}`,
          ),
          () => HttpResponse.text("Not found", { status: 404 }),
        ),
      );

      const expectedErrorMessage = `Invalid Verifiable Presentation: DID ${vpSigner.did} is not registered in the Trusted Issuers Registry`;

      const nonce = randomUUID();

      const vpJwt = await createVerifiablePresentationJwt(
        vpPayload,
        vpSigner,
        serviceEndpoint,
        ebsiEnvConfig,
        {
          nonce,
          skipValidation: true,
          ...([DIDR_WRITE_SCOPE, TIR_INVITE_SCOPE, TIR_WRITE_SCOPE].includes(
            customScope,
          )
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
            presentation_submission: JSON.stringify(presentationSubmission),
            scope,
            vp_token: vpJwt,
          } satisfies CreateAccessTokenDto).toString(),
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description: expectedErrorMessage,
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"],
      ).toBe("application/json; charset=utf-8");
    });
  },
);
