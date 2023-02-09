import {
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { randomUUID, randomBytes } from "node:crypto";
import request from "supertest";
import nock from "nock";
import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import type { INestApplication, HttpServer } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import type { PresentationSubmission } from "@sphereon/pex-models";
import { decodeJWT, createJWT, ES256KSigner } from "did-jwt";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  EbsiVerifiableAttestation,
  createVerifiableCredentialJwt,
} from "@cef-ebsi/verifiable-credential";
import { createVerifiablePresentationJwt } from "@cef-ebsi/verifiable-presentation";
import type { EbsiVerifiablePresentation } from "@cef-ebsi/verifiable-presentation";
import { calculateJwkThumbprint, importJWK, SignJWT, jwtVerify } from "jose";
import type { JWK } from "jose";
import qs from "qs";
import { AuthorisationModule } from "./authorisation.module";
import type { JsonWebKeySet, TokenResponse } from "./authorisation.interfaces";
import type { ApiConfig } from "../../config/configuration";
import {
  CUSTOM_SCOPES,
  DID_WRITE_PRESENTATION_DEFINITION,
  GENERIC_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_PRESENTATION_DEFINITION,
} from "./authorisation.constants";
import {
  createLegalEntity,
  createPresentationSubmission,
  LegalEntity,
} from "../../../tests/utils/data";
import {
  DID_DOCUMENT_CONTEXT,
  JWS_2020_CONTEXT,
} from "../../../tests/utils/contexts";
import { configureApp } from "../../../tests/utils/app";

describe("Authorisation Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig, true>;

  let serviceEndpoint: string;
  let issuer: LegalEntity;

  beforeAll(async () => {
    // Disable external requests
    nock.disableNetConnect();
    // Allow localhost connections so we can test local routes and mock servers.
    nock.enableNetConnect("127.0.0.1");

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthorisationModule],
    }).compile();

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app = await configureApp(moduleFixture, configService);

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = app.getHttpServer() as HttpServer;

    const domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    serviceEndpoint = `${domain}${apiUrlPrefix}`;

    const alg = "ES256K";
    issuer = await createLegalEntity(alg);
  });

  beforeEach(() => {
    nock("https://api-test.ebsi.eu")
      .get(`/did-registry/v4/identifiers/${issuer.did}`)
      .reply(200, issuer.didDocument)
      .persist();

    nock("https://api-test.ebsi.eu")
      .get(`/trusted-issuers-registry/v3/issuers/${issuer.did}`)
      .reply(200, {})
      .persist();

    nock("https://www.w3.org")
      .get("/ns/did/v1")
      .reply(200, DID_DOCUMENT_CONTEXT)
      .persist();

    nock("https://w3id.org")
      .get("/security/suites/jws-2020/v1")
      .reply(200, JWS_2020_CONTEXT)
      .persist();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    nock.enableNetConnect();

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
        issuer: expect.any(String),
        authorization_endpoint: `${serviceEndpoint}/authorize`,
        token_endpoint: `${serviceEndpoint}/token`,
        pushed_authorization_request_endpoint: `${serviceEndpoint}/par`,
        presentation_definition_endpoint: `${serviceEndpoint}/presentation-definitions`,
        jwks_uri: `${serviceEndpoint}/jwks`,
        scopes_supported: expect.arrayContaining(["openid"]),
        response_types_supported: expect.arrayContaining(["code"]),
        subject_types_supported: expect.arrayContaining(["public"]),
        id_token_signing_alg_values_supported: expect.arrayContaining(["none"]),
        subject_syntax_types_supported: expect.arrayContaining([
          "did:ebsi",
          "did:key",
        ]),
      });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /jwks", () => {
    it("should return the OP's JWKS", async () => {
      expect.assertions(3);

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

      expect(response.status).toBe(200);

      const jwk = (response.body as { keys: JWK[] }).keys[0];
      const thumbprint = await calculateJwkThumbprint(jwk);

      expect(jwk.kid).toBe(thumbprint);
    });
  });

  describe("GET /presentation-definitions", () => {
    it("should return an error if the scope is invalid", async () => {
      expect.assertions(8);

      // Without explicit scope
      let response = await request(server).get("/presentation-definitions");

      expect(response.body).toStrictEqual({
        detail: '["scope should not be null or undefined"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // With an invalid scope
      response = await request(server).get(
        "/presentation-definitions?scope=test"
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('did_write', 'tir_write', 'generic_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Doesn't contain "openid"
      response = await request(server).get(
        "/presentation-definitions?scope=did_write tir_write"
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('did_write', 'tir_write', 'generic_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      // Includes only "openid"
      response = await request(server).get(
        "/presentation-definitions?scope=openid"
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('did_write', 'tir_write', 'generic_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return the expected presentation definition for the given scope", async () => {
      expect.assertions(6);

      // 1. With explicit scope "openid did_write"
      let response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          "openid did_write"
        )}`
      );

      expect(response.body).toStrictEqual(DID_WRITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // 2. With explicit scope "openid tir_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          "openid tir_write"
        )}`
      );

      expect(response.body).toStrictEqual(TIR_WRITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // 3. With explicit scope "openid generic_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          "openid generic_write"
        )}`
      );

      expect(response.body).toStrictEqual(
        GENERIC_WRITE_PRESENTATION_DEFINITION
      );
      expect(response.status).toBe(200);
    });
  });

  describe("POST /token", () => {
    it("should return an error if the grant_type is invalid", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          qs.stringify({
            grant_type: "test",
          })
        );

      expect(response.body).toStrictEqual({
        detail: expect.stringMatching("grant_type must be equal to vp_token"),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an error if the scope is invalid", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          qs.stringify({
            scope: "test",
          })
        );

      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          "scope must be a combination of 'openid' and one of the supported scopes ('did_write', 'tir_write', 'generic_write')"
        ),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an error if the vp_token is invalid", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          qs.stringify({
            vp_token: "test",
          })
        );

      expect(response.body).toStrictEqual({
        detail: expect.stringMatching("vp_token must be a jwt string"),
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    describe.each(CUSTOM_SCOPES)("with scope 'openid %s'", (customScope) => {
      const scope = `openid ${customScope}`;
      let vcPayload: EbsiVerifiableAttestation;
      let vpPayload: EbsiVerifiablePresentation;
      let presentationSubmission: PresentationSubmission;
      let issuanceDate: Date;
      let expirationDate: Date;

      beforeAll(() => {
        issuanceDate = new Date();
        // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
        expirationDate = new Date(issuanceDate.getTime() + 2 * 60 * 60 * 1000);

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
          credentialSubject: { id: issuer.did, type: "same-device" },
          credentialSchema: {
            id: configService.get<string>("testOidSchemaPattern"),
            type: "FullJsonSchemaValidator2021",
          },
        };

        if (customScope === "tir_write") {
          vcPayload.type.push("VerifiableAccreditationToAccredit");
        } else if (customScope === "did_write") {
          vcPayload.type.push("VerifiableAuthorisationToOnboard");
        }

        vpPayload = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [],
          holder: issuer.did,
        };
      });

      beforeEach(() => {
        // Reset to valid presentation submission before each test
        presentationSubmission = createPresentationSubmission(customScope);
        // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
        vpPayload.verifiableCredential = [];
        vpPayload.id = randomUUID(); // VP ID is used as JWT JTI.
      });

      describe("vp_token validation", () => {
        beforeEach(() => {
          // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
          vpPayload.verifiableCredential = [];
          vpPayload.id = randomUUID(); // VP ID is used as JWT JTI.
        });

        it("should return an error the audience is not the service", async () => {
          if (customScope !== "generic_write") {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              issuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            issuer,
            "authentication-service-v3",
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              nonce: randomUUID(),
              ...(customScope === "generic_write"
                ? {
                    // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                    exp: Math.floor(Date.now() / 1000) + 100,
                    nbf: Math.floor(Date.now() / 1000) - 100,
                  }
                : {}),
            }
          );

          const response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              })
            );

          expect(response.body).toStrictEqual({
            detail: expect.stringContaining(
              'JWT "aud" property MUST match the expected audience "https://api-test.ebsi.eu/authorisation/v3"'
            ),
            status: 400,
            title: "Invalid Verifiable Presentation",
            type: "about:blank",
          });
          expect(response.status).toBe(400);
        });

        it("should return an error if sub is not the client's DID", async () => {
          if (customScope !== "generic_write") {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              issuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            issuer,
            serviceEndpoint,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              nonce: randomUUID(),
              ...(customScope === "generic_write"
                ? {
                    // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                    exp: Math.floor(Date.now() / 1000) + 100,
                    nbf: Math.floor(Date.now() / 1000) - 100,
                  }
                : {}),
            }
          );

          // Fake a change in original vpJwt
          const vpJwtDecoded = decodeJWT(vpJwt);
          const anotherDid = EbsiWallet.createDid();
          vpJwtDecoded.payload.sub = anotherDid;
          const vpTokenTampered = await createJWT(
            vpJwtDecoded.payload,
            {
              issuer: vpJwtDecoded.payload.iss,
              signer: ES256KSigner(randomBytes(32)),
            },
            {
              kid: issuer.kid,
            }
          );

          const response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpTokenTampered,
                presentation_submission: presentationSubmission,
              })
            );

          expect(response.body).toStrictEqual({
            detail: expect.stringMatching(
              `JWT "sub" property MUST match the VP holder "${issuer.did}"`
            ),
            status: 400,
            title: "Invalid Verifiable Presentation",
            type: "about:blank",
          });
          expect(response.status).toBe(400);
        });

        it("should return an error if the VP JWT has expired", async () => {
          if (customScope !== "generic_write") {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              issuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            issuer,
            serviceEndpoint,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              nonce: randomUUID(),
              // Override "exp" and "nbf"
              exp: Math.floor(Date.now() / 1000) - 100,
              nbf: Math.floor(Date.now() / 1000) - 1000,
            }
          );

          const response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              })
            );

          expect(response.body).toStrictEqual({
            detail: "JWT has expired",
            status: 400,
            title: "Invalid Verifiable Presentation",
            type: "about:blank",
          });
          expect(response.status).toBe(400);
        });

        it("should return an error if the VP JWT is not valid yet", async () => {
          if (customScope !== "generic_write") {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              issuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            issuer,
            serviceEndpoint,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              nonce: randomUUID(),
              // Override "exp" and "nbf"
              exp: Math.floor(Date.now() / 1000) + 1000,
              nbf: Math.floor(Date.now() / 1000) + 100,
            }
          );

          const response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              })
            );

          expect(response.body).toStrictEqual({
            detail: "JWT is not valid yet",
            status: 400,
            title: "Invalid Verifiable Presentation",
            type: "about:blank",
          });
          expect(response.status).toBe(400);
        });

        it("should return an error if nonce is not included in vp_token", async () => {
          if (customScope !== "generic_write") {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              issuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            issuer,
            serviceEndpoint,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              // We don't add any nonce
              ...(customScope === "generic_write"
                ? {
                    // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                    exp: Math.floor(Date.now() / 1000) + 100,
                    nbf: Math.floor(Date.now() / 1000) - 100,
                  }
                : {}),
            }
          );

          // Try submitting a vp without neither a nonce.
          const response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              })
            );

          expect(response.body).toStrictEqual({
            detail:
              "The vp_token must contain a nonce in order to prevent replay attacks.",
            status: 400,
            title: "Invalid Verifiable Presentation",
            type: "about:blank",
          });
          expect(response.status).toBe(400);
        });

        it("should return an error when a nonce has been used twice", async () => {
          if (customScope !== "generic_write") {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              issuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          // Create VP JWT manually
          const privateKey = await importJWK(issuer.privateKeyJwk, issuer.alg);
          const vpJwt = await new SignJWT({
            aud: serviceEndpoint,
            sub: issuer.did,
            iat: Math.floor(issuanceDate.getTime() / 1000),
            nbf: Math.floor(issuanceDate.getTime() / 1000),
            exp: Math.floor(expirationDate.getTime() / 1000),
            vp: vpPayload,
            nonce: randomUUID(),
            iss: issuer.did,
          })
            .setProtectedHeader({
              alg: issuer.alg,
              typ: "JWT",
              kid: issuer.kid,
            })
            .sign(privateKey);

          await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              })
            );

          // Try submitting the same VP again.
          const response = await request(server)
            .post("/token")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .send(
              qs.stringify({
                grant_type: "vp_token",
                scope,
                vp_token: vpJwt,
                presentation_submission: presentationSubmission,
              })
            );

          expect(response.body).toStrictEqual({
            detail:
              "The vp_token contains a nonce which has already been used.",
            status: 400,
            title: "Invalid Verifiable Presentation",
            type: "about:blank",
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
                format: "jwt_vc",
                path: "$vp.verifiableCredential[0]", // wrong path
              },
            },
          ],
        };

        if (customScope !== "generic_write") {
          const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer, {
            ebsiAuthority: "example.net",
            skipValidation: true,
          });

          vpPayload.verifiableCredential.push(vcJwt);
        }

        let vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
        );

        let response = await request(server)
          .post("/token")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send(
            qs.stringify({
              grant_type: "vp_token",
              scope,
              vp_token: vpJwt,
              presentation_submission: presentationSubmission,
            })
          );

        expect(response.body).toStrictEqual({
          detail: expect.any(String),
          status: 400,
          title: "Invalid Presentation Submission",
          type: "about:blank",
        });
        expect(
          (response.body as { detail: string }).detail.split("\n")
        ).toStrictEqual([
          "- [root.presentation_submission] each descriptor should have a one id in it, on all levels",
          "- [root.presentation_submission] each path should be a valid jsonPath",
        ]);
        expect(response.status).toBe(400);

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
                format: "jwt_vc",
                path: "$.verifiableCredential[1]", // no credential at this index
              },
            },
          ],
        };

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
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
            })
          );

        expect(response.body).toStrictEqual({
          detail: expect.any(String),
          status: 400,
          title: "Invalid Presentation Submission",
          type: "about:blank",
        });
        expect(
          (response.body as { detail: string }).detail.split("\n")
        ).toStrictEqual([
          "- [root.presentation_submission] each descriptor should have a one id in it, on all levels",
        ]);
        expect(response.status).toBe(400);

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
                format: "jwt_vc",
                path: "$.vc.verifiableCredential[0]", // wrong path
              },
            },
          ],
        };

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
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
            })
          );

        expect(response.body).toStrictEqual({
          detail: expect.any(String),
          status: 400,
          title: "Invalid Presentation Submission",
          type: "about:blank",
        });
        expect(
          (response.body as { detail: string }).detail.split("\n")
        ).toStrictEqual([
          "- [root.presentation_submission] each descriptor should have a one id in it, on all levels",
        ]);
        expect(response.status).toBe(400);

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
        );

        response = await request(server)
          .post("/token")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send(
            qs.stringify({
              grant_type: "vp_token",
              scope,
              vp_token: vpJwt,
              presentation_submission: '{"foo":"bar"}', // Stringified JSON
            })
          );

        expect(response.body).toStrictEqual({
          type: "about:blank",
          detail: '["presentation_submission must be a non-empty object"]',
          status: 400,
          title: "Bad Request",
        });
        expect(response.status).toBe(400);

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
        );

        response = await request(server)
          .post("/token")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send(
            qs.stringify({
              grant_type: "vp_token",
              scope,
              vp_token: vpJwt,
              presentation_submission: { foo: "bar" }, // invalid json
            })
          );

        expect(response.body).toStrictEqual({
          detail: expect.any(String),
          status: 400,
          title: "Invalid Presentation Submission",
          type: "about:blank",
        });
        expect(
          (response.body as { detail: string }).detail.split("\n")
        ).toStrictEqual([
          "- [root.presentation_submission] id should not be empty",
          "- [root.presentation_submission] presentation_definition_id should not be empty",
          "- [root.presentation_submission] descriptor_map should be a non-empty list",
        ]);
        expect(response.status).toBe(400);

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
        );

        const invalidPresentationSubmission =
          createPresentationSubmission("generic_write");
        invalidPresentationSubmission.definition_id = "invalid_def_id";
        response = await request(server)
          .post("/token")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send(
            qs.stringify({
              grant_type: "vp_token",
              scope,
              vp_token: vpJwt,
              presentation_submission: invalidPresentationSubmission,
            })
          );

        expect(response.body).toStrictEqual({
          type: "about:blank",
          detail:
            "definition_id doesn't match the expected Presentation Definition ID for the requested scope",
          status: 400,
          title: "Invalid Presentation Submission",
        });
        expect(response.status).toBe(400);
      });

      it("should return an error if the content is not application/x-www-form-urlencoded", async () => {
        if (customScope !== "generic_write") {
          const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer, {
            ebsiAuthority: "example.net",
            skipValidation: true,
          });

          vpPayload.verifiableCredential.push(vcJwt);
        }

        const nonce = randomUUID();

        const vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce,
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
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
          detail: 'Content-type must be "application/x-www-form-urlencoded"',
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });

        expect(response.status).toBe(400);
      });

      it("should return an access token and an ID token when the presentation is valid", async () => {
        if (customScope !== "generic_write") {
          const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer, {
            ebsiAuthority: "example.net",
            skipValidation: true,
          });

          vpPayload.verifiableCredential.push(vcJwt);
        }

        const nonce = randomUUID();

        const vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          issuer,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce,
            ...(customScope === "generic_write"
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
        );

        const response = await request(server)
          .post("/token")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send(
            qs.stringify({
              grant_type: "vp_token",
              scope,
              vp_token: vpJwt,
              presentation_submission: presentationSubmission,
            })
          );

        expect(response.status).toBe(200);

        expect(response.body).toStrictEqual({
          access_token: expect.any(String),
          expires_in: 7200,
          id_token: expect.any(String),
          scope,
          token_type: "Bearer",
        });

        // Decode access token
        const { access_token: accessToken } = response.body as TokenResponse;
        const decodedAccessToken = decodeJWT(accessToken);

        expect(decodedAccessToken.header).toStrictEqual({
          alg: "ES256",
          kid: expect.any(String),
          typ: "JWT",
        });

        expect(decodedAccessToken.payload).toStrictEqual({
          aud: "https://api-test.ebsi.eu/authorisation/v3",
          exp: expect.any(Number),
          iat: expect.any(Number),
          iss: "https://api-test.ebsi.eu/authorisation/v3",
          jti: expect.any(String),
          scp: scope,
          sub: issuer.did,
        });

        // Get API public key in order to verify the signature
        const { kid: accessTokenKid } = decodedAccessToken.header;
        const jwksResponse = await request(server).get("/jwks");

        expect(jwksResponse.status).toBe(200);

        const { keys } = jwksResponse.body as JsonWebKeySet;
        const apiPublicKeyJwk = keys.find((key) => key.kid === accessTokenKid);

        expect(apiPublicKeyJwk).toBeDefined();

        const apiPublicKey = await importJWK(apiPublicKeyJwk);

        // Verify the signature of the access token
        await expect(
          jwtVerify(accessToken, apiPublicKey)
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
          aud: issuer.did,
          exp: expect.any(Number),
          iat: expect.any(Number),
          iss: "https://api-test.ebsi.eu/authorisation/v3",
          jti: expect.any(String),
          sub: issuer.did,
          nonce,
        });

        await expect(jwtVerify(idToken, apiPublicKey)).resolves.not.toThrow();
      });
    });
  });
});
