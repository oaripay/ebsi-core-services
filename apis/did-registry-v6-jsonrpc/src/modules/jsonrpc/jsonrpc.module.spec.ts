import {
  vi,
  describe,
  beforeAll,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { useContainer } from "class-validator";
import {
  calculateJwkThumbprint,
  SignJWT,
  generateKeyPair,
  exportJWK,
} from "jose";
import type { GenerateKeyPairResult, JWK } from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v4";
import { methodNotAllowed } from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { createUser, UserDetails } from "../../../tests/utils/data.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/didRegistry.js";
import type { ApiConfig } from "../../config/configuration.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { InsertDidDocumentSchema } from "./validators/RequestInsertDidDocumentSchema.js";
import type { UpdateBaseDocumentSchema } from "./validators/RequestUpdateBaseDocumentSchema.js";
import type { AddServiceSchema } from "./validators/RequestAddServiceSchema.js";
import type { RevokeServiceSchema } from "./validators/RequestRevokeServiceSchema.js";
import type { AddControllerSchema } from "./validators/RequestAddControllerSchema.js";
import type { RevokeControllerSchema } from "./validators/RequestRevokeControllerSchema.js";
import type { AddVerificationMethodSchema } from "./validators/RequestAddVerificationMethodSchema.js";
import type { AddVerificationRelationshipSchema } from "./validators/RequestAddVerificationRelationshipSchema.js";
import type { RevokeVerificationMethodSchema } from "./validators/RequestRevokeVerificationMethodSchema.js";
import type { ExpireVerificationMethodSchema } from "./validators/RequestExpireVerificationMethodSchema.js";
import type { RollVerificationMethodSchema } from "./validators/RequestRollVerificationMethodSchema.js";
import type { UnsignedTransaction } from "./validators/RequestSendSignedTransactionSchema.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertDidDocumentSchema
  | UpdateBaseDocumentSchema
  | AddServiceSchema
  | RevokeServiceSchema
  | AddControllerSchema
  | RevokeControllerSchema
  | AddVerificationMethodSchema
  | AddVerificationRelationshipSchema
  | RevokeVerificationMethodSchema
  | ExpireVerificationMethodSchema
  | RollVerificationMethodSchema;

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let didRegistryContract: DidRegistry;
  let configService: ConfigService<ApiConfig, true>;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;

  let newUserDidrInviteAccessToken: string;
  let newUserDidrWriteAccessToken: string;
  let existingUserDidrInviteAccessToken: string;
  let existingUserDidrWriteAccessToken: string;

  let newUser: UserDetails;
  let existingUser: UserDetails;
  let existingUser2: UserDetails;

  let publicKeyJwk2: JWK;
  let thumbprint2: string;
  let publicKeyJwk3: JWK;
  let thumbprint3: string;

  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;

  const mockServer = setupServer();

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });

    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocumentsTotal: 2,
    });

    didRegistryContract = testEnv.didRegistryContract;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => didRegistryContract.address,
    );

    // Mock DidRegistry contract
    vi.spyOn(DidRegistry__factory, "connect").mockImplementation(
      () => didRegistryContract,
    );

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    useContainer(app.select(JsonRpcModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();
    server = app.getHttpServer();

    newUser = await createUser();
    existingUser = testEnv.users[0]!;
    existingUser2 = testEnv.users[1]!;

    publicKeyJwk2 = {
      kty: "OKP",
      crv: "Ed25519",
      x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
    };
    thumbprint2 = await calculateJwkThumbprint(publicKeyJwk2);

    publicKeyJwk3 = {
      kty: "EC",
      crv: "P-256",
      x: "yj8gZinbHEvQduwJ-hSAVtA7o1KKCaR8sQ4ISXquPrk",
      y: "1ejY6g2ha6Kyo2ctAkMVXv5IwVOwYVafLMU8SkF2-vw",
    };
    thumbprint3 = await calculateJwkThumbprint(publicKeyJwk3);

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => didRegistryContract,
    );

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    newUserDidrInviteAccessToken = await new SignJWT({
      sub: newUser.did,
      scp: "openid didr_invite",
    })
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    newUserDidrWriteAccessToken = await new SignJWT({
      sub: newUser.did,
      scp: "openid didr_write",
    })
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    existingUserDidrInviteAccessToken = await new SignJWT({
      sub: existingUser.did,
      scp: "openid didr_invite",
    })
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    existingUserDidrWriteAccessToken = await new SignJWT({
      sub: existingUser.did,
      scp: "openid didr_write",
    })
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    // Mock Auth API
    const authorisationApiUrl = configService.get<string>(
      "authorisationApiUrl",
    );

    mockServer.use(
      // Mock Auth API /.well-known/openid-configuration endpoint
      http.get(`${authorisationApiUrl}/.well-known/openid-configuration`, () =>
        HttpResponse.json({ jwks_uri: `${authorisationApiUrl}/jwks` }),
      ),
      // Mock Auth API /jwks endpoint
      http.get(`${authorisationApiUrl}/jwks`, () =>
        HttpResponse.json({
          keys: [{ ...publicKeyJwk, kid: authApiKid }],
        }),
      ),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  describe("Generic tests", () => {
    it("should reject a POST without JWT", async () => {
      expect.assertions(3);

      const response = await request(server).post("/").send();

      expect(response.body).toStrictEqual({
        detail: "Invalid or missing JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid token", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/")
        .auth("very.bad.token.123.abc", { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail:
          "Invalid Authorisation Token: Only JWTs using Compact JWS serialization can be decoded",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid access token", async () => {
      expect.assertions(6);

      const signer = await generateKeyPair("ES256");
      const kid = await calculateJwkThumbprint(
        await exportJWK(signer.publicKey),
      );
      const accessTokenWithInvalidKid = await new SignJWT({
        sub: newUser.did,
        scp: "openid didr_invite",
      })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid,
        })
        .sign(signer.privateKey);

      let response = await request(server)
        .post("/")
        .auth(accessTokenWithInvalidKid, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail:
          "Invalid Access Token. Couldn't find a public key related to the given kid.",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const accessTokenWithInvalidSignature = await new SignJWT({
        sub: newUser.did,
        scp: "openid didr_invite",
      })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid: authApiKid,
        })
        .sign(signer.privateKey);

      response = await request(server)
        .post("/")
        .auth(accessTokenWithInvalidSignature, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Access Token signature validation failed",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw Bad Request for a bad JSON-RPC call", async () => {
      expect.assertions(4);

      let response = await request(server)
        .post("/")
        .auth(newUserDidrInviteAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        error: {
          code: -32600,
          message: "JSON-RPC payload must be an object",
        },
        id: null,
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(400);

      response = await request(server)
        .post("/")
        .auth(newUserDidrInviteAccessToken, { type: "bearer" })
        .send({});

      expect(response.body).toStrictEqual({
        error: {
          code: -32600,
          message: [
            "Invalid 'jsonrpc': Invalid literal value, expected \"2.0\"",
            "Invalid 'method': Required",
            "Invalid 'params': Required",
          ].join("\n"),
        },
        id: null,
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an Invalid Request error for bad method", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/")
        .auth(newUserDidrInviteAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "unknown-method",
          params: [],
          id: 123,
        });

      expect(response.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 123,
        error: {
          code: -32600,
          message: expect.stringContaining(
            "The method 'unknown-method' is invalid",
          ),
        },
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      const now = Math.floor(Date.now() / 1000);
      const notBefore = now;
      const notAfter = now + 300;

      const param1 = {
        from: newUser.wallet.address,
        did: newUser.did,
        baseDocument: JSON.stringify({
          "@context": newUser.didDocument["@context"],
        }),
        vMethodId: newUser.thumbprint,
        publicKey: newUser.wallet.publicKey,
        isSecp256k1: true,
        notBefore,
        notAfter,
      } satisfies InsertDidDocumentSchema;

      const param2 = {
        from: newUser.wallet.address,
        did: newUser.did,
        baseDocument: JSON.stringify({
          "@context": newUser.didDocument["@context"],
        }),
        vMethodId: newUser.thumbprint,
        publicKey: newUser.wallet.publicKey,
        isSecp256k1: true,
        notBefore,
        notAfter: notAfter + 1,
      } satisfies InsertDidDocumentSchema;

      const accessToken = newUserDidrInviteAccessToken;

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param1],
          id: 231,
        });

      expect(responseBuild1.status).toBe(200);
      const transaction1 = responseBuild1.body.result as UnsignedTransaction;

      const responseBuild2: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param2],
          id: 232,
        });

      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const randomSigner = ethers.Wallet.createRandom();
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(transaction1)) as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction2,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx1,
            },
          ],
          id: "45",
        });

      expect(responseSend1.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        error: {
          code: -32600,
          message: expect.stringContaining(
            "does not match with the signedRawTransaction",
          ),
        },
      });
      expect(responseSend1.status).toBe(400);

      // Tampering "from"
      transaction1.from = transaction2.from;

      const responseSend2 = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction1,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx1,
            },
          ],
          id: "46",
        });

      expect(responseSend2.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "46",
        error: {
          code: -32600,
          message: expect.stringContaining(
            "does not match with unsignedTransaction.from",
          ),
        },
      });
      expect(responseSend1.status).toBe(400);
    });

    it("should handle blockchain exception NONCE_EXPIRED", async () => {
      expect.assertions(5);

      // Using test-specific setup in order to avoid conflicts with other
      const testUser = await createUser();
      const now = Math.floor(Date.now() / 1000);
      const notBefore = now;
      const notAfter = now + 300;

      const param = {
        from: testUser.wallet.address,
        did: testUser.did,
        baseDocument: JSON.stringify({
          "@context": testUser.didDocument["@context"],
        }),
        vMethodId: testUser.thumbprint,
        publicKey: testUser.wallet.publicKey,
        isSecp256k1: true,
        notBefore,
        notAfter,
      } satisfies InsertDidDocumentSchema;

      const accessToken = await new SignJWT({
        sub: testUser.did,
        scp: "openid didr_invite",
      })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid: authApiKid,
        })
        .sign(authApiKeyPair.privateKey);

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param],
          id: 231,
        });

      expect(responseBuild.status).toBe(200);
      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      let responseSend = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: "45",
        });

      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // replay same transaction
      responseSend = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: "45",
        });

      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        error: {
          code: -32600,
          message: "nonce has already been used",
        },
      });
      expect(responseSend.status).toBe(400);
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);

      const signer = ethers.Wallet.createRandom();
      const accessToken = newUserDidrInviteAccessToken;
      const now = Math.floor(Date.now() / 1000);
      const param = {
        from: signer.address,
        did: newUser.did,
        baseDocument: JSON.stringify({
          "@context": ["https://www.w3.org/ns/did/v1"],
        }),
        vMethodId: newUser.thumbprint,
        publicKey: newUser.wallet.publicKey,
        isSecp256k1: true,
        notBefore: now,
        notAfter: now + 3600,
      } satisfies InsertDidDocumentSchema;

      const responseBuild = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param],
          // no id defined
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: null,
        result: expect.objectContaining({}),
      });
      expect(responseBuild.status).toBe(200);
    });

    it("should throw an error if the from attribute is not a valid Ethereum address", async () => {
      expect.assertions(2);

      const accessToken = newUserDidrInviteAccessToken;
      const now = Math.floor(Date.now() / 1000);
      const param = {
        from: "0x123",
        did: newUser.did,
        baseDocument: JSON.stringify({
          "@context": ["https://www.w3.org/ns/did/v1"],
        }),
        vMethodId: newUser.thumbprint,
        publicKey: newUser.wallet.publicKey,
        isSecp256k1: true,
        notBefore: now,
        notAfter: now + 3600,
      } satisfies InsertDidDocumentSchema;

      const responseBuild = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param],
          id: 123,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 123,
        error: {
          code: -32600,
          message: "Invalid 'params.0.from': Invalid Ethereum address",
        },
      });
      expect(responseBuild.status).toBe(400);
    });
  });

  // Tests to be repeated for every method
  describe.each([
    "insertDidDocument",
    "updateBaseDocument",
    "addController",
    "revokeController",
    "addVerificationMethod",
    "addVerificationRelationship",
    "expireVerificationMethod",
    "revokeVerificationMethod",
    "rollVerificationMethod",
    "addService",
    "revokeService",
  ] as const)("/ with method %s", (method) => {
    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      let param: JsonRpcParams;
      const accessToken =
        method === "insertDidDocument"
          ? newUserDidrInviteAccessToken
          : existingUserDidrWriteAccessToken;

      const signer = ethers.Wallet.createRandom();

      const now = Math.floor(Date.now() / 1000);

      switch (method) {
        case "insertDidDocument": {
          param = {
            from: signer.address,
            did: newUser.did,
            baseDocument: JSON.stringify({
              "@context": ["https://www.w3.org/ns/did/v1"],
            }),
            vMethodId: newUser.thumbprint,
            publicKey: newUser.wallet.publicKey,
            isSecp256k1: true,
            notBefore: now,
            notAfter: now + 3600,
          } satisfies InsertDidDocumentSchema;
          break;
        }
        case "updateBaseDocument": {
          param = {
            from: signer.address,
            did: existingUser.did,
            baseDocument: JSON.stringify({
              "@context": existingUser.didDocument["@context"],
            }),
          } satisfies UpdateBaseDocumentSchema;
          break;
        }
        case "addService": {
          param = {
            from: signer.address,
            did: existingUser.did,
            service: JSON.stringify({
              id: "1",
              type: "CredentialRegistry",
              serviceEndpoint: {
                registries: [
                  "https://registry.example.com/{credentialSubject.id}",
                  "https://identity.foundation/vcs/{credentialSubject.id}",
                ],
                byId: "/vc/{id}",
                byType: "/type/{type}",
              },
            }),
          } satisfies AddServiceSchema;
          break;
        }
        case "revokeService": {
          param = {
            from: signer.address,
            did: existingUser.did,
            serviceId: "1",
          } satisfies RevokeServiceSchema;
          break;
        }
        case "addController": {
          param = {
            from: signer.address,
            did: existingUser.did,
            controller: existingUser2.did,
          } satisfies AddControllerSchema;

          break;
        }
        case "revokeController": {
          param = {
            from: signer.address,
            did: existingUser.did,
            controller: existingUser2.did,
          } satisfies RevokeControllerSchema;
          break;
        }
        case "addVerificationMethod": {
          param = {
            from: signer.address,
            did: existingUser.did,
            vMethodId: thumbprint2,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk2)).toString(
              "hex",
            )}`,
            isSecp256k1: false,
          } satisfies AddVerificationMethodSchema;
          break;
        }
        case "addVerificationRelationship": {
          param = {
            from: signer.address,
            did: existingUser.did,
            name: "capabilityDelegation",
            vMethodId: existingUser.thumbprint,
            notBefore: now,
            notAfter: now + 3600,
          } satisfies AddVerificationRelationshipSchema;
          break;
        }
        case "expireVerificationMethod": {
          param = {
            from: signer.address,
            did: existingUser.did,
            vMethodId: thumbprint2,
            notAfter: now + 600,
          } satisfies ExpireVerificationMethodSchema;
          break;
        }
        case "revokeVerificationMethod": {
          param = {
            from: signer.address,
            did: existingUser.did,
            vMethodId: thumbprint2,
            notAfter: now - 600,
          } satisfies RevokeVerificationMethodSchema;
          break;
        }
        case "rollVerificationMethod": {
          param = {
            from: signer.address,
            args: {
              did: existingUser.did,
              vMethodId: thumbprint3,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk3),
              ).toString("hex")}`,
              isSecp256k1: false,
              notBefore: now,
              notAfter: now + 3600,
              oldVMethodId: thumbprint2,
              duration: 360,
            },
          } satisfies RollVerificationMethodSchema;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method as string}`);
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String),
          data: expect.any(String),
          from: param.from,
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: "0x0",
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: "45",
        });

      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);
    });

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      const signer = ethers.Wallet.createRandom();

      const testSetup: {
        params: JsonRpcParams;
        expectedErrorMessage: string;
        accessToken: string;
      }[] = [];

      const now = Math.floor(Date.now() / 1000);

      switch (method) {
        case "insertDidDocument": {
          // Invalid access token (not the right sub)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Access token sub doesn't match the DID from the payload",
            accessToken: existingUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.did': Unsupported version \"2\"",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({}),
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.baseDocument': '@context' attribute is missing",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({ "@context": [] }),
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.baseDocument': '@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
                // authentication can not be in the base document
                authentication: [],
              }),
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.baseDocument': attribute 'authentication' is not allowed",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
                // controller and verificationMethod can not be in the base document
                controller: "",
                verificationMethod: [],
              }),
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.baseDocument': attributes 'controller', 'verificationMethod' are not allowed",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              vMethodId: newUser.thumbprint,
              publicKey: `0x${crypto.randomBytes(35).toString("hex")}`,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.publicKey': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
            accessToken: newUserDidrInviteAccessToken,
          });

          const publicKeyJwk = {
            kty: "OKP",
            crv: "Ed25519",
            x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
          };
          const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

          testSetup.push({
            // @ts-expect-error - isSecp256k1 should be true
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              vMethodId: thumbprint,
              publicKey: Buffer.from(JSON.stringify(publicKeyJwk)).toString(
                "hex",
              ),
              isSecp256k1: false,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.isSecp256k1': Invalid literal value, expected true",
            accessToken: newUserDidrInviteAccessToken,
          });

          break;
        }
        case "updateBaseDocument": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
            } satisfies UpdateBaseDocumentSchema,
            expectedErrorMessage:
              "'updateBaseDocument' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: "{}",
            } satisfies UpdateBaseDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.baseDocument': '@context' attribute is missing",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              // authentication can not be in the base document
              baseDocument: '{"@context":[],"authentication":[]}',
            } satisfies UpdateBaseDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.baseDocument': '@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "addController": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              controller: existingUser.did,
            } satisfies AddControllerSchema,
            expectedErrorMessage:
              "'addController' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              controller: existingUser.did,
            } satisfies AddControllerSchema,
            expectedErrorMessage:
              "Invalid 'params.0.did': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              controller:
                "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
            } satisfies AddControllerSchema,
            expectedErrorMessage:
              "Invalid 'params.0.controller': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "revokeController": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              controller: existingUser.did,
            } satisfies RevokeControllerSchema,
            expectedErrorMessage:
              "'revokeController' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              controller: existingUser.did,
            } satisfies RevokeControllerSchema,
            expectedErrorMessage:
              "Invalid 'params.0.did': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              controller:
                "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
            } satisfies RevokeControllerSchema,
            expectedErrorMessage:
              "Invalid 'params.0.controller': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "addService": {
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              service: JSON.stringify({}),
            } satisfies AddServiceSchema,
            expectedErrorMessage:
              "Invalid 'params.0.service.id': Required\nInvalid 'params.0.service.type': Invalid input\nInvalid 'params.0.service.serviceEndpoint': Invalid input",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "revokeService": {
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              serviceId: "1",
            } satisfies RevokeServiceSchema,
            expectedErrorMessage:
              "'updateBaseDocument' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });
          break;
        }
        case "addVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: thumbprint2,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk2),
              ).toString("hex")}`,
              isSecp256k1: false,
            } satisfies AddVerificationMethodSchema,
            expectedErrorMessage:
              "'addVerificationMethod' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          const publicKeyJwk = {
            kty: "OKP",
            crv: "Ed25519",
            x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
          };
          const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: "bad vMethodId",
              publicKey: Buffer.from(JSON.stringify(publicKeyJwk)).toString(
                "hex",
              ),
              isSecp256k1: false,
            } satisfies AddVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.publicKey': The public key must be an hexadecimal string prefixed with 0x",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: thumbprint,
              publicKey: "0x32313029",
              isSecp256k1: false,
            } satisfies AddVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.publicKey': The public key must be valid JSON object",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "addVerificationRelationship": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              name: "assertionMethod",
              vMethodId: newUser.thumbprint,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies AddVerificationRelationshipSchema,
            expectedErrorMessage:
              "'addVerificationRelationship' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              name: "assertionMethod",
              vMethodId: newUser.thumbprint,
              notBefore: now,
              notAfter: now + 3600,
            } satisfies AddVerificationRelationshipSchema,
            expectedErrorMessage:
              "Invalid 'params.0.did': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              name: "assertionMethod",
              vMethodId: newUser.thumbprint,
              notBefore: now,
              notAfter: -10,
            } satisfies AddVerificationRelationshipSchema,
            expectedErrorMessage:
              "Invalid 'params.0.notAfter': Number must be greater than or equal to 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            // @ts-expect-error - `name: "bad-name` is invalid
            params: {
              from: signer.address,
              did: newUser.did,
              name: "bad-name",
              vMethodId: newUser.thumbprint,
              notBefore: now,
              notAfter: now + 3600,
            } as AddVerificationRelationshipSchema,
            expectedErrorMessage:
              "Invalid 'params.0.name': Invalid enum value. Expected 'authentication' | 'assertionMethod' | 'keyAgreement' | 'capabilityInvocation' | 'capabilityDelegation', received 'bad-name'",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "expireVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: thumbprint2,
              notAfter: now + 600,
            } satisfies ExpireVerificationMethodSchema,
            expectedErrorMessage:
              "'expireVerificationMethod' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: newUser.thumbprint,
              notAfter: -10,
            } satisfies ExpireVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.notAfter': Number must be greater than or equal to 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              vMethodId: newUser.thumbprint,
              notAfter: now + 600,
            } satisfies ExpireVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.did': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "revokeVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: thumbprint2,
              notAfter: now - 600,
            } satisfies RevokeVerificationMethodSchema,
            expectedErrorMessage:
              "'revokeVerificationMethod' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: newUser.thumbprint,
              notAfter: -10,
            } satisfies RevokeVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.notAfter': Number must be greater than or equal to 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              vMethodId: newUser.thumbprint,
              notAfter: now - 600,
            } satisfies RevokeVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.did': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "rollVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              args: {
                did: newUser.did,
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3),
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: now,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } satisfies RollVerificationMethodSchema,
            expectedErrorMessage:
              "'rollVerificationMethod' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              args: {
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3),
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: now,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } satisfies RollVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.args.did': Unsupported version \"2\"",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              args: {
                did: newUser.did,
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3),
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: -10,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } satisfies RollVerificationMethodSchema,
            expectedErrorMessage:
              "Invalid 'params.0.args.notBefore': Number must be greater than or equal to 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method as string}`);
        }
      }

      expect.assertions(testSetup.length * 2);

      // Run requests sequentially
      // eslint-disable-next-line no-restricted-syntax
      for (const setup of testSetup) {
        // eslint-disable-next-line no-await-in-loop
        const response = await request(server)
          .post("/")
          .auth(setup.accessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [setup.params],
            id: 231,
          });

        expect(response.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: expect.stringContaining(setup.expectedErrorMessage),
          },
        });
        expect(response.status).toBe(400);
      }
    });
  });
});
