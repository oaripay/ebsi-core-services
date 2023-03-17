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
import type { JsonWebKey } from "node:crypto";
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
  DIDR_INVITE_PRESENTATION_DEFINITION,
  DIDR_INVITE_SCOPE,
  DIDR_WRITE_PRESENTATION_DEFINITION,
  DIDR_WRITE_SCOPE,
  TIR_INVITE_PRESENTATION_DEFINITION,
  TIR_INVITE_SCOPE,
  TIR_WRITE_PRESENTATION_DEFINITION,
  TIR_WRITE_SCOPE,
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
  let domain: string;
  let serviceEndpoint: string;
  let credentialIssuer: LegalEntity;
  let credentialIssuerAccreditationUrl: string;
  let credentialSubject: LegalEntity;

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

    domain = configService.get<string>("domain");
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    serviceEndpoint = `${domain}${apiUrlPrefix}`;

    credentialIssuer = await createLegalEntity("ES256K");
    credentialIssuerAccreditationUrl = `${domain}/trusted-issuers-registry/v4/issuers/${
      credentialIssuer.did
    }/attributes/${randomBytes(16).toString("hex")}`;
    credentialSubject = await createLegalEntity("ES256K");
  });

  beforeEach(async () => {
    nock(domain)
      .get(`/did-registry/v4/identifiers/${credentialIssuer.did}`)
      .reply(200, credentialIssuer.didDocument)
      .persist();

    nock(domain)
      .get(`/trusted-issuers-registry/v4/issuers/${credentialIssuer.did}`)
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

    // Issuer Self-Accreditation
    const authorisationCredentialSchema = configService.get<string>(
      "testOidSchemaPattern"
    );
    const iat = Math.round(Date.now() / 1000);
    const exp = iat + 365 * 24 * 3600;
    const jti = `urn:uuid:${randomUUID()}`;
    const issuanceDate = new Date(iat * 1000).toISOString();
    const expirationDate = new Date(exp * 1000).toISOString();
    const accreditation = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: [
        "VerifiableCredential",
        "VerifiableAttestation",
        "VerifiableAccreditation",
        "VerifiableAccreditationToAttest",
      ],
      id: jti,
      issuanceDate,
      expirationDate,
      issued: issuanceDate,
      validFrom: issuanceDate,
      validUntil: expirationDate,
      issuer: credentialIssuer.did,
      credentialSubject: {
        id: credentialIssuer.did,
        accreditedFor: [
          {
            schemaId: authorisationCredentialSchema,
            types: [
              "VerifiableCredential",
              "VerifiableAttestation",
              "VerifiableAuthorisationForTrustChain",
            ],
            policies: [
              {
                type: "ebsiPilot2023",
                uri: "{uri to EBSI gov documents}",
              },
            ],
          },
        ],
      },
      credentialSchema: {
        id: authorisationCredentialSchema,
        type: "FullJsonSchemaValidator2021",
      },
    } satisfies EbsiVerifiableAttestation;

    const accreditationVcJwt = await new SignJWT({
      iat,
      jti,
      nbf: iat,
      exp,
      sub: accreditation.credentialSubject.id,
      iss: accreditation.issuer,
      vc: accreditation,
    })
      .setProtectedHeader({
        alg: credentialIssuer.alg,
        typ: "JWT",
        kid: credentialIssuer.kid,
      })
      .sign(
        await importJWK(credentialIssuer.privateKeyJwk, credentialIssuer.alg)
      );

    nock(domain)
      .get(new URL(credentialIssuerAccreditationUrl).pathname)
      .reply(200, {
        attribute: {
          body: accreditationVcJwt,
        },
      })
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

      expect(response.status).toBe(200);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/jwk-set+json; charset=utf-8");

      const jwk = (response.body as { keys: JWK[] }).keys[0];
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
        detail: '["scope should not be null or undefined"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/problem+json; charset=utf-8");

      // With an invalid scope
      response = await request(server).get(
        "/presentation-definitions?scope=test"
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/problem+json; charset=utf-8");

      // Doesn't contain "openid"
      response = await request(server).get(
        `/presentation-definitions?${qs.stringify({
          scope: "didr_write tir_write",
        })}`
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/problem+json; charset=utf-8");

      // Includes only "openid"
      response = await request(server).get(
        "/presentation-definitions?scope=openid"
      );

      expect(response.body).toStrictEqual({
        detail: `["scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')"]`,
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/problem+json; charset=utf-8");
    });

    it("should return the expected presentation definition for the given scope", async () => {
      expect.assertions(8);

      //  With explicit scope "openid didr_invite"
      let response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${DIDR_INVITE_SCOPE}`
        )}`
      );

      expect(response.body).toStrictEqual(DIDR_INVITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid didr_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${DIDR_WRITE_SCOPE}`
        )}`
      );

      expect(response.body).toStrictEqual(DIDR_WRITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid tir_invite"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TIR_INVITE_SCOPE}`
        )}`
      );

      expect(response.body).toStrictEqual(TIR_INVITE_PRESENTATION_DEFINITION);
      expect(response.status).toBe(200);

      // With explicit scope "openid tir_write"
      response = await request(server).get(
        `/presentation-definitions?scope=${encodeURIComponent(
          `openid ${TIR_WRITE_SCOPE}`
        )}`
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
          qs.stringify({
            grant_type: "test",
          })
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description: "grant_type must be equal to vp_token",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/json; charset=utf-8");
    });

    it("should return an error if the scope is invalid", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          qs.stringify({
            grant_type: "vp_token",
            scope: "test",
          })
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description:
          "scope must be a combination of 'openid' and one of the supported scopes ('didr_invite', 'didr_write', 'tir_invite', 'tir_write')",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/json; charset=utf-8");
    });

    it("should return an error if the vp_token is invalid", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/token")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .send(
          qs.stringify({
            grant_type: "vp_token",
            scope: "openid didr_invite",
            vp_token: "test",
          })
        );

      expect(response.body).toStrictEqual({
        error: "invalid_request",
        error_description: "vp_token must be a jwt string",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as Record<string, unknown>)["content-type"]
      ).toBe("application/json; charset=utf-8");
    });

    describe.each(CUSTOM_SCOPES)("with scope 'openid %s'", (customScope) => {
      const scope = `openid ${customScope}`;
      let vcPayload: EbsiVerifiableAttestation;
      let vpPayload: EbsiVerifiablePresentation;
      let presentationSubmission: PresentationSubmission;
      let issuanceDate: Date;
      let expirationDate: Date;

      beforeEach(() => {
        issuanceDate = new Date();
        // JWT access token must have 2 hours expiration time and there are no Refresh Tokens.
        expirationDate = new Date(issuanceDate.getTime() + 2 * 60 * 60 * 1000);

        vcPayload = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          id: `urn:uuid:${randomUUID()}`,
          type: ["VerifiableCredential", "VerifiableAttestation"],
          issuer: credentialIssuer.did,
          issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
          credentialSubject: {
            id: credentialSubject.did,
            type: "same-device",
          },
          credentialSchema: {
            id: configService.get<string>("testOidSchemaPattern"),
            type: "FullJsonSchemaValidator2021",
          },
          termsOfUse: {
            id: credentialIssuerAccreditationUrl,
            type: "IssuanceCertificate",
          },
        };

        if (customScope === TIR_INVITE_SCOPE) {
          vcPayload.type.push("VerifiableAccreditationToAccredit");
        } else if (customScope === DIDR_INVITE_SCOPE) {
          vcPayload.type.push("VerifiableAuthorisationToOnboard");
        }

        vpPayload = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          verifiableCredential: [],
          holder: credentialSubject.did,
        };

        // Reset to valid presentation submission before each test
        presentationSubmission = createPresentationSubmission(customScope);
        // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
        vpPayload.verifiableCredential = [];
        vpPayload.id = randomUUID(); // VP ID is used as JWT JTI.

        // If scope=didr_invite, the DID is not yet registered in the DIDR and TIR
        if (customScope !== DIDR_INVITE_SCOPE) {
          nock(domain)
            .get(`/did-registry/v4/identifiers/${credentialSubject.did}`)
            .reply(200, credentialSubject.didDocument)
            .persist();
        }

        if (
          customScope === TIR_INVITE_SCOPE ||
          customScope === TIR_WRITE_SCOPE
        ) {
          nock(domain)
            .get(
              `/trusted-issuers-registry/v4/issuers/${credentialSubject.did}`
            )
            .reply(200, {})
            .persist();

          const attributeId =
            "352f18152fdc52f1797c98bfea8e0737d620e5503df2463dd8129719fcf6bf5c";

          nock(domain)
            .get(
              `/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes`
            )
            .reply(200, {
              self: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes?page[after]=1&page[size]=10`,
              items: [
                {
                  id: attributeId,
                  href: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}`,
                },
              ],
              total: 1,
              pageSize: 10,
              links: {
                first: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes?page[after]=1&page[size]=10`,
                prev: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes?page[after]=1&page[size]=10`,
                next: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes?page[after]=1&page[size]=10`,
                last: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes?page[after]=1&page[size]=10`,
              },
            })
            .persist();

          if (customScope === TIR_INVITE_SCOPE) {
            // For tir_invite, create only 1 revision
            nock(domain)
              .get(
                `/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions`
              )
              .reply(200, {
                self: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                items: [
                  {
                    hash: "c1a9c6159f72591b612e1381f5d79cede36a2b097aef6b3691f61248a406d9d2",
                    body: "",
                    issuerType: "RootTAO",
                    tao: EbsiWallet.createDid(),
                    rootTao: EbsiWallet.createDid(),
                  },
                ],
                total: 1,
                pageSize: 10,
                links: {
                  first: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                  prev: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                  next: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                  last: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                },
              })
              .persist();
          } else {
            // For tir_write, create 2 revisions
            nock(domain)
              .get(
                `/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions`
              )
              .reply(200, {
                self: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                items: [
                  {
                    hash: "c1a9c6159f72591b612e1381f5d79cede36a2b097aef6b3691f61248a406d9d2",
                    body: "",
                    issuerType: "RootTAO",
                    tao: EbsiWallet.createDid(),
                    rootTao: EbsiWallet.createDid(),
                  },
                  {
                    hash: "352f18152fdc52f1797c98bfea8e0737d620e5503df2463dd8129719fcf6bf5c",
                    body: "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDplYnNpOnp5d24zZlBoM0s0aDZLaWJlOUF1VE1wIzVfWXJCNTFHckxZSFc2cU9lY05RZFFiMU8xNWUzWGNtWE5zVzA5d1IyNncifQ.eyJpYXQiOjE2NzcyNDk0NzYsImp0aSI6InVybjp1dWlkOmI2NDhkZGQ2LTVjMzgtNGI3YS1iMDM3LTVmNzc4OWJhNTVlOSIsIm5iZiI6MTY3NzI0OTQ3NiwiZXhwIjoxNzA4Nzg1NDc2LCJzdWIiOiJkaWQ6ZWJzaTp6ejdYc0M5aXhBWHVaZWNvRDlzWkVNMSIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJWZXJpZmlhYmxlQXR0ZXN0YXRpb24iLCJWZXJpZmlhYmxlQXV0aG9yaXNhdGlvbkZvclRydXN0Q2hhaW4iXSwiaXNzdWVyIjoiZGlkOmVic2k6enl3bjNmUGgzSzRoNktpYmU5QXVUTXAiLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDplYnNpOnp6N1hzQzlpeEFYdVplY29EOXNaRU0xIn0sInRlcm1zT2ZVc2UiOnsiaWQiOiJodHRwczovL2FwaS10ZXN0LmVic2kuZXUvdHJ1c3RlZC1pc3N1ZXJzLXJlZ2lzdHJ5L3Y0L2lzc3VlcnMvZGlkOmVic2k6enl3bjNmUGgzSzRoNktpYmU5QXVUTXAvYXR0cmlidXRlcy9iYTc1MWZhNjAyNTBjYmRiMzlmZWVjMDdkMzZjMzNiNTBiNjM4ODY0MjBmYzkxNDY5MjUwOWQ1N2Y4MTgxYzFjIiwidHlwZSI6Iklzc3VhbmNlQ2VydGlmaWNhdGUifSwiY3JlZGVudGlhbFNjaGVtYSI6eyJpZCI6Imh0dHBzOi8vYXBpLXRlc3QuZWJzaS5ldS90cnVzdGVkLXNjaGVtYXMtcmVnaXN0cnkvdjIvc2NoZW1hcy96M01nVUZVa2I3MjJ1cTR4M2R2NXlBSm1uTm16REZlSzVVQzh4ODNRb2VMSk0iLCJ0eXBlIjoiRnVsbEpzb25TY2hlbWFWYWxpZGF0b3IyMDIxIn0sImlkIjoidXJuOnV1aWQ6YjY0OGRkZDYtNWMzOC00YjdhLWIwMzctNWY3Nzg5YmE1NWU5IiwiaXNzdWFuY2VEYXRlIjoiMjAyMy0wMi0yNFQxNDozNzo1Ni4wMDBaIiwiaXNzdWVkIjoiMjAyMy0wMi0yNFQxNDozNzo1Ni4wMDBaIiwidmFsaWRGcm9tIjoiMjAyMy0wMi0yNFQxNDozNzo1Ni4wMDBaIiwiZXhwaXJhdGlvbkRhdGUiOiIyMDI0LTAyLTI0VDE0OjM3OjU2LjAwMFoiLCJ2YWxpZFVudGlsIjoiMjAyNC0wMi0yNFQxNDozNzo1Ni4wMDBaIn0sImlzcyI6ImRpZDplYnNpOnp5d24zZlBoM0s0aDZLaWJlOUF1VE1wIn0.td0zhAcRNN6UQ4Yul6-Vy9qQNi_ZxlXmUIlbkfMcD3rAY6s8EpnA1h8UYagcePmGk8Xzx_6KpzN78QuFPF4lsg",
                    issuerType: "RootTAO",
                    tao: EbsiWallet.createDid(),
                    rootTao: EbsiWallet.createDid(),
                  },
                ],
                total: 2,
                pageSize: 10,
                links: {
                  first: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                  prev: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                  next: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                  last: `${domain}/trusted-issuers-registry/v4/issuers/${credentialSubject.did}/attributes/${attributeId}/revisions?page[after]=1&page[size]=10`,
                },
              })
              .persist();
          }
        }
      });

      describe("vp_token validation", () => {
        beforeEach(() => {
          // Reset to empty verifiable credential array before each test to allow each test to add its own verifiable credential
          vpPayload.verifiableCredential = [];
          vpPayload.id = randomUUID(); // VP ID is used as JWT JTI.
        });

        it("should return an error the audience is not the service", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            "authentication-service-v3",
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              nonce: randomUUID(),
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
            error: "invalid_request",
            error_description: `Invalid Verifiable Presentation: JWT "aud" property MUST match the expected audience "${domain}/authorisation/v3"`,
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"]
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an error if sub is not the client's DID", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              nonce: randomUUID(),
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
              issuer: vpJwtDecoded.payload.iss as string,
              signer: ES256KSigner(randomBytes(32)),
            },
            {
              kid: credentialIssuer.kid,
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
            error: "invalid_request",
            error_description: `Invalid Verifiable Presentation: JWT "sub" property MUST match the VP holder "${credentialSubject.did}"`,
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"]
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an error if the VP JWT has expired", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
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
            error: "invalid_request",
            error_description:
              "Invalid Verifiable Presentation: JWT has expired",
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"]
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an error if the VP JWT is not valid yet", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
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
            error: "invalid_request",
            error_description:
              "Invalid Verifiable Presentation: JWT is not valid yet",
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"]
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an error if nonce is not included in vp_token", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          const vpJwt = await createVerifiablePresentationJwt(
            vpPayload,
            credentialSubject,
            serviceEndpoint,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
              // We don't add any nonce
              ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
            error: "invalid_request",
            error_description:
              "The vp_token must contain a nonce in order to prevent replay attacks.",
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"]
          ).toBe("application/json; charset=utf-8");
        });

        it("should return an error when a nonce has been used twice", async () => {
          if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              credentialIssuer,
              {
                ebsiAuthority: "example.net",
                skipValidation: true,
              }
            );

            vpPayload.verifiableCredential.push(vcJwt);
          }

          // Create VP JWT manually
          const privateKey = await importJWK(
            credentialIssuer.privateKeyJwk,
            credentialIssuer.alg
          );
          const vpJwt = await new SignJWT({
            aud: serviceEndpoint,
            sub: credentialIssuer.did,
            iat: Math.floor(issuanceDate.getTime() / 1000),
            nbf: Math.floor(issuanceDate.getTime() / 1000),
            exp: Math.floor(expirationDate.getTime() / 1000),
            vp: vpPayload,
            nonce: randomUUID(),
            iss: credentialIssuer.did,
          })
            .setProtectedHeader({
              alg: credentialIssuer.alg,
              typ: "JWT",
              kid: credentialIssuer.kid,
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
            error: "invalid_request",
            error_description:
              "The vp_token contains a nonce which has already been used.",
          });
          expect(response.status).toBe(400);
          expect(
            (response.headers as Record<string, unknown>)["content-type"]
          ).toBe("application/json; charset=utf-8");
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

        if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
          const vcJwt = await createVerifiableCredentialJwt(
            vcPayload,
            credentialIssuer,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
            }
          );

          vpPayload.verifiableCredential.push(vcJwt);
        }

        let vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels
- [root.presentation_submission] each path should be a valid jsonPath`,
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
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
                format: "jwt_vc",
                path: "$.verifiableCredential[1]", // no credential at this index
              },
            },
          ],
        };

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels`,
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
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
                format: "jwt_vc",
                path: "$.vc.verifiableCredential[0]", // wrong path
              },
            },
          ],
        };

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description: `Invalid Presentation Submission:
- [root.presentation_submission] each descriptor should have a one id in it, on all levels`,
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
        ).toBe("application/json; charset=utf-8");

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description:
            "presentation_submission must be a non-empty object",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
        ).toBe("application/json; charset=utf-8");

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description: `Invalid Presentation Submission:
- [root.presentation_submission] id should not be empty
- [root.presentation_submission] presentation_definition_id should not be empty
- [root.presentation_submission] descriptor_map should be a non-empty list`,
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
        ).toBe("application/json; charset=utf-8");

        vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce: randomUUID(),
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
              ? {
                  // Manually add "exp" and "nbf" to the VP JWT because there's no VC to extract from
                  exp: Math.floor(Date.now() / 1000) + 100,
                  nbf: Math.floor(Date.now() / 1000) - 100,
                }
              : {}),
          }
        );

        const invalidPresentationSubmission =
          createPresentationSubmission(TIR_WRITE_SCOPE);
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
          error: "invalid_request",
          error_description:
            "Invalid Presentation Submission: definition_id doesn't match the expected Presentation Definition ID for the requested scope",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
        ).toBe("application/json; charset=utf-8");
      });

      it("should return an error if the content is not application/x-www-form-urlencoded", async () => {
        if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
          const vcJwt = await createVerifiableCredentialJwt(
            vcPayload,
            credentialIssuer,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
            }
          );

          vpPayload.verifiableCredential.push(vcJwt);
        }

        const nonce = randomUUID();

        const vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce,
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description:
            "Content-type must be application/x-www-form-urlencoded",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
        ).toBe("application/json; charset=utf-8");
      });

      it("should an error if the conditions specific to the scope are not met", async () => {
        let expectedErrorMessage: string;
        let vpSigner = credentialSubject;

        switch (customScope) {
          case DIDR_INVITE_SCOPE: {
            // Present a VC without VerifiableAccreditationToAccredit
            vcPayload.type = ["VerifiableCredential", "VerifiableAttestation"];
            expectedErrorMessage =
              "Invalid Presentation Submission:\nFilterEvaluation tag: Input candidate failed filter evaluation: $.input_descriptors[0]: $.verifiableCredential[0];,MarkForSubmissionEvaluation tag: The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0];";
            break;
          }
          case DIDR_WRITE_SCOPE: {
            // VP Signer is not registered in the DIDR
            vpSigner = await createLegalEntity("ES256K");
            vpPayload.holder = vpSigner.did;

            nock(domain)
              .get(`/did-registry/v4/identifiers/${vpSigner.did}`)
              .reply(404, "Not found")
              .persist();

            expectedErrorMessage = `Invalid Verifiable Presentation: VP JWT validation failed: Unable to resolve ${vpSigner.kid}. Error: notFound. Not Found | Registry used: ${domain}/did-registry/v4/identifiers`;
            break;
          }
          case TIR_INVITE_SCOPE: {
            // Present a VC without any of VerifiableAuthorisationForTrustChain, VerifiableAccreditationToAttest or VerifiableAccreditationToAccredit
            vcPayload.type = ["VerifiableCredential", "VerifiableAttestation"];
            expectedErrorMessage =
              "Invalid Presentation Submission:\nFilterEvaluation tag: Input candidate failed filter evaluation: $.input_descriptors[0]: $.verifiableCredential[0];,MarkForSubmissionEvaluation tag: The input candidate is not eligible for submission: $.input_descriptors[0]: $.verifiableCredential[0];";
            break;
          }
          case TIR_WRITE_SCOPE: {
            // VP Signer is not registered in the TIR
            vpSigner = await createLegalEntity("ES256K");
            vpPayload.holder = vpSigner.did;

            nock(domain)
              .get(`/did-registry/v4/identifiers/${vpSigner.did}`)
              .reply(200, vpSigner.didDocument)
              .persist();

            nock(domain)
              .get(`/trusted-issuers-registry/v4/issuers/${vpSigner.did}`)
              .reply(404, "Not found")
              .persist();

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
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
            }
          );

          vpPayload.verifiableCredential.push(vcJwt);
        }

        const nonce = randomUUID();

        const vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          vpSigner,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce,
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
          error: "invalid_request",
          error_description: expectedErrorMessage,
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as Record<string, unknown>)["content-type"]
        ).toBe("application/json; charset=utf-8");
      });

      it("should return an access token and an ID token when the presentation is valid", async () => {
        if ([DIDR_INVITE_SCOPE, TIR_INVITE_SCOPE].includes(customScope)) {
          const vcJwt = await createVerifiableCredentialJwt(
            vcPayload,
            credentialIssuer,
            {
              ebsiAuthority: "example.net",
              skipValidation: true,
            }
          );

          vpPayload.verifiableCredential.push(vcJwt);
        }

        const nonce = randomUUID();

        const vpJwt = await createVerifiablePresentationJwt(
          vpPayload,
          credentialSubject,
          serviceEndpoint,
          {
            ebsiAuthority: "example.net",
            skipValidation: true,
            nonce,
            ...([DIDR_WRITE_SCOPE, TIR_WRITE_SCOPE].includes(customScope)
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
        const apiPublicKeyJwk = keys.find((key) => key.kid === accessTokenKid);

        expect(apiPublicKeyJwk).toBeDefined();

        const apiPublicKey = await importJWK(apiPublicKeyJwk as JsonWebKey);

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
          aud: credentialSubject.did,
          exp: expect.any(Number),
          iat: expect.any(Number),
          iss: `${domain}/authorisation/v3`,
          jti: expect.any(String),
          sub: credentialSubject.did,
          nonce,
        });

        await expect(jwtVerify(idToken, apiPublicKey)).resolves.not.toThrow();
      });
    });
  });
});
