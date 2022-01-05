import crypto, { randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import request from "supertest";
import { SignJWT, importJWK, exportJWK, jwtVerify } from "jose";
import {
  Session,
  Agent,
  InvalidTokenError,
  InvalidAppError,
} from "@cef-ebsi/oauth2-auth";
import type { Ake1SigPayload, AkeResponse } from "@cef-ebsi/oauth2-auth";
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
import didJwt from "did-jwt";
import type { DIDDocument } from "did-resolver";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import { base64url } from "multiformats/bases/base64";
import vpLib from "@cef-ebsi/verifiable-presentation";
import { AuthorisationModule } from "./authorisation.module";
import type { AuthenticationRequestResponse } from "./authorisation.interface";
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

jest.mock("@cef-ebsi/verifiable-presentation", () => ({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ...jest.requireActual("@cef-ebsi/verifiable-presentation"),
  validatePresentation: jest.fn(),
}));

async function generateApp(apiPrivateKey: string) {
  const { privateKey, publicKey } = await generateKeys("ES256K");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  });

  const privateKeyHex = await getPrivateKeyHex(privateKey);
  const publicKeyPemBase64 = Buffer.from(publicKeyPem).toString("base64");
  const apiTarId = `0x${crypto.randomBytes(32).toString("hex")}`;
  const name = `test-${crypto.randomBytes(3).toString("hex")}`;
  const kid = `${apiPrivateKey}/${apiTarId}`;

  return {
    name,
    apiTarId,
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
  let configService: ConfigService<ApiConfig>;
  let apiPrivateKey: string;
  let apiDid: string;

  const mockOauth2 = {
    verifyAuthenticationRequest: jest.spyOn(
      Session.prototype,
      "verifyAuthenticationRequest"
    ),
    createAccessToken: jest.spyOn(Session.prototype, "createAccessToken"),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthorisationModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    apiPrivateKey = configService.get("apiPrivateKey");
    apiDid = configService.get("apiDid");
  });

  beforeEach(() => {
    // mock axios
    jest
      .spyOn(axios, "get")
      .mockImplementation(
        async (): Promise<unknown> =>
          Promise.reject(new Error("Forgot to implement mock for axios get?"))
      );

    // mock library
    mockOauth2.verifyAuthenticationRequest.mockImplementation(
      async (): Promise<crypto.KeyObject> =>
        Promise.reject(
          new Error(
            "Forgot to implement the mock for verifyAuthenticationRequest?"
          )
        )
    );

    mockOauth2.createAccessToken.mockImplementation(
      async (): Promise<AkeResponse> =>
        Promise.reject(
          new Error("Forgot to implement the mock for createAccessToken?")
        )
    );
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
        (response.body as AuthenticationRequestResponse).uri.replace(
          "openid://?",
          ""
        )
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
          "/authorisation/v1/siop-sessions"
        ) as string,
        response_mode: "post",
        iss: configService.get<string>("apiDid"),
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
      expect.assertions(6);

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

      const agent = new Agent(trustedApp.privateKeyHex, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const nonce = randomUUID();
      const authRequest = await agent.createRequestPayload("storage-api", {
        nonce,
      });

      jest
        .spyOn(Session.prototype, "verifyAuthenticationRequest")
        .mockImplementation(
          async (): Promise<crypto.KeyObject> =>
            Promise.reject(new InvalidTokenError("mock invalid token"))
        );

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);
      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: "mock invalid token",
        type: "about:blank",
      });
      expect(response.status).toBe(400);

      jest
        .spyOn(Session.prototype, "verifyAuthenticationRequest")
        .mockImplementation(
          async (): Promise<crypto.KeyObject> =>
            Promise.reject(new InvalidAppError("mock invalid app"))
        );

      response = await request(server)
        .post("/oauth2-sessions")
        .send(authRequest);
      expect(response.body).toStrictEqual({
        title: "Invalid Client Assertion",
        status: 400,
        detail: "mock invalid app",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should create an OAuth2 session", async () => {
      expect.assertions(1);

      const trustedApp = await generateApp(apiPrivateKey);

      const agent = new Agent(trustedApp.privateKeyHex, {
        issuer: trustedApp.name,
        kid: trustedApp.kid,
      });

      const nonce = randomUUID();
      const authRequest = await agent.createRequestPayload("storage-api", {
        nonce,
      });

      jest
        .spyOn(Session.prototype, "verifyAuthenticationRequest")
        .mockImplementation(
          async (): Promise<crypto.KeyObject> =>
            Promise.resolve(trustedApp.publicKey)
        );

      const spy = jest
        .spyOn(Session.prototype, "createAccessToken")
        .mockImplementation(
          async (): Promise<AkeResponse> => Promise.resolve(null as AkeResponse)
        );

      await request(server).post("/oauth2-sessions").send(authRequest);

      expect(spy).toHaveBeenCalledWith(authRequest, trustedApp.publicKey);
    });
  });

  describe.each(["ES256K", "ES256", "RS256", "EdDSA"])(
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
          sub_did_verification_method_uri: "https://self-issued.me",
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
          detail:
            alg === "ES256K"
              ? "The Response Token Issuer Claim (iss) MUST contain https://self-issued.me."
              : (expect.stringContaining(
                  `"iss" must be [https://self-issued.me]`
                ) as string),
          type: "about:blank",
        });
        expect(response.status).toBe(400);

        payload = {
          sub_did_verification_method_uri: "https://self-issued.me",
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
          .setIssuer("https://self-issued.me")
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
          detail:
            alg === "ES256K"
              ? "No nonce found in JWT payload."
              : (expect.stringContaining(
                  "without its required peers [nonce]"
                ) as string),
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
        if (alg === "ES256K") {
          jest
            .spyOn(didJwt, "verifyJWT")
            .mockRejectedValue(
              new Error(
                `resolver_error: Unable to resolve DID document for ${clientDid}: notFound, registry used: xxx`
              )
            );
        } else {
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
        }

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual(
          alg === "ES256K"
            ? {
                title: "Invalid ID Token",
                status: 400,
                detail: "The DID Document can't be found.",
                type: "about:blank",
              }
            : {
                title: "Not Found",
                status: 404,
                detail: "not found",
                type: "about:blank",
              }
        );
        expect(response.status).toBe(alg === "ES256K" ? 400 : 404);
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
        if (alg === "ES256K") {
          jest
            .spyOn(didJwt, "verifyJWT")
            .mockRejectedValue(
              new Error(
                `resolver_error: Unable to resolve DID document for ${clientDid}: internalServorError, registry used: xxx`
              )
            );
        } else {
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
        }

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });

        expect(response.body).toStrictEqual(
          alg === "ES256K"
            ? {
                title: "Internal Server Error",
                status: 500,
                detail: "Internal DID Registry error.",
                type: "about:blank",
              }
            : {
                title: "Internal Server Error",
                status: 500,
                type: "about:blank",
              }
        );
        expect(response.status).toBe(500);
      });

      it(`should create a siop session for a user that uses alg ${alg}`, async () => {
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
            iss: apiDid,
          }) as Ake1SigPayload,
          did: apiDid,
        });
        expect(response.status).toBe(200);
      });

      it(`should create a siop session for a user that uses alg ${alg} and presents a vp`, async () => {
        expect.assertions(2);
        const nonce = randomUUID();

        const client = await createTestClient();
        const clientPrivateKeys = client.keys;
        const keyObject = await getKeyByAlg(clientPrivateKeys, alg);

        const mockedVerifiablePresentation = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: "VerifiablePresentation",
          holder: client.did,
          verifiableCredential: [
            {
              id: "vc:ebsi:authentication#b744b528-af68-43b0-b269-ec291f421aa8",
              issuer: configService.get<ApiConfig["onboardingAllowlist"]>(
                "onboardingAllowlist"
              )[0],
              validFrom: "2021-05-18T15:00:42Z",
              credentialSubject: {
                id: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
              },
              credentialSchema: {
                id: "https://api.test.intebsi.xyz/trusted-schemas-registry/v1/schemas/0x312e332e362e312e342e312e313338312e332e31322e332e322e332e3738",
                type: "OID",
              },
              issuanceDate: "2021-05-18T15:00:42Z",
              expirationDate: "2021-11-16T15:00:42Z",
              "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://www.w3.org/2018/credentials/examples/v1",
                "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json",
              ],
              type: ["VerifiableCredential", "VerifiableAuthorisation"],
              proof: {
                type: "EcdsaSecp256k1Signature2019",
                created: "2021-05-18T15:00:42Z",
                proofPurpose: "assertionMethod",
                verificationMethod: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#keys-1",
                jws: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ..8NLRMISHCKmScoRFZwd7G3Nj5CaOhoH5qTJHkkNV-WQ1cRjITR-USQcmi_qKOr5H4T1jEeGwEYgG5BnmyfPXMA",
              },
            },
          ],
          proof: {
            type: "EcdsaSecp256k1Signature2019",
            created: "2021-05-18T16:30:01Z",
            proofPurpose: "authentication",
            verificationMethod: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#keys-1",
            jws: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpYXQiOjE2MjEzNTU0MDEsIkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOiJWZXJpZmlhYmxlUHJlc2VudGF0aW9uIiwidmVyaWZpYWJsZUNyZWRlbnRpYWwiOlt7ImlkIjoidmM6ZWJzaTphdXRoZW50aWNhdGlvbiNiNzQ0YjUyOC1hZjY4LTQzYjAtYjI2OS1lYzI5MWY0MjFhYTgiLCJpc3N1ZXIiOiJkaWQ6ZWJzaTo2UVlKYzN0TFJoZXk4OFdQS0Mya3Y1ODh2MXVaMW9pZDN5ZmM1THA1QWJZRCIsInZhbGlkRnJvbSI6IjIwMjEtMDUtMThUMTU6MDA6NDJaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTpBYUVrbjczc2VjRk1VVFNnNHZUTGtoWDc5a0pFOG9hQUs3NDhUb1M4WXM5ZSJ9LCJjcmVkZW50aWFsU2NoZW1hIjp7ImlkIjoiaHR0cHM6Ly9hcGkudGVzdC5pbnRlYnNpLnh5ei90cnVzdGVkLXNjaGVtYXMtcmVnaXN0cnkvdjEvc2NoZW1hcy8weDMxMmUzMzJlMzYyZTMxMmUzNDJlMzEyZTMxMzMzODMxMmUzMzJlMzEzMjJlMzMyZTMyMmUzMzJlMzczOCIsInR5cGUiOiJPSUQifSwiaXNzdWFuY2VEYXRlIjoiMjAyMS0wNS0xOFQxNTowMDo0MloiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjEtMTEtMTZUMTU6MDA6NDJaIiwiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy9leGFtcGxlcy92MSIsImh0dHBzOi8vdzNjLWNjZy5naXRodWIuaW8vbGRzLWp3czIwMjAvY29udGV4dHMvbGRzLWp3czIwMjAtdjEuanNvbiJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb24iXSwicHJvb2YiOnsidHlwZSI6IkVjZHNhU2VjcDI1NmsxU2lnbmF0dXJlMjAxOSIsImNyZWF0ZWQiOiIyMDIxLTA1LTE4VDE1OjAwOjQyWiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplYnNpOkFhRWtuNzNzZWNGTVVUU2c0dlRMa2hYNzlrSkU4b2FBSzc0OFRvUzhZczllI2tleXMtMSIsImp3cyI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSkZVekkxTmtzaWZRLi44TkxSTUlTSENLbVNjb1JGWndkN0czTmo1Q2FPaG9INXFUSkhra05WLVdRMWNSaklUUi1VU1FjbWlfcUtPcjVINFQxakVlR3dFWWdHNUJubXlmUFhNQSJ9fV0sImlzcyI6ImRpZDplYnNpOkFhRWtuNzNzZWNGTVVUU2c0dlRMa2hYNzlrSkU4b2FBSzc0OFRvUzhZczllIn0.qt_-j_XDhPAbMyjyAONPLEx-2SEEaLv6uh5ky1m1DyWvsr_GxyhJ9PMVZekXR6td-nkPGk7uuqA2KLCKQTgMEQ",
          },
        };

        const payload = {
          sub: client.did,
          sub_jwk: {},
          sub_did_verification_method_uri: keyObject.id,
          nonce,
          claims: {
            verified_claims: base64url.baseEncode(
              Buffer.from(JSON.stringify(mockedVerifiablePresentation))
            ),
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
          .spyOn(vpLib, "validatePresentation")
          .mockImplementation(async () => Promise.resolve());

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
            iss: apiDid,
          }) as Ake1SigPayload,
          did: apiDid,
        });
        expect(response.status).toBe(200);
      });

      it(`should throw bad request error when creating a siop session for a user that uses alg ${alg} and provides an invalid id_token: uncoded verified_claims string`, async () => {
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
            verified_claims: "uncoded string",
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
          .setIssuer("https://self-issued.me")
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });
        expect(response.body).toStrictEqual({
          title: "Uncoded Verifiable Presentation",
          status: 400,
          detail: `"value" must be a valid base64 string`,
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });

      it(`should throw bad request error when creating a siop session for a user that uses alg ${alg} and provides an invalid id_token: verified_claim contains an object`, async () => {
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
            verified_claims: {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              type: "VerifiablePresentation",
              holder: client.did,
              verifiableCredential: [
                {
                  id: "vc:ebsi:authentication#b744b528-af68-43b0-b269-ec291f421aa8",
                  issuer: configService.get<ApiConfig["onboardingAllowlist"]>(
                    "onboardingAllowlist"
                  )[0],
                  validFrom: "2021-05-18T15:00:42Z",
                  credentialSubject: {
                    id: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj",
                  },
                  credentialSchema: {
                    id: "https://api.test.intebsi.xyz/trusted-schemas-registry/v1/schemas/0x312e332e362e312e342e312e313338312e332e31322e332e322e332e3738",
                    type: "OID",
                  },
                  issuanceDate: "2021-05-18T15:00:42Z",
                  expirationDate: "2021-11-16T15:00:42Z",
                  "@context": [
                    "https://www.w3.org/2018/credentials/v1",
                    "https://www.w3.org/2018/credentials/examples/v1",
                    "https://w3c-ccg.github.io/lds-jws2020/contexts/lds-jws2020-v1.json",
                  ],
                  type: ["VerifiableCredential", "VerifiableAuthorisation"],
                  proof: {
                    type: "EcdsaSecp256k1Signature2019",
                    created: "2021-05-18T15:00:42Z",
                    proofPurpose: "assertionMethod",
                    verificationMethod:
                      "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#keys-1",
                    jws: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ..8NLRMISHCKmScoRFZwd7G3Nj5CaOhoH5qTJHkkNV-WQ1cRjITR-USQcmi_qKOr5H4T1jEeGwEYgG5BnmyfPXMA",
                  },
                },
              ],
              proof: {
                type: "EcdsaSecp256k1Signature2019",
                created: "2021-05-18T16:30:01Z",
                proofPurpose: "authentication",
                verificationMethod: "did:ebsi:zub5ZZUfHLLptCduwEy8xRj#keys-1",
                jws: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NksifQ.eyJpYXQiOjE2MjEzNTU0MDEsIkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOiJWZXJpZmlhYmxlUHJlc2VudGF0aW9uIiwidmVyaWZpYWJsZUNyZWRlbnRpYWwiOlt7ImlkIjoidmM6ZWJzaTphdXRoZW50aWNhdGlvbiNiNzQ0YjUyOC1hZjY4LTQzYjAtYjI2OS1lYzI5MWY0MjFhYTgiLCJpc3N1ZXIiOiJkaWQ6ZWJzaTo2UVlKYzN0TFJoZXk4OFdQS0Mya3Y1ODh2MXVaMW9pZDN5ZmM1THA1QWJZRCIsInZhbGlkRnJvbSI6IjIwMjEtMDUtMThUMTU6MDA6NDJaIiwiY3JlZGVudGlhbFN1YmplY3QiOnsiaWQiOiJkaWQ6ZWJzaTpBYUVrbjczc2VjRk1VVFNnNHZUTGtoWDc5a0pFOG9hQUs3NDhUb1M4WXM5ZSJ9LCJjcmVkZW50aWFsU2NoZW1hIjp7ImlkIjoiaHR0cHM6Ly9hcGkudGVzdC5pbnRlYnNpLnh5ei90cnVzdGVkLXNjaGVtYXMtcmVnaXN0cnkvdjEvc2NoZW1hcy8weDMxMmUzMzJlMzYyZTMxMmUzNDJlMzEyZTMxMzMzODMxMmUzMzJlMzEzMjJlMzMyZTMyMmUzMzJlMzczOCIsInR5cGUiOiJPSUQifSwiaXNzdWFuY2VEYXRlIjoiMjAyMS0wNS0xOFQxNTowMDo0MloiLCJleHBpcmF0aW9uRGF0ZSI6IjIwMjEtMTEtMTZUMTU6MDA6NDJaIiwiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy9leGFtcGxlcy92MSIsImh0dHBzOi8vdzNjLWNjZy5naXRodWIuaW8vbGRzLWp3czIwMjAvY29udGV4dHMvbGRzLWp3czIwMjAtdjEuanNvbiJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiVmVyaWZpYWJsZUF1dGhvcmlzYXRpb24iXSwicHJvb2YiOnsidHlwZSI6IkVjZHNhU2VjcDI1NmsxU2lnbmF0dXJlMjAxOSIsImNyZWF0ZWQiOiIyMDIxLTA1LTE4VDE1OjAwOjQyWiIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDplYnNpOkFhRWtuNzNzZWNGTVVUU2c0dlRMa2hYNzlrSkU4b2FBSzc0OFRvUzhZczllI2tleXMtMSIsImp3cyI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSkZVekkxTmtzaWZRLi44TkxSTUlTSENLbVNjb1JGWndkN0czTmo1Q2FPaG9INXFUSkhra05WLVdRMWNSaklUUi1VU1FjbWlfcUtPcjVINFQxakVlR3dFWWdHNUJubXlmUFhNQSJ9fV0sImlzcyI6ImRpZDplYnNpOkFhRWtuNzNzZWNGTVVUU2c0dlRMa2hYNzlrSkU4b2FBSzc0OFRvUzhZczllIn0.qt_-j_XDhPAbMyjyAONPLEx-2SEEaLv6uh5ky1m1DyWvsr_GxyhJ9PMVZekXR6td-nkPGk7uuqA2KLCKQTgMEQ",
              },
            },
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
          .setIssuer("https://self-issued.me")
          .setAudience("storage-api")
          .setExpirationTime("15s")
          .sign(client.privateKey);

        const response = await request(server)
          .post("/siop-sessions")
          .set("Content-Type", "application/x-www-form-urlencoded")
          .send({ id_token: idToken });
        expect(response.body).toStrictEqual({
          title: "Uncoded Verifiable Presentation",
          status: 400,
          detail: expect.any(String) as string,
          type: "about:blank",
        });
        expect(response.status).toBe(400);
      });
    }
  );
});
