import type { RawServerDefault } from "fastify";
import type { GenerateKeyPairResult, JWK } from "jose";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v4";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { useContainer } from "class-validator";
import { ethers } from "ethers";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import crypto from "node:crypto";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { ApiConfig } from "../../config/configuration.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import type { AddControllerSchema } from "./validators/RequestAddControllerSchema.js";
import type { AddServiceSchema } from "./validators/RequestAddServiceSchema.js";
import type { AddVerificationMethodSchema } from "./validators/RequestAddVerificationMethodSchema.js";
import type { AddVerificationRelationshipSchema } from "./validators/RequestAddVerificationRelationshipSchema.js";
import type { ExpireVerificationMethodSchema } from "./validators/RequestExpireVerificationMethodSchema.js";
import type { InsertDidDocumentSchema } from "./validators/RequestInsertDidDocumentSchema.js";
import type { RevokeControllerSchema } from "./validators/RequestRevokeControllerSchema.js";
import type { RevokeServiceSchema } from "./validators/RequestRevokeServiceSchema.js";
import type { RevokeVerificationMethodSchema } from "./validators/RequestRevokeVerificationMethodSchema.js";
import type { RollVerificationMethodSchema } from "./validators/RequestRollVerificationMethodSchema.js";
import type { UnsignedTransaction } from "./validators/RequestSendSignedTransactionSchema.js";
import type { UpdateBaseDocumentSchema } from "./validators/RequestUpdateBaseDocumentSchema.js";

import { createUser, UserDetails } from "../../../tests/utils/data.js";
import { setupTestEnv } from "../../../tests/utils/didRegistry.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";

type JsonRpcParams =
  | AddControllerSchema
  | AddServiceSchema
  | AddVerificationMethodSchema
  | AddVerificationRelationshipSchema
  | ExpireVerificationMethodSchema
  | InsertDidDocumentSchema
  | RevokeControllerSchema
  | RevokeServiceSchema
  | RevokeVerificationMethodSchema
  | RollVerificationMethodSchema
  | UpdateBaseDocumentSchema;

interface SupertestJsonRpcResponse {
  body: JsonRpcResponseObject;
  status: number;
}

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

        print.error();
      },
    });

    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocumentsTotal: 2,
    });

    didRegistryContract = testEnv.didRegistryContract;

    const didRegistryContractAddress = await didRegistryContract.getAddress();
    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => didRegistryContractAddress,
    );

    // Mock DidRegistry contract
    vi.spyOn(DidRegistry__factory, "connect").mockImplementation(
      () => didRegistryContract,
    );

    // Start server
    const moduleFixture = await Test.createTestingModule({
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
      crv: "Ed25519",
      kty: "OKP",
      x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
    };
    thumbprint2 = await calculateJwkThumbprint(publicKeyJwk2);

    publicKeyJwk3 = {
      crv: "P-256",
      kty: "EC",
      x: "yj8gZinbHEvQduwJ-hSAVtA7o1KKCaR8sQ4ISXquPrk",
      y: "1ejY6g2ha6Kyo2ctAkMVXv5IwVOwYVafLMU8SkF2-vw",
    };
    thumbprint3 = await calculateJwkThumbprint(publicKeyJwk3);

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => didRegistryContract,
    );
    vi.spyOn(ledgerService, "getEthersProvider").mockImplementation(
      // @ts-expect-error Error due to a mismatch between ESM and CommonJS modules
      () => testEnv.provider,
    );

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    newUserDidrInviteAccessToken = await new SignJWT({
      scp: "openid didr_invite",
      sub: newUser.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    newUserDidrWriteAccessToken = await new SignJWT({
      scp: "openid didr_write",
      sub: newUser.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    existingUserDidrInviteAccessToken = await new SignJWT({
      scp: "openid didr_invite",
      sub: existingUser.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    existingUserDidrWriteAccessToken = await new SignJWT({
      scp: "openid didr_write",
      sub: existingUser.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
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
        scp: "openid didr_invite",
        sub: newUser.did,
      })
        .setProtectedHeader({
          alg: "ES256",
          kid,
          typ: "JWT",
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
        scp: "openid didr_invite",
        sub: newUser.did,
      })
        .setProtectedHeader({
          alg: "ES256",
          kid: authApiKid,
          typ: "JWT",
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
          code: -32_600,
          message: "JSON-RPC payload must be an object",
        },
        // eslint-disable-next-line unicorn/no-null
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
          code: -32_600,
          message: [
            "Invalid 'jsonrpc': Invalid literal value, expected \"2.0\"",
            "Invalid 'method': Required",
            "Invalid 'params': Required",
          ].join("\n"),
        },
        // eslint-disable-next-line unicorn/no-null
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
          id: 123,
          jsonrpc: "2.0",
          method: "unknown-method",
          params: [],
        });

      expect(response.body).toStrictEqual({
        error: {
          code: -32_600,
          message: expect.stringContaining(
            "The method 'unknown-method' is invalid",
          ),
        },
        id: 123,
        jsonrpc: "2.0",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      const now = Math.floor(Date.now() / 1000);
      const notBefore = now;
      const notAfter = now + 300;

      const param1 = {
        baseDocument: JSON.stringify({
          "@context": newUser.didDocument["@context"],
        }),
        did: newUser.did,
        from: newUser.wallet.address,
        isSecp256k1: true,
        notAfter,
        notBefore,
        publicKey: newUser.wallet.signingKey.publicKey,
        vMethodId: newUser.thumbprint,
      } satisfies InsertDidDocumentSchema;

      const param2 = {
        baseDocument: JSON.stringify({
          "@context": newUser.didDocument["@context"],
        }),
        did: newUser.did,
        from: newUser.wallet.address,
        isSecp256k1: true,
        notAfter: notAfter + 1,
        notBefore,
        publicKey: newUser.wallet.signingKey.publicKey,
        vMethodId: newUser.thumbprint,
      } satisfies InsertDidDocumentSchema;

      const accessToken = newUserDidrInviteAccessToken;

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: 231,
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param1],
        });

      expect(responseBuild1.status).toBe(200);
      const transaction1 = responseBuild1.body.result as UnsignedTransaction;

      const responseBuild2: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: 232,
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param2],
        });

      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const randomSigner = ethers.Wallet.createRandom();
      const uTx = formatEthersUnsignedTransaction(
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(JSON.stringify(transaction1)) as UnsignedTransaction,
      );

      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const signature = ethers.Transaction.from(sgnTx1).signature;
      if (!signature) {
        throw new Error("Signature not found");
      }
      const { r, s, v } = signature;

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: "45",
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              r,
              s,
              signedRawTransaction: sgnTx1,
              unsignedTransaction: transaction2,
              v: `0x${v.toString(16)}`,
            },
          ],
        });

      expect(responseSend1.body).toStrictEqual({
        error: {
          code: -32_600,
          message: expect.stringContaining(
            "does not match with the signedRawTransaction",
          ),
        },
        id: "45",
        jsonrpc: "2.0",
      });
      expect(responseSend1.status).toBe(400);

      // Tampering "from"
      transaction1.from = transaction2.from;

      const responseSend2 = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: "46",
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              r,
              s,
              signedRawTransaction: sgnTx1,
              unsignedTransaction: transaction1,
              v: `0x${v.toString(16)}`,
            },
          ],
        });

      expect(responseSend2.body).toStrictEqual({
        error: {
          code: -32_600,
          message: expect.stringContaining(
            "does not match with unsignedTransaction.from",
          ),
        },
        id: "46",
        jsonrpc: "2.0",
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
        baseDocument: JSON.stringify({
          "@context": testUser.didDocument["@context"],
        }),
        did: testUser.did,
        from: testUser.wallet.address,
        isSecp256k1: true,
        notAfter,
        notBefore,
        publicKey: testUser.wallet.signingKey.publicKey,
        vMethodId: testUser.thumbprint,
      } satisfies InsertDidDocumentSchema;

      const accessToken = await new SignJWT({
        scp: "openid didr_invite",
        sub: testUser.did,
      })
        .setProtectedHeader({
          alg: "ES256",
          kid: authApiKid,
          typ: "JWT",
        })
        .sign(authApiKeyPair.privateKey);

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: 231,
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param],
        });

      expect(responseBuild.status).toBe(200);
      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );

      const sgnTx = await testUser.wallet.signTransaction(uTx);
      const signature = ethers.Transaction.from(sgnTx).signature;
      if (!signature) {
        throw new Error("Signature not found");
      }
      const { r, s, v } = signature;

      let responseSend = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: "45",
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              r,
              s,
              signedRawTransaction: sgnTx,
              unsignedTransaction,
              v: `0x${v.toString(16)}`,
            },
          ],
        });

      expect(responseSend.body).toStrictEqual({
        id: "45",
        jsonrpc: "2.0",
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // replay same transaction
      responseSend = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: "45",
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              r,
              s,
              signedRawTransaction: sgnTx,
              unsignedTransaction,
              v: `0x${v.toString(16)}`,
            },
          ],
        });

      expect(responseSend.body).toStrictEqual({
        error: {
          code: -32_600,
          message:
            "Nonce too low. Expected nonce to be 1 but got 0. Note that transactions can't be queued when automining.",
        },
        id: "45",
        jsonrpc: "2.0",
      });
      expect(responseSend.status).toBe(400);
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);

      const signer = ethers.Wallet.createRandom();
      const accessToken = newUserDidrInviteAccessToken;
      const now = Math.floor(Date.now() / 1000);
      const param = {
        baseDocument: JSON.stringify({
          "@context": ["https://www.w3.org/ns/did/v1"],
        }),
        did: newUser.did,
        from: signer.address,
        isSecp256k1: true,
        notAfter: now + 3600,
        notBefore: now,
        publicKey: newUser.wallet.signingKey.publicKey,
        vMethodId: newUser.thumbprint,
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
        // eslint-disable-next-line unicorn/no-null
        id: null,
        jsonrpc: "2.0",
        result: expect.objectContaining({}),
      });
      expect(responseBuild.status).toBe(200);
    });

    it("should throw an error if the from attribute is not a valid Ethereum address", async () => {
      expect.assertions(2);

      const accessToken = newUserDidrInviteAccessToken;
      const now = Math.floor(Date.now() / 1000);
      const param = {
        baseDocument: JSON.stringify({
          "@context": ["https://www.w3.org/ns/did/v1"],
        }),
        did: newUser.did,
        from: "0x123",
        isSecp256k1: true,
        notAfter: now + 3600,
        notBefore: now,
        publicKey: newUser.wallet.signingKey.publicKey,
        vMethodId: newUser.thumbprint,
      } satisfies InsertDidDocumentSchema;

      const responseBuild = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: 123,
          jsonrpc: "2.0",
          method: "insertDidDocument",
          params: [param],
        });

      expect(responseBuild.body).toStrictEqual({
        error: {
          code: -32_600,
          message: "Invalid 'params.0.from': Invalid Ethereum address",
        },
        id: 123,
        jsonrpc: "2.0",
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
        case "addController": {
          param = {
            controller: existingUser2.did,
            did: existingUser.did,
            from: signer.address,
          } satisfies AddControllerSchema;

          break;
        }
        case "addService": {
          param = {
            did: existingUser.did,
            from: signer.address,
            service: JSON.stringify({
              id: "1",
              serviceEndpoint: {
                byId: "/vc/{id}",
                byType: "/type/{type}",
                registries: [
                  "https://registry.example.com/{credentialSubject.id}",
                  "https://identity.foundation/vcs/{credentialSubject.id}",
                ],
              },
              type: "CredentialRegistry",
            }),
          } satisfies AddServiceSchema;
          break;
        }
        case "addVerificationMethod": {
          param = {
            did: existingUser.did,
            from: signer.address,
            isSecp256k1: false,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk2)).toString(
              "hex",
            )}`,
            vMethodId: thumbprint2,
          } satisfies AddVerificationMethodSchema;
          break;
        }
        case "addVerificationRelationship": {
          param = {
            did: existingUser.did,
            from: signer.address,
            name: "capabilityDelegation",
            notAfter: now + 3600,
            notBefore: now,
            vMethodId: existingUser.thumbprint,
          } satisfies AddVerificationRelationshipSchema;
          break;
        }
        case "expireVerificationMethod": {
          param = {
            did: existingUser.did,
            from: signer.address,
            notAfter: now + 600,
            vMethodId: thumbprint2,
          } satisfies ExpireVerificationMethodSchema;
          break;
        }
        case "insertDidDocument": {
          param = {
            baseDocument: JSON.stringify({
              "@context": ["https://www.w3.org/ns/did/v1"],
            }),
            did: newUser.did,
            from: signer.address,
            isSecp256k1: true,
            notAfter: now + 3600,
            notBefore: now,
            publicKey: newUser.wallet.signingKey.publicKey,
            vMethodId: newUser.thumbprint,
          } satisfies InsertDidDocumentSchema;
          break;
        }
        case "revokeController": {
          param = {
            controller: existingUser2.did,
            did: existingUser.did,
            from: signer.address,
          } satisfies RevokeControllerSchema;
          break;
        }
        case "revokeService": {
          param = {
            did: existingUser.did,
            from: signer.address,
            serviceId: "1",
          } satisfies RevokeServiceSchema;
          break;
        }
        case "revokeVerificationMethod": {
          param = {
            did: existingUser.did,
            from: signer.address,
            notAfter: now - 600,
            vMethodId: thumbprint2,
          } satisfies RevokeVerificationMethodSchema;
          break;
        }
        case "rollVerificationMethod": {
          param = {
            args: {
              did: existingUser.did,
              duration: 360,
              isSecp256k1: false,
              notAfter: now + 3600,
              notBefore: now,
              oldVMethodId: thumbprint2,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk3),
              ).toString("hex")}`,
              vMethodId: thumbprint3,
            },
            from: signer.address,
          } satisfies RollVerificationMethodSchema;
          break;
        }
        case "updateBaseDocument": {
          param = {
            baseDocument: JSON.stringify({
              "@context": existingUser.didDocument["@context"],
            }),
            did: existingUser.did,
            from: signer.address,
          } satisfies UpdateBaseDocumentSchema;
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
          id: 231,
          jsonrpc: "2.0",
          method,
          params: [param],
        });

      expect(responseBuild.body).toStrictEqual({
        id: 231,
        jsonrpc: "2.0",
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
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );

      const sgnTx = await signer.signTransaction(uTx);
      const signature = ethers.Transaction.from(sgnTx).signature;
      if (!signature) {
        throw new Error("Signature not found");
      }
      const { r, s, v } = signature;

      const responseSend = await request(server)
        .post("/")
        .auth(accessToken, { type: "bearer" })
        .send({
          id: "45",
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              r,
              s,
              signedRawTransaction: sgnTx,
              unsignedTransaction,
              v: `0x${v.toString(16)}`,
            },
          ],
        });

      expect(responseSend.body).toStrictEqual({
        id: "45",
        jsonrpc: "2.0",
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);
    });

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      const signer = ethers.Wallet.createRandom();

      const testSetup: {
        accessToken: string;
        expectedErrorMessage: string;
        params: JsonRpcParams;
      }[] = [];

      const now = Math.floor(Date.now() / 1000);

      switch (method) {
        case "addController": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'addController' requires an access token with the scope 'didr_write'",
              params: {
                controller: existingUser.did,
                did: newUser.did,
                from: signer.address,
              } satisfies AddControllerSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.did': Unsupported version \"2\"",
              params: {
                controller: existingUser.did,
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                from: signer.address,
              } satisfies AddControllerSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.controller': Unsupported version \"2\"",
              params: {
                controller:
                  "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                did: newUser.did,
                from: signer.address,
              } satisfies AddControllerSchema,
            },
          );

          break;
        }
        case "addService": {
          testSetup.push({
            accessToken: newUserDidrWriteAccessToken,
            expectedErrorMessage: `Invalid 'params.0.service.id': Required
Invalid 'params.0.service.serviceEndpoint': Invalid input
Invalid 'params.0.service.type': Invalid input`,
            params: {
              did: newUser.did,
              from: signer.address,
              service: JSON.stringify({}),
            } satisfies AddServiceSchema,
          });

          break;
        }
        case "addVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            accessToken: newUserDidrInviteAccessToken,
            expectedErrorMessage:
              "'addVerificationMethod' requires an access token with the scope 'didr_write'",
            params: {
              did: newUser.did,
              from: signer.address,
              isSecp256k1: false,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk2),
              ).toString("hex")}`,
              vMethodId: thumbprint2,
            } satisfies AddVerificationMethodSchema,
          });

          const publicKeyJwk = {
            crv: "Ed25519",
            kty: "OKP",
            x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
          };
          const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

          testSetup.push(
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.publicKey': The public key must be an hexadecimal string prefixed with 0x",
              params: {
                did: newUser.did,
                from: signer.address,
                isSecp256k1: false,
                publicKey: Buffer.from(JSON.stringify(publicKeyJwk)).toString(
                  "hex",
                ),
                vMethodId: "bad vMethodId",
              } satisfies AddVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.publicKey': The public key must be valid JSON object",
              params: {
                did: newUser.did,
                from: signer.address,
                isSecp256k1: false,
                publicKey: "0x32313029",
                vMethodId: thumbprint,
              } satisfies AddVerificationMethodSchema,
            },
          );

          break;
        }
        case "addVerificationRelationship": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'addVerificationRelationship' requires an access token with the scope 'didr_write'",
              params: {
                did: newUser.did,
                from: signer.address,
                name: "assertionMethod",
                notAfter: now + 3600,
                notBefore: now,
                vMethodId: newUser.thumbprint,
              } satisfies AddVerificationRelationshipSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.did': Unsupported version \"2\"",
              params: {
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                from: signer.address,
                name: "assertionMethod",
                notAfter: now + 3600,
                notBefore: now,
                vMethodId: newUser.thumbprint,
              } satisfies AddVerificationRelationshipSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.notAfter': Number must be greater than or equal to 0",
              params: {
                did: newUser.did,
                from: signer.address,
                name: "assertionMethod",
                notAfter: -10,
                notBefore: now,
                vMethodId: newUser.thumbprint,
              } satisfies AddVerificationRelationshipSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.name': Invalid enum value. Expected 'authentication' | 'assertionMethod' | 'keyAgreement' | 'capabilityInvocation' | 'capabilityDelegation', received 'bad-name'",
              // @ts-expect-error - `name: "bad-name` is invalid
              params: {
                did: newUser.did,
                from: signer.address,
                name: "bad-name",
                notAfter: now + 3600,
                notBefore: now,
                vMethodId: newUser.thumbprint,
              } as AddVerificationRelationshipSchema,
            },
          );

          break;
        }
        case "expireVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'expireVerificationMethod' requires an access token with the scope 'didr_write'",
              params: {
                did: newUser.did,
                from: signer.address,
                notAfter: now + 600,
                vMethodId: thumbprint2,
              } satisfies ExpireVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.notAfter': Number must be greater than or equal to 0",
              params: {
                did: newUser.did,
                from: signer.address,
                notAfter: -10,
                vMethodId: newUser.thumbprint,
              } satisfies ExpireVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.did': Unsupported version \"2\"",
              params: {
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                from: signer.address,
                notAfter: now + 600,
                vMethodId: newUser.thumbprint,
              } satisfies ExpireVerificationMethodSchema,
            },
          );

          break;
        }
        case "insertDidDocument": {
          // Invalid access token (not the right sub)
          testSetup.push(
            {
              accessToken: existingUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Access token sub doesn't match the DID from the payload",
              params: {
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                }),
                did: newUser.did,
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: newUser.wallet.signingKey.publicKey,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.did': Unsupported version \"2\"",
              params: {
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                }),
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: newUser.wallet.signingKey.publicKey,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.baseDocument': '@context' attribute is missing",
              params: {
                baseDocument: JSON.stringify({}),
                did: newUser.did,
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: newUser.wallet.signingKey.publicKey,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.baseDocument': '@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
              params: {
                baseDocument: JSON.stringify({ "@context": [] }),
                did: newUser.did,
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: newUser.wallet.signingKey.publicKey,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.baseDocument': attribute 'authentication' is not allowed",
              params: {
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                  // authentication can not be in the base document
                  authentication: [],
                }),
                did: newUser.did,
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: newUser.wallet.signingKey.publicKey,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.baseDocument': attributes 'controller', 'verificationMethod' are not allowed",
              params: {
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                  // controller and verificationMethod can not be in the base document
                  controller: "",
                  verificationMethod: [],
                }),
                did: newUser.did,
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: newUser.wallet.signingKey.publicKey,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.publicKey': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
              params: {
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                }),
                did: newUser.did,
                from: signer.address,
                isSecp256k1: true,
                notAfter: now + 3600,
                notBefore: now,
                publicKey: `0x${crypto.randomBytes(35).toString("hex")}`,
                vMethodId: newUser.thumbprint,
              } satisfies InsertDidDocumentSchema,
            },
          );

          const publicKeyJwk = {
            crv: "Ed25519",
            kty: "OKP",
            x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
          };
          const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

          testSetup.push({
            accessToken: newUserDidrInviteAccessToken,
            expectedErrorMessage:
              "Invalid 'params.0.isSecp256k1': Invalid literal value, expected true",
            // @ts-expect-error - isSecp256k1 should be true
            params: {
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              did: newUser.did,
              from: signer.address,
              isSecp256k1: false,
              notAfter: now + 3600,
              notBefore: now,
              publicKey: Buffer.from(JSON.stringify(publicKeyJwk)).toString(
                "hex",
              ),
              vMethodId: thumbprint,
            } as InsertDidDocumentSchema,
          });

          break;
        }
        case "revokeController": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'revokeController' requires an access token with the scope 'didr_write'",
              params: {
                controller: existingUser.did,
                did: newUser.did,
                from: signer.address,
              } satisfies RevokeControllerSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.did': Unsupported version \"2\"",
              params: {
                controller: existingUser.did,
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                from: signer.address,
              } satisfies RevokeControllerSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.controller': Unsupported version \"2\"",
              params: {
                controller:
                  "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                did: newUser.did,
                from: signer.address,
              } satisfies RevokeControllerSchema,
            },
          );

          break;
        }
        case "revokeService": {
          testSetup.push({
            accessToken: newUserDidrInviteAccessToken,
            expectedErrorMessage:
              "'updateBaseDocument' requires an access token with the scope 'didr_write'",
            params: {
              did: newUser.did,
              from: signer.address,
              serviceId: "1",
            } satisfies RevokeServiceSchema,
          });
          break;
        }
        case "revokeVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'revokeVerificationMethod' requires an access token with the scope 'didr_write'",
              params: {
                did: newUser.did,
                from: signer.address,
                notAfter: now - 600,
                vMethodId: thumbprint2,
              } satisfies RevokeVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.notAfter': Number must be greater than or equal to 0",
              params: {
                did: newUser.did,
                from: signer.address,
                notAfter: -10,
                vMethodId: newUser.thumbprint,
              } satisfies RevokeVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.did': Unsupported version \"2\"",
              params: {
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                from: signer.address,
                notAfter: now - 600,
                vMethodId: newUser.thumbprint,
              } satisfies RevokeVerificationMethodSchema,
            },
          );

          break;
        }
        case "rollVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'rollVerificationMethod' requires an access token with the scope 'didr_write'",
              params: {
                args: {
                  did: newUser.did,
                  duration: 360,
                  isSecp256k1: false,
                  notAfter: now + 3600,
                  notBefore: now,
                  oldVMethodId: thumbprint2,
                  publicKey: `0x${Buffer.from(
                    JSON.stringify(publicKeyJwk3),
                  ).toString("hex")}`,
                  vMethodId: thumbprint3,
                },
                from: signer.address,
              } satisfies RollVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.args.did': Unsupported version \"2\"",
              params: {
                args: {
                  did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                  duration: 360,
                  isSecp256k1: false,
                  notAfter: now + 3600,
                  notBefore: now,
                  oldVMethodId: thumbprint2,
                  publicKey: `0x${Buffer.from(
                    JSON.stringify(publicKeyJwk3),
                  ).toString("hex")}`,
                  vMethodId: thumbprint3,
                },
                from: signer.address,
              } satisfies RollVerificationMethodSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.args.notBefore': Number must be greater than or equal to 0",
              params: {
                args: {
                  did: newUser.did,
                  duration: 360,
                  isSecp256k1: false,
                  notAfter: now + 3600,
                  notBefore: -10,
                  oldVMethodId: thumbprint2,
                  publicKey: `0x${Buffer.from(
                    JSON.stringify(publicKeyJwk3),
                  ).toString("hex")}`,
                  vMethodId: thumbprint3,
                },
                from: signer.address,
              } satisfies RollVerificationMethodSchema,
            },
          );

          break;
        }
        case "updateBaseDocument": {
          // Invalid access token (not the correct scope)
          testSetup.push(
            {
              accessToken: newUserDidrInviteAccessToken,
              expectedErrorMessage:
                "'updateBaseDocument' requires an access token with the scope 'didr_write'",
              params: {
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                }),
                did: newUser.did,
                from: signer.address,
              } satisfies UpdateBaseDocumentSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.baseDocument': '@context' attribute is missing",
              params: {
                baseDocument: "{}",
                did: newUser.did,
                from: signer.address,
              } satisfies UpdateBaseDocumentSchema,
            },
            {
              accessToken: newUserDidrWriteAccessToken,
              expectedErrorMessage:
                "Invalid 'params.0.baseDocument': '@context' attribute must be 'https://www.w3.org/ns/did/v1' or an array with 'https://www.w3.org/ns/did/v1' as first element",
              params: {
                // authentication can not be in the base document
                baseDocument: '{"@context":[],"authentication":[]}',
                did: newUser.did,
                from: signer.address,
              } satisfies UpdateBaseDocumentSchema,
            },
          );

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method as string}`);
        }
      }

      expect.assertions(testSetup.length * 2);

      // Run requests sequentially

      for (const setup of testSetup) {
        const response = await request(server)
          .post("/")
          .auth(setup.accessToken, { type: "bearer" })
          .send({
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [setup.params],
          });

        expect(response.body).toStrictEqual({
          error: {
            code: -32_600,
            message: expect.stringContaining(setup.expectedErrorMessage),
          },
          id: 231,
          jsonrpc: "2.0",
        });
        expect(response.status).toBe(400);
      }
    });
  });
});
