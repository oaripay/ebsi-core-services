import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
  EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import type { PaginatedList } from "@ebsiint-api/shared";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { PresentationSubmission } from "@sphereon/pex-models";
import type { RawServerDefault } from "fastify";
import type { JWK } from "jose";

import { fromUrl } from "@cef-ebsi/ebsi-uri";
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
  vi,
} from "vitest";

import type { LegalEntity } from "../../../tests/utils/data.ts";
import type { ApiConfig } from "../../config/configuration.ts";
import type {
  Access,
  JsonWebKeySet,
  Scope,
  TokenResponse,
} from "./authorisation.interfaces.ts";

import { configureApp } from "../../../tests/utils/app.ts";
import {
  createDidDocument,
  createLegalEntity,
  createPresentationSubmission,
} from "../../../tests/utils/data.ts";
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
  TPR_WRITE_PRESENTATION_DEFINITION,
  TPR_WRITE_SCOPE,
  TSR_WRITE_PRESENTATION_DEFINITION,
  TSR_WRITE_SCOPE,
} from "./authorisation.constants.ts";
import { AuthorisationModule } from "./authorisation.module.ts";
import { CreateAccessTokenDto } from "./dto/index.ts";

vi.mock("did-jwt", async () => {
  const mod = await vi.importActual<typeof import("did-jwt")>("did-jwt");
  // Return a mocked version so we can redefine property `verifyJWT` later
  return {
    ...mod,
  };
});

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
    let configService: ConfigService<ApiConfig, true>;
    let domain: string;
    let serviceEndpoint: string;
    let credentialIssuer: LegalEntity<"EdDSA" | "ES256">;
    let credentialIssuerAccreditationUrl: string;
    let credentialSubject: LegalEntity<"EdDSA" | "ES256" | "ES256K">;
    let ebsiEnvConfig: EbsiEnvConfiguration;
    const mockServer = setupServer();

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

      configService =
        moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

      app = await configureApp(moduleFixture);

      await app.init();
      const fastifyInstance = app.getHttpAdapter().getInstance();
      await fastifyInstance.ready();

      server = app.getHttpServer();

      domain = configService.get("domain", { infer: true });
      const apiUrlPrefix = configService.get("apiUrlPrefix", { infer: true });
      serviceEndpoint = `${domain}${apiUrlPrefix}`;
      ebsiEnvConfig = configService.get("ebsiEnvConfig");

      credentialIssuer = await createLegalEntity(["ES256", "EdDSA"]);
      credentialIssuerAccreditationUrl = `${domain}/trusted-issuers-registry/v6/issuers/${
        credentialIssuer.did
      }/attributes/${randomBytes(16).toString("hex")}`;
      credentialSubject = await createLegalEntity(["ES256K", "ES256", "EdDSA"]);
    });

    beforeEach(async () => {
      mockServer.use(
        http.get(
          escapeDid(
            `${domain}/did-registry/v6/identifiers/${credentialIssuer.did}`,
          ),
          () => HttpResponse.json(credentialIssuer.didDocument),
        ),
        http.get(
          escapeDid(
            `${domain}/trusted-issuers-registry/v6/issuers/${credentialIssuer.did}`,
          ),
          () => HttpResponse.json({}),
        ),
      );

      // Issuer Self-Accreditation
      const authorisationCredentialSchema = configService.get(
        "testOidSchemaPattern",
        { infer: true },
      );
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
        {
          issuer: credentialIssuer.did,
          signer: credentialIssuer.keys.ES256.signer,
        },
        {
          alg: credentialIssuer.keys.ES256.alg,
          kid: credentialIssuer.keys.ES256.kid,
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
          grant_types_supported: ["vp_token"],
          id_token_signing_alg_values_supported: ["none"],
          id_token_types_supported: ["subject_signed_id_token"],
          issuer: expect.any(String),
          jwks_uri: `${serviceEndpoint}/jwks`,
          presentation_definition_endpoint: `${serviceEndpoint}/presentation-definitions`,
          response_types_supported: ["token"],
          scopes_supported: ["openid", ...CUSTOM_SCOPES],
          subject_syntax_types_supported: ["did:ebsi", "did:key"],
          subject_trust_frameworks_supported: ["ebsi"],
          subject_types_supported: ["public"],
          token_endpoint: `${serviceEndpoint}/token`,
          token_endpoint_auth_methods_supported: ["private_key_jwt"],
          vp_formats_supported: {
            jwt_vc: {
              alg_values_supported: ["ES256"],
            },
            jwt_vc_json: {
              alg_values_supported: ["ES256"],
            },
            jwt_vp: {
              alg_values_supported: ["ES256"],
            },
            jwt_vp_json: {
              alg_values_supported: ["ES256"],
            },
          },
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
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write', 'tpr_write', 'tsr_write')"]`,
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
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write', 'tpr_write', 'tsr_write')"]`,
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
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write', 'tpr_write', 'tsr_write')"]`,
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
          detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write', 'tpr_write', 'tsr_write')"]`,
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
        expect.assertions(20);

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

        expect(response.body).toStrictEqual(
          TNT_AUTHORISE_PRESENTATION_DEFINITION,
        );
        expect(response.status).toBe(200);

        // With explicit scope "openid tnt_create"
        response = await request(server).get(
          `/presentation-definitions?scope=${encodeURIComponent(
            `openid ${TNT_CREATE_SCOPE}`,
          )}`,
        );

        const tntCreatePresentationDefinition = structuredClone(
          TNT_CREATE_PRESENTATION_DEFINITION,
        );
        expect(response.body).toStrictEqual(tntCreatePresentationDefinition);
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

        // With explicit scope "openid tpr_write"
        response = await request(server).get(
          `/presentation-definitions?scope=${encodeURIComponent(
            `openid ${TPR_WRITE_SCOPE}`,
          )}`,
        );

        const tprWritePresentationDefinition = structuredClone(
          TPR_WRITE_PRESENTATION_DEFINITION,
        );
        expect(response.body).toStrictEqual(tprWritePresentationDefinition);
        expect(response.status).toBe(200);

        // With explicit scope "openid tsr_write"
        response = await request(server).get(
          `/presentation-definitions?scope=${encodeURIComponent(
            `openid ${TSR_WRITE_SCOPE}`,
          )}`,
        );

        const tsrWritePresentationDefinition = structuredClone(
          TSR_WRITE_PRESENTATION_DEFINITION,
        );
        expect(response.body).toStrictEqual(tsrWritePresentationDefinition);
        expect(response.status).toBe(200);
      });
    });

    describe.each([
      ["jwt_vp", "jwt_vc"],
      ["jwt_vp", "jwt_vc_json"],
      ["jwt_vp_json", "jwt_vc"],
      ["jwt_vp_json", "jwt_vc_json"],
    ] as const)(
      "POST /token (VP format: %s, VC format: %s)",
      (vpFormat, vcFormat) => {
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
              "scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write', 'timestamp_write', 'tnt_authorise', 'tnt_create', 'tnt_write', 'tpr_write', 'tsr_write')",
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

        it("should return a detailed error if VP JWT is invalid (missing 'verifiableCredential' property)", async () => {
          expect.assertions(2);

          const scope = "openid tnt_create";

          const vpPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            // 'verifiableCredential' is missing
            // verifiableCredential: [],
            holder: credentialSubject.did,
            id: randomUUID(),
            type: ["VerifiablePresentation"],
          };

          const presentationSubmission = createPresentationSubmission(
            TNT_CREATE_SCOPE,
            vpFormat,
            vcFormat,
          );

          // Manually create VP JWT
          // Create VP JWT manually
          const now = Math.floor(Date.now() / 1000);
          const vpJwt = await createJWT(
            {
              aud: serviceEndpoint,
              exp: now + 60, // 1 minute expiration
              iat: now,
              iss: credentialIssuer.did,
              nbf: now,
              nonce: randomUUID(),
              sub: credentialIssuer.did,
              vp: vpPayload,
            },
            {
              issuer: credentialIssuer.keys.ES256.did,
              signer: credentialIssuer.keys.ES256.signer,
            },
            {
              alg: credentialIssuer.keys.ES256.alg,
              kid: credentialIssuer.keys.ES256.kid,
              typ: "JWT",
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
            error_description:
              "Invalid Verifiable Presentation: Invalid EBSI Verifiable Presentation. The root value is missing the required field 'verifiableCredential'.",
          });

          expect(response.status).toBe(400);
        });

        describe.each(CUSTOM_SCOPES)(
          "with scope 'openid %s'",
          (customScope) => {
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

              const testOidSchemaUrl = configService.get(
                "testOidSchemaPattern",
                {
                  infer: true,
                },
              );
              vcPayload = {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                credentialSchema: {
                  id:
                    uriType === "EBSI URI"
                      ? fromUrl(testOidSchemaUrl, ebsiEnvConfig)
                      : testOidSchemaUrl,
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
              } else if (
                customScope === DIDR_INVITE_SCOPE ||
                customScope === TNT_AUTHORISE_SCOPE
              ) {
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
              presentationSubmission = createPresentationSubmission(
                customScope,
                vpFormat,
                vcFormat,
              );

              // If scope=didr_invite, the DID is not yet registered in the DIDR and TIR
              if (customScope === DIDR_INVITE_SCOPE) {
                mockServer.use(
                  http.get(
                    escapeDid(
                      `${domain}/did-registry/v6/identifiers/${credentialSubject.did}`,
                    ),
                    () => HttpResponse.text("Not found", { status: 404 }),
                  ),
                );
              } else {
                mockServer.use(
                  http.get(
                    escapeDid(
                      `${domain}/did-registry/v6/identifiers/${credentialSubject.did}`,
                    ),
                    () => HttpResponse.json(credentialSubject.didDocument),
                  ),
                );
              }

              if (customScope === TIR_INVITE_SCOPE) {
                mockServer.use(
                  http.get(
                    escapeDid(
                      `${domain}/trusted-issuers-registry/v6/issuers/${credentialSubject.did}`,
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
                mockServer.use(
                  http.get(
                    escapeDid(
                      `${domain}/trusted-issuers-registry/v6/issuers/${credentialSubject.did}`,
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

              if (customScope === TNT_AUTHORISE_SCOPE) {
                mockServer.use(
                  http.get(
                    `${domain}/trusted-policies-registry/v4/users/${credentialSubject.address}`,
                    () =>
                      HttpResponse.json({
                        attributes: ["TNT:authoriseDid"],
                        user: credentialSubject.address,
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

              it("should return an error when the audience is not the service", async () => {
                if (
                  [
                    DIDR_INVITE_SCOPE,
                    TIR_INVITE_SCOPE,
                    TNT_AUTHORISE_SCOPE,
                  ].includes(customScope)
                ) {
                  const vcJwt = await createVerifiableCredentialJwt(
                    vcPayload,
                    credentialIssuer.keys.ES256,
                    ebsiEnvConfig,
                    {
                      skipValidation: true,
                    },
                  );

                  vpPayload.verifiableCredential.push(vcJwt);
                }

                const now = Math.floor(Date.now() / 1000);
                const vpJwt = await createVerifiablePresentationJwt(
                  vpPayload,
                  credentialSubject.keys.ES256K,
                  "authentication-service-v3",
                  ebsiEnvConfig,
                  {
                    exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                    nbf: now,
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
                  error_description: `Invalid Verifiable Presentation: JWT "aud" property MUST match the expected audience "${domain}/authorisation/v5"`,
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
                    credentialIssuer.keys.ES256,
                    ebsiEnvConfig,
                    {
                      skipValidation: true,
                    },
                  );

                  vpPayload.verifiableCredential.push(vcJwt);
                }

                const now = Math.floor(Date.now() / 1000);
                const vpJwt = await createVerifiablePresentationJwt(
                  vpPayload,
                  credentialSubject.keys.ES256K,
                  serviceEndpoint,
                  ebsiEnvConfig,
                  {
                    exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                    nbf: now,
                    nonce: randomUUID(),
                    skipValidation: true,
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
                    kid: credentialIssuer.keys.ES256.kid,
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
                if (
                  [
                    DIDR_INVITE_SCOPE,
                    TIR_INVITE_SCOPE,
                    TNT_AUTHORISE_SCOPE,
                  ].includes(customScope)
                ) {
                  const vcJwt = await createVerifiableCredentialJwt(
                    vcPayload,
                    credentialIssuer.keys.ES256,
                    ebsiEnvConfig,
                    {
                      skipValidation: true,
                    },
                  );

                  vpPayload.verifiableCredential.push(vcJwt);
                }

                const vpJwt = await createVerifiablePresentationJwt(
                  vpPayload,
                  credentialSubject.keys.ES256K,
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
                  error_description: "The vp_token has expired.",
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
                    credentialIssuer.keys.ES256,
                    ebsiEnvConfig,
                    {
                      skipValidation: true,
                    },
                  );

                  vpPayload.verifiableCredential.push(vcJwt);
                }

                const now = Math.floor(Date.now() / 1000);
                const vpJwt = await createVerifiablePresentationJwt(
                  vpPayload,
                  credentialSubject.keys.ES256K,
                  serviceEndpoint,
                  ebsiEnvConfig,
                  {
                    // Override "exp" and "nbf"
                    exp: now + 120,
                    nbf: now + 100,
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
                if (
                  [
                    DIDR_INVITE_SCOPE,
                    TIR_INVITE_SCOPE,
                    TNT_AUTHORISE_SCOPE,
                  ].includes(customScope)
                ) {
                  const vcJwt = await createVerifiableCredentialJwt(
                    vcPayload,
                    credentialIssuer.keys.ES256,
                    ebsiEnvConfig,
                    {
                      skipValidation: true,
                    },
                  );

                  vpPayload.verifiableCredential.push(vcJwt);
                }

                const now = Math.floor(Date.now() / 1000);
                const vpJwt = await createVerifiablePresentationJwt(
                  vpPayload,
                  credentialSubject.keys.ES256K,
                  serviceEndpoint,
                  ebsiEnvConfig,
                  {
                    exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                    // We don't add any nonce
                    nbf: now,
                    skipValidation: true,
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
                if (
                  [
                    DIDR_INVITE_SCOPE,
                    TIR_INVITE_SCOPE,
                    TNT_AUTHORISE_PRESENTATION_DEFINITION,
                  ].includes(customScope)
                ) {
                  const vcJwt = await createVerifiableCredentialJwt(
                    vcPayload,
                    credentialIssuer.keys.ES256,
                    ebsiEnvConfig,
                    {
                      skipValidation: true,
                    },
                  );

                  vpPayload.verifiableCredential.push(vcJwt);
                }

                // Create VP JWT manually
                const now = Math.floor(Date.now() / 1000);
                const vpJwt = await createJWT(
                  {
                    aud: serviceEndpoint,
                    exp: now + 60, // 1 minute expiration
                    iat: now,
                    iss: credentialIssuer.did,
                    nbf: now,
                    nonce: randomUUID(),
                    sub: credentialIssuer.did,
                    vp: vpPayload,
                  },
                  {
                    issuer: credentialIssuer.keys.ES256.did,
                    signer: credentialIssuer.keys.ES256.signer,
                  },
                  {
                    alg: credentialIssuer.keys.ES256.alg,
                    kid: credentialIssuer.keys.ES256.kid,
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
                if (
                  [
                    DIDR_WRITE_SCOPE,
                    TIMESTAMP_WRITE_SCOPE,
                    TIR_WRITE_SCOPE,
                    TNT_CREATE_SCOPE,
                    TNT_WRITE_SCOPE,
                    TPR_WRITE_SCOPE,
                    TSR_WRITE_SCOPE,
                  ].includes(customScope)
                ) {
                  // Skip test
                  expect.assertions(0);
                  return;
                }

                const now = Math.floor(Date.now() / 1000);
                const vpJwt = await createVerifiablePresentationJwt(
                  vpPayload,
                  credentialSubject.keys.ES256K,
                  serviceEndpoint,
                  ebsiEnvConfig,
                  {
                    exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                    nbf: now,
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
              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  credentialIssuer.keys.ES256,
                  ebsiEnvConfig,
                  {
                    skipValidation: true,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
                  skipValidation: true,
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
                    format: vpFormat,
                    id: "same-device-in-time-credential",
                    path: "$",
                    path_nested: {
                      format: vcFormat,
                      id: randomUUID(),
                      path: "$vp.verifiableCredential[0]", // wrong path
                    },
                  },
                ],
                id: randomUUID(),
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
                  credentialIssuer.keys.ES256,
                  ebsiEnvConfig,
                  {
                    skipValidation: true,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
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
                error_description:
                  "presentation_submission must be a json string",
              });
              expect(response.status).toBe(400);
            });

            it("should return an error if the presentation submission is invalid (including error details)", async () => {
              presentationSubmission = {
                definition_id: "openid_presentation",
                descriptor_map: [
                  {
                    format: vpFormat,
                    id: "same-device-in-time-credential",
                    path: "$",
                    path_nested: {
                      format: vcFormat,
                      id: randomUUID(),
                      path: "$vp.verifiableCredential[0]", // wrong path
                    },
                  },
                ],
                id: randomUUID(),
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
                  credentialIssuer.keys.ES256,
                  ebsiEnvConfig,
                  {
                    skipValidation: true,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const now = Math.floor(Date.now() / 1000);
              let vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
                },
              );

              let response = await request(server)
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
                    format: vpFormat,
                    id: "same-device-in-time-credential",
                    path: "$",
                    path_nested: {
                      format: vcFormat,
                      id: randomUUID(),
                      path: "$.vp.verifiableCredential[1]", // no credential at this index
                    },
                  },
                ],
                id: randomUUID(),
              };

              vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
                },
              );

              response = await request(server)
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
                    format: vpFormat,
                    id: "same-device-in-time-credential",
                    path: "$.vp", // wrong path
                    path_nested: {
                      format: vcFormat,
                      id: randomUUID(),
                      path: "$.vc.verifiableCredential[0]", // wrong path
                    },
                  },
                ],
                id: randomUUID(),
              };

              vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
                },
              );

              response = await request(server)
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
                error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels`,
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");

              vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
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
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
                },
              );

              const invalidPresentationSubmission =
                createPresentationSubmission(
                  TIR_WRITE_SCOPE,
                  vpFormat,
                  vcFormat,
                );
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

              vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                credentialSubject.keys.ES256K,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 600, // Expire in 10 minutes (more than the 5 minutes limit)
                  nbf: now,
                  nonce: randomUUID(),
                  skipValidation: true,
                },
              );

              response = await request(server)
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
                  "The vp_token must not have an expiration time of more than 5 minutes in the future.",
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error if the conditions specific to the scope are not met", async () => {
              let expectedErrorMessage: string;
              let vpSigner: EbsiIssuer = credentialSubject.keys.ES256;

              switch (customScope) {
                case DIDR_INVITE_SCOPE: {
                  vpSigner = credentialSubject.keys.ES256K;

                  // Present a VC without VerifiableAuthorisationToOnboard
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
                  const legalEntity = await createLegalEntity(["ES256K"]);
                  vpSigner = legalEntity.keys.ES256K;
                  vpPayload.holder = vpSigner.did;

                  mockServer.use(
                    http.get(
                      escapeDid(
                        `${domain}/did-registry/v6/identifiers/${vpSigner.did}`,
                      ),
                      () => HttpResponse.text("Not found", { status: 404 }),
                    ),
                  );

                  expectedErrorMessage = `Invalid Verifiable Presentation: Unable to resolve ${vpSigner.did}. Error: notFound. Not Found | Registry used: ${domain}/did-registry/v6/identifiers`;
                  break;
                }
                case TIMESTAMP_WRITE_SCOPE:
                case TPR_WRITE_SCOPE:
                case TSR_WRITE_SCOPE: {
                  // VP Signer is not registered in the DIDR
                  const legalEntity = await createLegalEntity(["ES256"]);
                  vpSigner = legalEntity.keys.ES256;
                  vpPayload.holder = vpSigner.did;

                  mockServer.use(
                    http.get(
                      escapeDid(
                        `${domain}/did-registry/v6/identifiers/${vpSigner.did}`,
                      ),
                      () => HttpResponse.text("Not found", { status: 404 }),
                    ),
                  );

                  expectedErrorMessage = `Invalid Verifiable Presentation: Unable to resolve ${vpSigner.did}. Error: notFound. Not Found | Registry used: ${domain}/did-registry/v6/identifiers`;
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
                  const legalEntity = await createLegalEntity(["ES256"]);
                  vpSigner = legalEntity.keys.ES256;
                  vpPayload.holder = vpSigner.did;

                  mockServer.use(
                    http.get(
                      escapeDid(
                        `${domain}/did-registry/v6/identifiers/${vpSigner.did}`,
                      ),
                      () => HttpResponse.json(legalEntity.didDocument),
                    ),
                    http.get(
                      escapeDid(
                        `${domain}/trusted-issuers-registry/v6/issuers/${vpSigner.did}`,
                      ),
                      () => HttpResponse.text("Not found", { status: 404 }),
                    ),
                  );

                  expectedErrorMessage = `Invalid Verifiable Presentation: DID ${vpSigner.did} is not registered in the Trusted Issuers Registry`;
                  break;
                }
                case TNT_AUTHORISE_SCOPE: {
                  // Present a VC without VerifiableAuthorisationToOnboard
                  vcPayload.type = [
                    "VerifiableCredential",
                    "VerifiableAttestation",
                  ];

                  expectedErrorMessage = [
                    "Invalid Presentation Submission:",
                    "FilterEvaluation tag: Input candidate failed filter evaluation: $.input_descriptors[0]: $.verifiableCredential[0];,MarkForSubmissionEvaluation tag: The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0];",
                  ].join("\n");
                  break;
                }
                case TNT_CREATE_SCOPE: {
                  mockServer.use(
                    http.head(
                      `${domain}/track-and-trace/v2/accesses`,
                      ({ request: req }) => {
                        const creator = new URL(req.url).searchParams.get(
                          "creator",
                        );

                        if (creator === vpSigner.did) {
                          return new HttpResponse(undefined, { status: 404 });
                        }

                        throw new Error(
                          `Unexpected TnT Document creator: ${creator}`,
                        );
                      },
                    ),
                  );

                  expectedErrorMessage = `Invalid Verifiable Presentation: DID ${vpSigner.did} is not allowlisted as a TnT Document creator`;
                  break;
                }
                case TNT_WRITE_SCOPE: {
                  mockServer.use(
                    http.get(
                      `${domain}/track-and-trace/v2/accesses`,
                      ({ request: req }) => {
                        const subject = new URL(req.url).searchParams.get(
                          "subject",
                        );

                        if (subject === vpSigner.did) {
                          return HttpResponse.json(
                            {
                              items: [],
                              links: {
                                first: "",
                                last: "",
                                next: "",
                                prev: "",
                              },
                              self: "",
                              total: 0,
                            } satisfies PaginatedList<Access>,
                            { status: 200 },
                          );
                        }

                        throw new Error(`Unexpected TnT subject: ${subject}`);
                      },
                    ),
                  );

                  expectedErrorMessage = `Invalid Verifiable Presentation: DID ${vpSigner.did} doesn't have write or delegate permission in TnT`;
                  break;
                }
                default: {
                  expectedErrorMessage = "";
                }
              }

              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  credentialIssuer.keys.ES256,
                  ebsiEnvConfig,
                  {
                    skipValidation: true,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                error_description: expectedErrorMessage,
              });
              expect(response.status).toBe(400);
              expect(
                (response.headers as Record<string, unknown>)["content-type"],
              ).toBe("application/json; charset=utf-8");
            });

            it("should return an error when the VP JWT is not signed with the expected algorithm (validateCredentialsAlgos)", async () => {
              const vpSigner = credentialSubject.keys.EdDSA; // No presentation definition supports EdDSA

              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  credentialIssuer.keys.ES256,
                  ebsiEnvConfig,
                  {
                    skipValidation: true,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              if (customScope === TNT_CREATE_SCOPE) {
                mockServer.use(
                  http.head(
                    `${domain}/track-and-trace/v2/accesses`,
                    ({ request: req }) => {
                      const creator = new URL(req.url).searchParams.get(
                        "creator",
                      );

                      if (creator === vpPayload.holder) {
                        return new HttpResponse(undefined, { status: 204 });
                      }

                      throw new Error(
                        `Unexpected TnT Document creator: ${creator}`,
                      );
                    },
                  ),
                );
              }

              if (customScope === TNT_WRITE_SCOPE) {
                mockServer.use(
                  http.get(
                    `${domain}/track-and-trace/v2/accesses`,
                    ({ request: req }) => {
                      const subject = new URL(req.url).searchParams.get(
                        "subject",
                      );

                      if (subject === vpPayload.holder) {
                        return HttpResponse.json(
                          {
                            items: [
                              {
                                documentId: "0x00",
                                grantedBy: "did:ebsi:1234",
                                permission: "write",
                                subject,
                              },
                            ],
                            links: { first: "", last: "", next: "", prev: "" },
                            self: "",
                            total: 1,
                          } satisfies PaginatedList<Access>,
                          { status: 200 },
                        );
                      }

                      throw new Error(`Unexpected TnT subject: ${subject}`);
                    },
                  ),
                );
              }

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Presentation: the algorithm 'EdDSA' is not supported",
              });

              expect(response.status).toBe(400);
            });

            it("should return an error when descriptor_map[0].path is invalid (validateCredentialsAlgos)", async () => {
              if (
                [
                  DIDR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                  TPR_WRITE_SCOPE,
                  TSR_WRITE_SCOPE,
                ].includes(customScope)
              ) {
                expect.assertions(0);
                return;
              }

              presentationSubmission.descriptor_map[0]!.path = "$[0]"; // should be "$"

              const vpSigner =
                customScope === DIDR_INVITE_SCOPE
                  ? credentialSubject.keys.ES256K
                  : credentialSubject.keys.ES256;

              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer.keys.ES256,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Presentation submission: descriptor root path must be '$'",
              });

              expect(response.status).toBe(400);
            });

            it("should return an error when descriptor_map[0].format is invalid (validateCredentialsAlgos)", async () => {
              if (
                [
                  DIDR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                  TPR_WRITE_SCOPE,
                  TSR_WRITE_SCOPE,
                ].includes(customScope)
              ) {
                expect.assertions(0);
                return;
              }

              presentationSubmission.descriptor_map[0]!.format = "jwt"; // should be "jwt_vp" or "jwt_vp_json"

              const vpSigner =
                customScope === DIDR_INVITE_SCOPE
                  ? credentialSubject.keys.ES256K
                  : credentialSubject.keys.ES256;

              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer.keys.ES256,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Presentation submission: format 'jwt' is not supported in 'descriptor_map[0].format'",
              });

              expect(response.status).toBe(400);
            });

            it("should return an error when the credentials are signed with an unsupported algorithm (validateCredentialsAlgos)", async () => {
              if (
                [
                  DIDR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                  TPR_WRITE_SCOPE,
                  TSR_WRITE_SCOPE,
                ].includes(customScope)
              ) {
                expect.assertions(0);
                return;
              }

              const vpSigner =
                customScope === DIDR_INVITE_SCOPE
                  ? credentialSubject.keys.ES256K
                  : credentialSubject.keys.ES256;

              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer.keys.EdDSA,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Credential: the algorithm 'EdDSA' is not supported",
              });

              expect(response.status).toBe(400);
            });

            it("should return an error when descriptor_map[0].path_nested.format is invalid (validateCredentialsAlgos)", async () => {
              if (
                [
                  DIDR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                  TPR_WRITE_SCOPE,
                  TSR_WRITE_SCOPE,
                ].includes(customScope)
              ) {
                expect.assertions(0);
                return;
              }

              presentationSubmission.descriptor_map[0]!.path_nested!.format =
                "jwt"; // should be "jwt_vc" or "jwt_vc_json"

              const vpSigner =
                customScope === DIDR_INVITE_SCOPE
                  ? credentialSubject.keys.ES256K
                  : credentialSubject.keys.ES256;

              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer.keys.ES256,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Presentation submission: format 'jwt' is not supported in 'descriptor_map[0].path_nested.format'",
              });

              expect(response.status).toBe(400);
            });

            it("should return an error when descriptor_map[0].path_nested.path is invalid (validateCredentialsAlgos)", async () => {
              if (
                [
                  DIDR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                  TPR_WRITE_SCOPE,
                  TSR_WRITE_SCOPE,
                ].includes(customScope)
              ) {
                expect.assertions(0);
                return;
              }

              presentationSubmission.descriptor_map[0]!.path_nested!.path =
                "$.vp.verifiableCredential"; // Doesn't pass the regex /^\$\.vp\.verifiableCredential\[(\d*)\]/

              const vpSigner =
                customScope === DIDR_INVITE_SCOPE
                  ? credentialSubject.keys.ES256K
                  : credentialSubject.keys.ES256;

              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer.keys.ES256,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Presentation submission: path_nested.path '$.vp.verifiableCredential' is not valid",
              });

              expect(response.status).toBe(400);
            });

            it("should return an error when descriptor_map[0].path_nested.path doesn't match any credential (validateCredentialsAlgos)", async () => {
              if (
                [
                  DIDR_WRITE_SCOPE,
                  TIMESTAMP_WRITE_SCOPE,
                  TIR_WRITE_SCOPE,
                  TNT_CREATE_SCOPE,
                  TNT_WRITE_SCOPE,
                  TPR_WRITE_SCOPE,
                  TSR_WRITE_SCOPE,
                ].includes(customScope)
              ) {
                expect.assertions(0);
                return;
              }

              presentationSubmission.descriptor_map[0]!.path_nested!.path =
                "$.vp.verifiableCredential[1]"; // Doesn't match any credential

              const vpSigner =
                customScope === DIDR_INVITE_SCOPE
                  ? credentialSubject.keys.ES256K
                  : credentialSubject.keys.ES256;

              const vcJwt = await createVerifiableCredentialJwt(
                vcPayload,
                credentialIssuer.keys.ES256,
                ebsiEnvConfig,
                {
                  skipValidation: true,
                },
              );

              vpPayload.verifiableCredential.push(vcJwt);

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                  "Invalid Verifiable Presentation submission: $.vp.verifiableCredential[1] not found",
              });

              expect(response.status).toBe(400);
            });

            it("should return an access token and an ID token when the presentation is valid", async () => {
              const vpSigner = [DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE].includes(
                customScope,
              )
                ? credentialSubject.keys.ES256K
                : credentialSubject.keys.ES256;

              if (
                [
                  DIDR_INVITE_SCOPE,
                  TIR_INVITE_SCOPE,
                  TNT_AUTHORISE_SCOPE,
                ].includes(customScope)
              ) {
                const vcJwt = await createVerifiableCredentialJwt(
                  vcPayload,
                  credentialIssuer.keys.ES256,
                  ebsiEnvConfig,
                  {
                    skipValidation: true,
                  },
                );

                vpPayload.verifiableCredential.push(vcJwt);
              }

              if (customScope === TNT_CREATE_SCOPE) {
                mockServer.use(
                  http.head(
                    `${domain}/track-and-trace/v2/accesses`,
                    ({ request: req }) => {
                      const creator = new URL(req.url).searchParams.get(
                        "creator",
                      );

                      if (creator === vpPayload.holder) {
                        return new HttpResponse(undefined, { status: 204 });
                      }

                      throw new Error(
                        `Unexpected TnT Document creator: ${creator}`,
                      );
                    },
                  ),
                );
              }

              if (customScope === TNT_WRITE_SCOPE) {
                mockServer.use(
                  http.get(
                    `${domain}/track-and-trace/v2/accesses`,
                    ({ request: req }) => {
                      const subject = new URL(req.url).searchParams.get(
                        "subject",
                      );

                      if (subject === vpPayload.holder) {
                        return HttpResponse.json(
                          {
                            items: [
                              {
                                documentId: "0x00",
                                grantedBy: "did:ebsi:1234",
                                permission: "write",
                                subject,
                              },
                            ],
                            links: { first: "", last: "", next: "", prev: "" },
                            self: "",
                            total: 1,
                          } satisfies PaginatedList<Access>,
                          { status: 200 },
                        );
                      }

                      throw new Error(`Unexpected TnT subject: ${subject}`);
                    },
                  ),
                );
              }

              const nonce = randomUUID();
              const now = Math.floor(Date.now() / 1000);

              const vpJwt = await createVerifiablePresentationJwt(
                vpPayload,
                vpSigner,
                serviceEndpoint,
                ebsiEnvConfig,
                {
                  exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
                  nbf: now,
                  nonce,
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
                aud: `${domain}/authorisation/v5`,
                exp: expect.any(Number),
                iat: expect.any(Number),
                iss: `${domain}/authorisation/v5`,
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
                iss: `${domain}/authorisation/v5`,
                jti: expect.any(String),
                nonce,
                sub: credentialSubject.did,
              });

              await expect(
                jwtVerify(idToken, apiPublicKey),
              ).resolves.not.toThrow();
            });
          },
        );

        it("with scope 'openid tnt_authorise' should return an error if the verification method is not in 'capabilityInvocation'", async () => {
          expect.assertions(2);

          const scope = "openid tnt_authorise";
          const issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
          // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
          const expirationDate = new Date(
            issuanceDate.getTime() + 2 * 60 * 60 * 1000,
          );
          const testOidSchemaUrl = configService.get("testOidSchemaPattern", {
            infer: true,
          });
          const vcPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            credentialSchema: {
              id:
                uriType === "EBSI URI"
                  ? fromUrl(testOidSchemaUrl, ebsiEnvConfig)
                  : testOidSchemaUrl,
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
            type: [
              "VerifiableCredential",
              "VerifiableAttestation",
              "VerifiableAuthorisationToOnboard",
            ],
            validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          } satisfies EbsiVerifiableAttestation;

          const vcJwt = await createVerifiableCredentialJwt(
            vcPayload,
            credentialIssuer.keys.ES256,
            ebsiEnvConfig,
            {
              skipValidation: true,
            },
          );

          const vpPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            holder: credentialSubject.did,
            id: randomUUID(),
            type: ["VerifiablePresentation"],
            verifiableCredential: [vcJwt],
          } satisfies EbsiVerifiablePresentation;

          // Reset to valid presentation submission before each test
          const presentationSubmission = createPresentationSubmission(
            TNT_AUTHORISE_SCOPE,
            vpFormat,
            vcFormat,
          );

          const didDocument = createDidDocument(
            credentialSubject.did,
            credentialSubject.keys,
          );

          // Remove capabilityInvocation, which is required in order to get an access token with tnt_authorise scope
          didDocument.capabilityInvocation = [];

          mockServer.use(
            http.get(
              escapeDid(
                `${domain}/did-registry/v6/identifiers/${credentialSubject.did}`,
              ),
              () => HttpResponse.json(didDocument),
            ),
          );

          const nonce = randomUUID();
          const now = Math.floor(Date.now() / 1000);

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject.keys.ES256K,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
              nbf: now,
              nonce,
              skipValidation: true,
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
            error_description: `Invalid Verifiable Presentation: Could not find a verification method related to "${credentialSubject.keys.ES256K.kid}" for the proof purpose "capabilityInvocation" and algorithm "ES256K"`,
          });

          expect(response.status).toBe(400);

          mockServer.resetHandlers();
        });

        it("with scope 'openid tnt_authorise' should return an error if the user is not registered in the Trusted Policies Registry", async () => {
          expect.assertions(6);

          const scope = "openid tnt_authorise";
          const issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
          // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
          const expirationDate = new Date(
            issuanceDate.getTime() + 2 * 60 * 60 * 1000,
          );
          const testOidSchemaUrl = configService.get("testOidSchemaPattern", {
            infer: true,
          });
          const vcPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            credentialSchema: {
              id:
                uriType === "EBSI URI"
                  ? fromUrl(testOidSchemaUrl, ebsiEnvConfig)
                  : testOidSchemaUrl,
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
            type: [
              "VerifiableCredential",
              "VerifiableAttestation",
              "VerifiableAuthorisationToOnboard",
            ],
            validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          } satisfies EbsiVerifiableAttestation;

          const vcJwt = await createVerifiableCredentialJwt(
            vcPayload,
            credentialIssuer.keys.ES256,
            ebsiEnvConfig,
            {
              skipValidation: true,
            },
          );

          const vpPayload = {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            holder: credentialSubject.did,
            id: randomUUID(),
            type: ["VerifiablePresentation"],
            verifiableCredential: [vcJwt],
          } satisfies EbsiVerifiablePresentation;

          // Reset to valid presentation submission before each test
          const presentationSubmission = createPresentationSubmission(
            TNT_AUTHORISE_SCOPE,
            vpFormat,
            vcFormat,
          );

          const didDocument = createDidDocument(
            credentialSubject.did,
            credentialSubject.keys,
          );

          mockServer.use(
            http.get(
              escapeDid(
                `${domain}/did-registry/v6/identifiers/${credentialSubject.did}`,
              ),
              () => HttpResponse.json(didDocument),
            ),
            // Network error with TPR
            http.get(
              `${domain}/trusted-policies-registry/v4/users/${credentialSubject.address}`,
              () => HttpResponse.error(),
            ),
          );

          let nonce = randomUUID();

          const now = Math.floor(Date.now() / 1000);
          let vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject.keys.ES256K,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
              nbf: now,
              nonce,
              skipValidation: true,
            },
          );

          // Connection error with TPR - there is no TPR mock
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
            error_description: `Invalid Verifiable Presentation: DID ${credentialSubject.did} is not authorised for ${TNT_AUTHORISE_SCOPE} access. Errors: Error from Trusted Policies Registry: Network error`,
          });

          expect(response.status).toBe(400);

          nonce = randomUUID();

          vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject.keys.ES256K,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
              nbf: now,
              nonce,
              skipValidation: true,
            },
          );

          // The user is not registered in TPR
          mockServer.use(
            http.get(
              `${domain}/trusted-policies-registry/v4/users/${credentialSubject.address}`,
              () => HttpResponse.text("Not found", { status: 404 }),
            ),
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
            error_description: `Invalid Verifiable Presentation: DID ${credentialSubject.did} is not authorised for ${TNT_AUTHORISE_SCOPE} access. Errors: address ${credentialSubject.address} not in Trusted Policies Registry`,
          });

          expect(response.status).toBe(400);

          nonce = randomUUID();

          vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject.keys.ES256K,
            serviceEndpoint,
            ebsiEnvConfig,
            {
              exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
              nbf: now,
              nonce,
              skipValidation: true,
            },
          );

          // User registered in TPR but without the correct attribute
          mockServer.use(
            http.get(
              `${domain}/trusted-policies-registry/v4/users/${credentialSubject.address}`,
              () =>
                HttpResponse.json({
                  attributes: ["not TNT attribute"],
                  user: credentialSubject.address,
                }),
            ),
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
            error_description: `Invalid Verifiable Presentation: DID ${credentialSubject.did} is not authorised for ${TNT_AUTHORISE_SCOPE} access. Errors: address ${credentialSubject.address} doesn't have the attribute TNT:authoriseDid in Trusted Policies Registry`,
          });

          expect(response.status).toBe(400);

          mockServer.resetHandlers();
        });
      },
    );

    // Bug fix: EBSIINT-5937
    // Fix Axios error handling (was returning "Unexpected error")
    it.each([
      ["jwt_vp", "jwt_vc"],
      ["jwt_vp", "jwt_vc_json"],
      ["jwt_vp_json", "jwt_vc"],
      ["jwt_vp_json", "jwt_vc_json"],
    ] as const)(
      "Fix EBSIINT-5937 (VP format: %s, VC format: %s)",
      async (vpFormat, vcFormat) => {
        const customScope = TIR_INVITE_SCOPE;

        const scope: Scope = `openid ${customScope}`;

        const issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
        // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
        const expirationDate = new Date(
          issuanceDate.getTime() + 2 * 60 * 60 * 1000,
        );
        const testOidSchemaUrl = configService.get("testOidSchemaPattern", {
          infer: true,
        });
        const vcPayload = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          credentialSchema: {
            id:
              uriType === "EBSI URI"
                ? fromUrl(testOidSchemaUrl, ebsiEnvConfig)
                : testOidSchemaUrl,
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
        } else if (
          customScope === DIDR_INVITE_SCOPE ||
          customScope === TNT_AUTHORISE_SCOPE
        ) {
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
        const presentationSubmission = createPresentationSubmission(
          customScope,
          vpFormat,
          vcFormat,
        );

        // VP Signer is not registered in the TIR
        const vpSigner = [DIDR_INVITE_SCOPE, DIDR_WRITE_SCOPE].includes(
          customScope,
        )
          ? await createLegalEntity(["ES256K"])
          : await createLegalEntity(["ES256"]);
        vpPayload.holder = vpSigner.did;

        if (
          [DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE, TNT_AUTHORISE_SCOPE].includes(
            customScope,
          )
        ) {
          vcPayload.credentialSubject.id = vpPayload.holder;
          const vcJwt = await createVerifiableCredentialJwt(
            vcPayload,
            credentialIssuer.keys.ES256,
            ebsiEnvConfig,
            {
              skipValidation: true,
            },
          );

          vpPayload.verifiableCredential.push(vcJwt);
        }

        mockServer.use(
          http.get(
            escapeDid(`${domain}/did-registry/v6/identifiers/${vpSigner.did}`),
            () => HttpResponse.json(vpSigner.didDocument),
          ),
          http.get(
            escapeDid(
              `${domain}/trusted-issuers-registry/v6/issuers/${vpSigner.did}`,
            ),
            () => HttpResponse.text("Not found", { status: 404 }),
          ),
        );

        const expectedErrorMessage = `Invalid Verifiable Presentation: DID ${vpSigner.did} is not registered in the Trusted Issuers Registry`;

        const nonce = randomUUID();
        const now = Math.floor(Date.now() / 1000);

        const vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          "ES256K" in vpSigner.keys
            ? vpSigner.keys.ES256K
            : vpSigner.keys.ES256,
          serviceEndpoint,
          ebsiEnvConfig,
          {
            exp: now + 60, // Expire in 60 seconds (less than the 5 minutes limit)
            nbf: now,
            nonce,
            skipValidation: true,
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
      },
    );
  },
);
