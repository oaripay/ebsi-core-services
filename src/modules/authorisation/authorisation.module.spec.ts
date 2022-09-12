import crypto, { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import request from "supertest";
import { SignJWT, importJWK, exportJWK, jwtVerify } from "jose";
import { Agent } from "@cef-ebsi/oauth2-auth";
import type { Ake1SigPayload } from "@cef-ebsi/oauth2-auth";
import { Test, TestingModule } from "@nestjs/testing";
import axios from "axios";
import type { AxiosResponse } from "axios";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import didJwt, { createJWT, ES256KSigner } from "did-jwt";
import type { DIDDocument } from "did-resolver";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import * as vcLib from "@cef-ebsi/verifiable-credential";
import type { EbsiVerifiableAttestation } from "@cef-ebsi/verifiable-credential";
import { AuthorisationModule } from "./authorisation.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import {
  getPublicKey,
  generateKeys,
  getPrivateKeyHex,
  randomPrivateKeySecp256k1,
} from "../../../tests/utils/keys";
import { createTestClient } from "../../../tests/utils/createTestClient";
import {
  createAuthenticationResponseJose,
  getKeyByAlg,
} from "../../../tests/utils/didAuth";
import type { ApiConfig } from "../../config/configuration";
import type { ClaimRequest } from "./dto";

async function generateApp(apiPrivateKey: string) {
  const { privateKey, publicKey } = await generateKeys("ES256K");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  });

  const privateKeyHex = await getPrivateKeyHex(privateKey);
  const publicKeyPemBase64 = Buffer.from(publicKeyPem).toString("base64");
  const name = `test-${crypto.randomBytes(3).toString("hex")}`;
  const kid = `${apiPrivateKey}/${name}`;

  return {
    name,
    privateKey,
    privateKeyHex,
    publicKeyPemBase64,
    publicKey,
    kid,
  };
}

async function createClient(alg: string) {
  const { publicKey, privateKey, publicKeyEncryption, privateKeyEncryption } =
    await generateKeys(alg);

  const jwk = await exportJWK(publicKey);
  const did = EbsiWallet.createDid();

  return {
    publicKey,
    privateKey,
    publicKeyEncryption,
    privateKeyEncryption,
    did,
    jwk,
  };
}

describe("Authorisation Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig, true>;
  let apiPrivateKey: string;

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
    apiPrivateKey = configService.get("apiPrivateKey");

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = app.getHttpServer() as HttpServer;
  });

  beforeEach(() => {
    // Mock axios
    jest
      .spyOn(axios, "get")
      .mockImplementation(async (url: string): Promise<unknown> => {
        return Promise.reject(
          new Error(
            `Forgot to implement mock for axios get? Received: GET ${url}`
          )
        );
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("POST /authentication-requests", () => {
    it("should reject bad requests", async () => {
      expect.assertions(4);

      let response = await request(server)
        .post("/authentication-requests")
        .send("invalid string");
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/authentication-requests")
        .send({ scope: "invalid scope" });
      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should return an authentication request", async () => {
      expect.assertions(9);

      const response = await request(server)
        .post("/authentication-requests")
        .send({
          scope: "openid did_authn",
        });

      expect(response.status).toBe(200);

      const query = new URLSearchParams(
        response.text.replace("openid://?", "")
      );

      expect(query.get("scope")).toBe("openid did_authn");
      expect(query.get("response_type")).toBe("id_token");
      expect(query.get("client_id")).toBeDefined();
      expect(query.get("nonce")).toBeDefined();
      expect(query.get("request")).toBeDefined();

      const { publicKeyObject } = await getPublicKey(apiPrivateKey);

      const verification = await jwtVerify(
        query.get("request"),
        publicKeyObject
      );
      expect(verification.payload).toStrictEqual({
        iat: expect.any(Number) as number,
        scope: "openid did_authn",
        response_type: "id_token",
        client_id: expect.any(String) as string,
        nonce: expect.any(String) as string,
        redirect_uri: expect.stringContaining(
          "/authorisation/v2/siop-sessions"
        ) as string,
        response_mode: "post",
        iss: configService.get<string>("apiName"),
        exp: expect.any(Number) as number,
        claims: expect.any(Object) as unknown,
      });
      expect(verification.payload.claims).toBeDefined();
      expect(verification.payload.claims).toStrictEqual({
        id_token: {
          verified_claims: {
            verification: {
              trust_framework: "EBSI",
              evidence: {
                type: {
                  value: "verifiable_credential",
                },
                document: {
                  type: {
                    essential: true,
                    value: ["VerifiableCredential", "VerifiableAuthorisation"],
                  },
                  credentialSchema: {
                    id: {
                      essential: true,
                      value: configService.get<string>(
                        "authorisationCredentialSchema"
                      ),
                    },
                  },
                },
              },
            },
          },
        } as ClaimRequest,
      });
    });
  });

  describe("POST /oauth2-sessions", () => {
    it("should reject bad requests", async () => {
      expect.assertions(4);

      const trustedApp = await generateApp(apiPrivateKey);

      let response = await request(server)
        .post("/oauth2-sessions")
        .send("invalid string");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: `["grantType must be equal to client_credentials","clientAssertionType must be equal to urn:ietf:params:oauth:client-assertion-type:jwt-bearer","clientAssertion must be a jwt string","scope must be equal to openid did_authn"]`,
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      const agent = new Agent({
        privateKey: trustedApp.privateKeyHex,
        name: trustedApp.name,
        trustedAppsRegistry: configService.get<string>("trustedAppsRegistry"),
      });

      const nonce = randomUUID();

      const authRequest = await agent.createRequest("storage-api", {
        nonce,
      });

      jest
        .spyOn(axios, "get")
        .mockImplementation(async (url: string): Promise<unknown> => {
          // Mock TAR response - App not found
          if (
            url.endsWith(`/trusted-apps-registry/v3/apps/${trustedApp.name}`)
          ) {
            const error = new Error("axios error") as unknown as {
              response: AxiosResponse;
              isAxiosError: boolean;
            };
            error.isAxiosError = true;
            error.response = {
              status: 404,
              data: {
                title: "Not Found",
                status: 404,
                detail: "App not found",
                type: "about:blank",
              },
            } as AxiosResponse;

            return Promise.reject(error);
          }

          return Promise.reject(
            new Error(
              `Forgot to implement mock for axios get? Received: GET ${url}`
            )
          );
        });

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: "App not found",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should create an OAuth2 session", async () => {
      expect.assertions(1);

      const trustedApp = await generateApp(apiPrivateKey);

      const agent = new Agent({
        privateKey: trustedApp.privateKeyHex,
        name: trustedApp.name,
        trustedAppsRegistry: configService.get<string>("trustedAppsRegistry"),
      });

      const nonce = randomUUID();

      const authRequest = await agent.createRequest("storage-api", {
        nonce,
      });

      jest
        .spyOn(axios, "get")
        .mockImplementation(async (url: string): Promise<unknown> => {
          // Mock TAR responses
          if (
            url.endsWith(`/trusted-apps-registry/v3/apps/${trustedApp.name}`)
          ) {
            return Promise.resolve({
              data: {
                name: trustedApp.name,
                publicKeys: [trustedApp.publicKeyPemBase64],
                revocation: null,
              },
              status: 200,
            });
          }

          if (url.endsWith(`/trusted-apps-registry/v3/apps/storage-api`)) {
            return Promise.resolve({
              data: {},
              status: 200,
            });
          }

          if (
            url.endsWith(
              `/trusted-apps-registry/v3/apps/storage-api/authorizations?requesterApplicationName=${
                trustedApp.name
              }&${encodeURIComponent("page[after]")}=1`
            )
          ) {
            return Promise.resolve({
              data: {
                self: "",
                items: [
                  {
                    authorizationId:
                      "0x51dd74adb8b781ade4ed115b7015b28979c66d4a0d4020b6c30b8f4a15dbd6f5",
                    requesterApplicationName: trustedApp.name,
                    href: "/trusted-apps-registry/v3/apps/storage-api/authorizations/0x51dd74adb8b781ade4ed115b7015b28979c66d4a0d4020b6c30b8f4a15dbd6f5",
                  },
                ],
                total: 1,
                pageSize: 10,
                links: {
                  last: `/trusted-apps-registry/v3/apps/storage-api/authorizations?page[after]=1&page[size]=10&requesterApplicationName=${trustedApp.name}`,
                },
              },
              status: 200,
            });
          }

          if (
            url.endsWith(
              "/trusted-apps-registry/v3/apps/storage-api/authorizations/0x51dd74adb8b781ade4ed115b7015b28979c66d4a0d4020b6c30b8f4a15dbd6f5"
            )
          ) {
            return Promise.resolve({
              data: {
                authorizationId:
                  "0x51dd74adb8b781ade4ed115b7015b28979c66d4a0d4020b6c30b8f4a15dbd6f5",
                resourceApplicationId: "0x",
                requesterApplicationId: "0x",
                resourceApplicationName: "storage-api",
                requesterApplicationName: trustedApp.name,
                iss: "did:ebsi:iss",
                permissions: {
                  create: "true",
                  read: "true",
                  update: "true",
                  delete: "true",
                },
                status: "active",
                notBefore: Math.floor(Date.now()) - 100000,
                notAfter: Math.floor(Date.now()) + 100000,
              },
              status: 200,
            });
          }

          return Promise.reject(
            new Error(
              `Forgot to implement mock for axios get? Received: GET ${url}`
            )
          );
        });

      const sessionRequest = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);

      expect(sessionRequest.body).toStrictEqual({
        ake1_enc_payload: expect.any(String) as string,
        ake1_jws_detached: expect.any(String) as string,
        ake1_sig_payload: {
          ake1_enc_payload: expect.any(String) as string,
          ake1_nonce: expect.any(String) as string,
          exp: expect.any(Number) as string,
          iat: expect.any(Number) as string,
          iss: configService.get<string>("apiName"),
          kid: expect.stringContaining(
            `/trusted-apps-registry/v3/apps/${trustedApp.name}`
          ) as string,
        },
        kid: expect.stringContaining(
          `/trusted-apps-registry/v3/apps/${configService.get<string>(
            "apiName"
          )}`
        ) as string,
      });
    });
  });

  describe.each(["ES256K", "ES256", "RS256", "EdDSA"] as const)(
    "POST /siop-sessions with alg %s",
    (alg) => {
      it("should reject bad requests", async () => {
        expect.assertions(6);

        const client = await createTestClient();
        const clientDid = client.did;
        const clientPrivateKeys = client.keys;
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);
        const clientPrivateKey = await importJWK(keyObject.privateKeyJwk, alg);

        let response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send("invalid string");

        expect(response.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: '["id_token must be a jwt string"]',
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        let payload: Record<string, unknown> = {
          sub_did_verification_method_uri: "https://self-issued.me/v2",
          sub: clientDid,
          sub_jwk: {},
          nonce: "nonce",
        };
        let idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
          })
          .setIssuedAt()
          .setIssuer(client.did) // wrong issuer
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(clientPrivateKey);

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: `invalid issuer ${clientDid}. Possible values: https://self-issued.me, https://self-issued.me/v2`,
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        payload = {
          sub_did_verification_method_uri: "https://self-issued.me/v2",
          sub: clientDid,
          sub_jwk: {},
        };

        idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: client.did,
          })
          .setIssuedAt()
          .setIssuer("https://self-issued.me/v2")
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(clientPrivateKey);

        // Fake verifyJWT result
        jest.spyOn(didJwt, "verifyJWT").mockImplementation(async () =>
          Promise.resolve({
            payload,
            didResolutionResult: {
              didDocument: {
                id: client.did,
              },
              didDocumentMetadata: {},
              didResolutionMetadata: {},
            },
            issuer: "",
            signer: {
              publicKeyJwk: { ...keyObject.privateKeyJwk, kty: "" },
              id: "",
              type: "",
              controller: "",
            },
            jwt: "",
          })
        );

        jest.spyOn(axios, "get").mockImplementation(
          async (): Promise<AxiosResponse<DIDDocument>> =>
            Promise.resolve({
              data: client.didDocument,
            } as AxiosResponse<DIDDocument>)
        );

        response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({
            id_token: idToken,
          });

        expect(response.body).toStrictEqual({
          title: "Invalid ID Token",
          status: 400,
          detail: "No nonce found in JWT payload",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });

      it("should handle error 404 from DID Registry API", async () => {
        expect.assertions(2);

        const nonce = randomUUID();

        const client = await createTestClient();
        const clientDid = client.did;
        const clientPrivateKeys = client.keys;
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        const payload = {
          sub: clientDid,
          sub_jwk: {},
          sub_did_verification_method_uri: keyObject.id,
          nonce,
          claims: {
            encryption_key: keyObject.publicKeyEncryptionJwk,
          },
        };

        const idToken = await createAuthenticationResponseJose({
          alg,
          keyId: keyObject.id,
          nonce,
          redirectUri: "redirect_uri",
          privateKeyJwk: keyObject.privateKeyJwk,
          publicKeyEncryptionJwk: keyObject.publicKeyEncryptionJwk,
          payload,
        });

        // Error from DID Registry API
        jest.spyOn(axios, "get").mockImplementation(() => {
          const error = new Error("axios error") as unknown as {
            response: AxiosResponse;
            isAxiosError: boolean;
          };
          error.isAxiosError = true;
          error.response = {
            status: 404,
            data: {
              title: "Not Found",
              status: 404,
              detail: "not found",
              type: "about:blank",
            },
          } as AxiosResponse;
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw error;
        });

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          status: 400,
          title: "Invalid ID Token",
          detail: `Unable to resolve ${clientDid}. Error: notFound. Message: not found | Registry used: ${configService.get<string>(
            "didRegistry"
          )}`,
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });

      it("should handle error 500 from DID Registry API", async () => {
        expect.assertions(2);

        const nonce = randomUUID();

        const client = await createTestClient();
        const clientDid = client.did;
        const clientPrivateKeys = client.keys;
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        const payload = {
          sub: clientDid,
          sub_jwk: {},
          sub_did_verification_method_uri: keyObject.id,
          nonce,
          claims: {
            encryption_key: keyObject.publicKeyEncryptionJwk,
          },
        };

        const idToken = await createAuthenticationResponseJose({
          alg,
          keyId: keyObject.id,
          nonce,
          redirectUri: "redirect_uri",
          privateKeyJwk: keyObject.privateKeyJwk,
          publicKeyEncryptionJwk: keyObject.publicKeyEncryptionJwk,
          payload,
        });

        // Error from DID Registry API
        jest.spyOn(axios, "get").mockImplementation(() => {
          const error = new Error("axios error") as unknown as {
            response: AxiosResponse;
            isAxiosError: boolean;
          };
          error.isAxiosError = true;
          error.response = {
            status: 500,
            data: {
              title: "Internal Server Error",
              status: 500,
              type: "about:blank",
            },
          } as AxiosResponse;
          // eslint-disable-next-line @typescript-eslint/no-throw-literal
          throw error;
        });

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          title: "Internal Server Error",
          status: 500,
          type: "about:blank",
        });
        expect(response.status).toBe(500);
      });

      it(`should create a SIOP session for a user that uses alg ${alg}`, async () => {
        expect.assertions(2);

        const nonce = randomUUID();

        const client = await createTestClient();
        const clientDid = client.did;
        const clientPrivateKeys = client.keys;
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        const payload = {
          sub: clientDid,
          sub_jwk: {},
          sub_did_verification_method_uri: keyObject.id,
          nonce,
          claims: {
            encryption_key: keyObject.publicKeyEncryptionJwk,
          },
        };

        const idToken = await createAuthenticationResponseJose({
          alg,
          keyId: keyObject.id,
          nonce,
          redirectUri: "redirect_uri",
          privateKeyJwk: keyObject.privateKeyJwk,
          publicKeyEncryptionJwk: keyObject.publicKeyEncryptionJwk,
          payload,
        });

        // Fake verifyJWT result
        jest.spyOn(didJwt, "verifyJWT").mockImplementation(async () =>
          Promise.resolve({
            payload,
            didResolutionResult: {
              didDocument: client.didDocument,
              didDocumentMetadata: {},
              didResolutionMetadata: {},
            },
            issuer: "",
            signer: {
              publicKeyJwk: { ...keyObject.publicKeyJwk, kty: "" },
              id: "",
              type: "",
              controller: "",
            },
            jwt: "",
          })
        );

        jest
          .spyOn(axios, "get")
          .mockImplementation(async (): Promise<AxiosResponse<DIDDocument>> => {
            return Promise.resolve({
              data: client.didDocument,
            } as AxiosResponse<DIDDocument>);
          });

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual({
          ake1_enc_payload: expect.any(String) as string,
          ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
          ake1_sig_payload: expect.objectContaining({
            ake1_enc_payload: expect.any(String) as string,
            ake1_nonce: nonce,
            did: client.did,
            iat: expect.any(Number) as number,
            exp: expect.any(Number) as number,
            iss: configService.get<string>("apiName"),
          }) as Ake1SigPayload,
          kid: <string>(
            expect.stringContaining(
              `/trusted-apps-registry/v3/apps/${configService.get<string>(
                "apiName"
              )}`
            )
          ),
        });
        expect(response.status).toBe(200);
      });

      it(`should create a siop session for a user that uses alg ${alg} and presents a VP JWT`, async () => {
        expect.assertions(2);
        const nonce = randomUUID();

        const client = await createTestClient();
        const clientPrivateKeys = client.keys;
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        const onboardingAllowlist = configService.get<string[]>(
          "onboardingAllowlist"
        );
        const allowedIssuer = onboardingAllowlist[0];

        const mockedCredential = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          id: "urn:did:123456",
          type: [
            "VerifiableCredential",
            "VerifiableAttestation",
            "VerifiableId",
          ],
          issuer: allowedIssuer,
          issuanceDate: "2021-11-01T00:00:00Z",
          validFrom: "2021-11-01T00:00:00Z",
          credentialSubject: {
            id: client.did,
          },
          credentialSchema: {
            id: "https://test.intebsi.xyz/trusted-schemas-registry/v1/schemas/0x312e332e362e312e342e312e3234342e332e3137302e332e332e312e3734",
            type: "FullJsonSchemaValidator2021",
          },
          expirationDate: "2031-11-30T00:00:00Z",
        };
        const vcJwt = await createJWT(
          {
            sub: client.did,
            vc: mockedCredential,
          },
          {
            issuer: allowedIssuer,
            signer: ES256KSigner(
              Buffer.from(
                EbsiWallet.generateKeyPair({ format: "hex" })
                  .privateKey as string,
                "hex"
              )
            ),
          }
        );

        const mockedPresentation = {
          id: "urn:did:123456",
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiablePresentation"],
          holder: client.did,
          verifiableCredential: [vcJwt],
        };
        const vpJwt = await createJWT(
          {
            sub: client.did,
            vp: mockedPresentation,
          },
          {
            issuer: client.did,
            signer: ES256KSigner(
              Buffer.from(client.privateKeyHexES256K.replace(/^0x/, ""), "hex")
            ),
          }
        );

        const payload = {
          sub: client.did,
          sub_jwk: {},
          sub_did_verification_method_uri: keyObject.id,
          nonce,
          claims: {
            encryption_key: keyObject.publicKeyEncryptionJwk,
          },
          _vp_token: {
            presentation_submission: {
              // The presentation_submission object MUST contain an id property.
              // The value of this property MUST be a unique identifier, such as a UUID.
              id: randomUUID(),
              // The presentation_submission object MUST contain a definition_id property.
              // The value of this property MUST be the id value of a valid Presentation Definition.
              definition_id: randomUUID(),
              // The presentation_submission object MUST include a descriptor_map property.
              // The value of this property MUST be an array of Input Descriptor Mapping Objects, composed as follows:
              descriptor_map: [
                {
                  // The descriptor_map object MUST include an id property.
                  // The value of this property MUST be a string that matches the id property of the Input Descriptor in the Presentation Definition that this Presentation Submission is related to.
                  id: randomUUID(),
                  // The descriptor_map object MUST include a format property.
                  // The value of this property MUST be a string that matches one of the Claim Format Designation. This denotes the data format of the Claim.
                  format: "jwt_vp",
                  // The descriptor_map object MUST include a path property.
                  // The value of this property MUST be a JSONPath string expression. The path property indicates the Claim submitted in relation to the identified Input Descriptor, when executed against the top-level of the object the Presentation Submission is embedded within.
                  path: "$",
                  // The object MAY include a path_nested object to indicate the presence of a multi-Claim envelope format.
                  // This means the Claim indicated is to be decoded separately from its parent enclosure.
                  path_nested: {
                    id: "onboarding-input-id",
                    format: "jwt_vc",
                    path: "$.vp.verifiableCredential[0]",
                  },
                },
              ],
            },
          },
        };

        const idToken = await createAuthenticationResponseJose({
          alg,
          keyId: keyObject.id,
          nonce,
          redirectUri: "redirect_uri",
          privateKeyJwk: keyObject.privateKeyJwk,
          publicKeyEncryptionJwk: keyObject.publicKeyEncryptionJwk,
          payload,
        });

        // Fake verifyJWT result
        jest.spyOn(didJwt, "verifyJWT").mockImplementation(async () =>
          Promise.resolve({
            payload,
            didResolutionResult: {
              didDocument: {
                id: client.did,
              },
              didDocumentMetadata: {},
              didResolutionMetadata: {},
            },
            issuer: "",
            signer: {
              publicKeyJwk: { ...keyObject.publicKeyJwk, kty: "" },
              id: "",
              type: "",
              controller: "",
            },
            jwt: "",
          })
        );

        jest.spyOn(axios, "get").mockImplementation(
          async (): Promise<AxiosResponse<DIDDocument>> =>
            Promise.resolve({
              data: client.didDocument,
            } as AxiosResponse<DIDDocument>)
        );

        jest
          .spyOn(vcLib, "verifyCredentialJwt")
          .mockImplementation(async () =>
            Promise.resolve(mockedCredential as EbsiVerifiableAttestation)
          );

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken, vp_token: vpJwt });

        expect(response.body).toStrictEqual({
          ake1_enc_payload: expect.any(String) as string,
          ake1_jws_detached: expect.stringContaining("..") as string, // payload removed from the JWT
          ake1_sig_payload: expect.objectContaining({
            ake1_enc_payload: expect.any(String) as string,
            ake1_nonce: nonce,
            did: client.did,
            iat: expect.any(Number) as number,
            exp: expect.any(Number) as number,
            iss: configService.get<string>("apiName"),
          }) as Ake1SigPayload,
          kid: <string>(
            expect.stringContaining(
              `/trusted-apps-registry/v3/apps/${configService.get<string>(
                "apiName"
              )}`
            )
          ),
        });
        expect(response.status).toBe(200);
      });

      it(`should throw bad request error when creating a siop session for a user that uses alg ${alg} and provides an invalid vp_token (not a JWT)`, async () => {
        expect.assertions(2);
        const nonce = randomUUID();

        const client = await createClient(alg);

        const privateKeyHexEncryption = randomPrivateKeySecp256k1();
        const publicKeyEncryption = (
          await getPublicKey(privateKeyHexEncryption)
        ).jwk;

        const payload = {
          nonce,
          claims: {
            encryption_key: publicKeyEncryption,
          },
        };

        const idToken = await new SignJWT(payload)
          .setProtectedHeader({
            alg,
            typ: "JWT",
            kid: client.did,
          })
          .setIssuedAt()
          .setIssuer("https://self-issued.me/v2")
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken, vp_token: "not a JWT" });

        expect(response.body).toStrictEqual({
          title: "Bad Request",
          status: 400,
          detail: '["vp_token must be a jwt string"]',
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });
    }
  );
});
