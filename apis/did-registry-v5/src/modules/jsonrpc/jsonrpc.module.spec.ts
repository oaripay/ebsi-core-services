import {
  jest,
  describe,
  beforeAll,
  afterEach,
  afterAll,
  it,
  expect,
} from "@jest/globals";
import request from "supertest";
import crypto from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ethers } from "ethers";
import type { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { useContainer } from "class-validator";
import {
  calculateJwkThumbprint,
  SignJWT,
  generateKeyPair,
  exportJWK,
} from "jose";
import type { GenerateKeyPairResult, JWK } from "jose";
import nock from "nock";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v3";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  UnsignedTransaction,
  InsertDidDocumentParam,
  UpdateBaseDocumentParam,
  AddControllerParam,
  RevokeControllerParam,
  AddVerificationMethodParam,
  AddVerificationRelationshipParam,
  RevokeVerificationMethodParam,
  ExpireVerificationMethodParam,
  RollVerificationMethodParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { createUser, UserDetails } from "../../../tests/utils/data";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { ApiConfig } from "../../config/configuration";
import { LedgerService } from "../ledger/ledger.service";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertDidDocumentParam
  | UpdateBaseDocumentParam
  | AddControllerParam
  | RevokeControllerParam
  | AddVerificationMethodParam
  | AddVerificationRelationshipParam
  | RevokeVerificationMethodParam
  | ExpireVerificationMethodParam
  | RollVerificationMethodParam;

jest.setTimeout(300000);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
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

  beforeAll(async () => {
    // Disable external requests
    nock.disableNetConnect();
    // Allow localhost connections so we can test local routes and mock servers.
    nock.enableNetConnect("127.0.0.1");

    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocumentsTotal: 2,
    });

    didRegistryContract = testEnv.didRegistryContract;

    jest
      .spyOn(LedgerService.prototype, "getContractAddress")
      .mockImplementation(() => didRegistryContract.address);

    // Mock DidRegistry contract
    jest
      .spyOn(DidRegistry__factory, "connect")
      .mockImplementation(() => didRegistryContract);

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    useContainer(app.select(JsonRpcModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    newUser = await createUser();
    [existingUser, existingUser2] = testEnv.users;

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

    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () => Promise.resolve(didRegistryContract));

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
    const authorisationApiUrl = new URL(
      configService.get<string>("authorisationApiUrl")
    );

    // Mock Auth API /.well-known/openid-configuration endpoint
    nock(authorisationApiUrl.origin)
      .get(`${authorisationApiUrl.pathname}/.well-known/openid-configuration`)
      .reply(200, {
        jwks_uri: `${authorisationApiUrl.origin}${authorisationApiUrl.pathname}/jwks`,
      })
      .persist();

    // Mock Auth API /jwks endpoint
    nock(authorisationApiUrl.origin)
      .get(`${authorisationApiUrl.pathname}/jwks`)
      .reply(200, {
        keys: [
          {
            ...publicKeyJwk,
            kid: authApiKid,
          },
        ],
      })
      .persist();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    nock.restore();
    // Avoid jest open handle error
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });
    await app.close();
  });

  describe("Generic tests", () => {
    it("should reject a POST without JWT", async () => {
      expect.assertions(3);

      const response = await request(server).post("/jsonrpc").send();

      expect(response.body).toStrictEqual({
        detail: "Invalid or missing JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid token", async () => {
      expect.assertions(3);

      const response = await request(server)
        .post("/jsonrpc")
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid access token", async () => {
      expect.assertions(6);

      const signer = await generateKeyPair("ES256");
      const kid = await calculateJwkThumbprint(
        await exportJWK(signer.publicKey)
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
        .post("/jsonrpc")
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
        (response.headers as { "content-type": string })["content-type"]
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
        .post("/jsonrpc")
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw Bad Request for a bad JSON-RPC call", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/jsonrpc")
        .auth(newUserDidrInviteAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an Invalid Request error for bad method", async () => {
      expect.assertions(2);

      const response = await request(server)
        .post("/jsonrpc")
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
            "The method 'unknown-method' is invalid"
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
      } as InsertDidDocumentParam;

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
      } as InsertDidDocumentParam;

      const accessToken = newUserDidrInviteAccessToken;

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
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
        .post("/jsonrpc")
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
        JSON.parse(JSON.stringify(transaction1)) as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
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
            "does not match with the signedRawTransaction"
          ),
        },
      });
      expect(responseSend1.status).toBe(400);

      // Tampering "from"
      transaction1.from = transaction2.from;

      const responseSend2 = await request(server)
        .post("/jsonrpc")
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
            "does not match with unsignedTransaction.from"
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
      } as InsertDidDocumentParam;

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
        .post("/jsonrpc")
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
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await testUser.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      let responseSend = await request(server)
        .post("/jsonrpc")
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
        .post("/jsonrpc")
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
      } as InsertDidDocumentParam;

      const responseBuild = await request(server)
        .post("/jsonrpc")
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
        result: expect.objectContaining({}) as unknown,
      });
      expect(responseBuild.status).toBe(200);
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
  ] as const)("/jsonrpc with method %s", (method) => {
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
          } as InsertDidDocumentParam;
          break;
        }
        case "updateBaseDocument": {
          param = {
            from: signer.address,
            did: existingUser.did,
            baseDocument: JSON.stringify({
              "@context": existingUser.didDocument["@context"],
            }),
          } as UpdateBaseDocumentParam;
          break;
        }
        case "addController": {
          param = {
            from: signer.address,
            did: existingUser.did,
            controller: existingUser2.did,
          } as AddControllerParam;

          break;
        }
        case "revokeController": {
          param = {
            from: signer.address,
            did: existingUser.did,
            controller: existingUser2.did,
          } as RevokeControllerParam;
          break;
        }
        case "addVerificationMethod": {
          param = {
            from: signer.address,
            did: existingUser.did,
            vMethodId: thumbprint2,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk2)).toString(
              "hex"
            )}`,
            isSecp256k1: false,
          } as AddVerificationMethodParam;
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
          } as AddVerificationRelationshipParam;
          break;
        }
        case "expireVerificationMethod": {
          param = {
            from: signer.address,
            did: existingUser.did,
            vMethodId: thumbprint2,
            notAfter: now + 600,
          } as ExpireVerificationMethodParam;
          break;
        }
        case "revokeVerificationMethod": {
          param = {
            from: signer.address,
            did: existingUser.did,
            vMethodId: thumbprint2,
            notAfter: now - 600,
          } as RevokeVerificationMethodParam;
          break;
        }
        case "rollVerificationMethod": {
          param = {
            from: signer.address,
            rollArgs: {
              did: existingUser.did,
              vMethodId: thumbprint3,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk3)
              ).toString("hex")}`,
              isSecp256k1: false,
              notBefore: now,
              notAfter: now + 3600,
              oldVMethodId: thumbprint2,
              duration: 360,
            },
          } as RollVerificationMethodParam;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method as string}`);
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
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
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend = await request(server)
        .post("/jsonrpc")
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
            } as InsertDidDocumentParam,
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
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: "{}",
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              // authentication can not be in the base document
              baseDocument: '{"@context":[],"authentication":[]}',
              vMethodId: newUser.thumbprint,
              publicKey: newUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              vMethodId: "bad-thumbprint",
              publicKey:
                "0x0467ae84170dd193fd47d864caeaa36e995d62cab4a258cb9b7234b8cc6bb8aa5d6f4313b6f819d8334d4262094005700429c0e4e23b1e5427160f23f43c643d12",
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: vMethodId must be the thumbprint of the publicKey",
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
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: The public key must be of 33 bytes (secp256k1 compressed) or 65 bytes (secp256k1 uncompressed)",
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
              publicKey: `0x00${crypto.randomBytes(32).toString("hex")}`,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: Invalid public key. Unknown point format",
            accessToken: newUserDidrInviteAccessToken,
          });

          const publicKeyJwk = {
            kty: "OKP",
            crv: "Ed25519",
            x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
          };
          const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

          testSetup.push({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error - isSecp256k1 should be true
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: JSON.stringify({
                "@context": newUser.didDocument["@context"],
              }),
              vMethodId: thumbprint,
              publicKey: Buffer.from(JSON.stringify(publicKeyJwk)).toString(
                "hex"
              ),
              isSecp256k1: false,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: isSecp256k1 must be equal to true",
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
            } as UpdateBaseDocumentParam,
            expectedErrorMessage:
              "'updateBaseDocument' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              baseDocument: "{}",
            } as UpdateBaseDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              // authentication can not be in the base document
              baseDocument: '{"@context":[],"authentication":[]}',
            } as UpdateBaseDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
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
            } as AddControllerParam,
            expectedErrorMessage:
              "'addController' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              controller: existingUser.did,
            } as AddControllerParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              controller:
                "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
            } as AddControllerParam,
            expectedErrorMessage:
              "Validation error: controller must be a valid DID v1",
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
            } as RevokeControllerParam,
            expectedErrorMessage:
              "'revokeController' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              controller: existingUser.did,
            } as RevokeControllerParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              controller:
                "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
            } as RevokeControllerParam,
            expectedErrorMessage:
              "Validation error: controller must be a valid DID v1",
            accessToken: newUserDidrWriteAccessToken,
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
                JSON.stringify(publicKeyJwk2)
              ).toString("hex")}`,
              isSecp256k1: false,
            } as AddVerificationMethodParam,
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
                "hex"
              ),
              isSecp256k1: false,
            } as AddVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: vMethodId must be the thumbprint of the publicKey",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: newUser.did,
              vMethodId: thumbprint,
              publicKey: "0x32313029",
              isSecp256k1: false,
            } as AddVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: Invalid public key. Unexpected token ) in JSON at position 3",
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
            } as AddVerificationRelationshipParam,
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
            } as AddVerificationRelationshipParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
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
            } as AddVerificationRelationshipParam,
            expectedErrorMessage:
              "Validation error: notAfter must not be less than 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error - `name: "bad-name` is invalid
            params: {
              from: signer.address,
              did: newUser.did,
              name: "bad-name",
              vMethodId: newUser.thumbprint,
              notBefore: now,
              notAfter: now + 3600,
            } as AddVerificationRelationshipParam,
            expectedErrorMessage:
              "Validation error: name must be one of the following values: authentication, assertionMethod, keyAgreement, capabilityInvocation, capabilityDelegation",
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
            } as ExpireVerificationMethodParam,
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
            } as ExpireVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: notAfter must not be less than 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              vMethodId: newUser.thumbprint,
              notAfter: now + 600,
            } as ExpireVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
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
            } as RevokeVerificationMethodParam,
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
            } as RevokeVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: notAfter must not be less than 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              vMethodId: newUser.thumbprint,
              notAfter: now - 600,
            } as RevokeVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        case "rollVerificationMethod": {
          // Invalid access token (not the correct scope)
          testSetup.push({
            params: {
              from: signer.address,
              rollArgs: {
                did: newUser.did,
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3)
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: now,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "'rollVerificationMethod' requires an access token with the scope 'didr_write'",
            accessToken: newUserDidrInviteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              rollArgs: {
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3)
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: now,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              rollArgs: {
                did: newUser.did,
                vMethodId: "bad-thumbprint",
                publicKey:
                  "0x0467ae84170dd193fd47d864caeaa36e995d62cab4a258cb9b7234b8cc6bb8aa5d6f4313b6f819d8334d4262094005700429c0e4e23b1e5427160f23f43c643d12",
                isSecp256k1: true,
                notBefore: now,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: vMethodId must be the thumbprint of the publicKey",
            accessToken: newUserDidrWriteAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              rollArgs: {
                did: newUser.did,
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3)
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: -10,
                notAfter: now + 3600,
                oldVMethodId: thumbprint2,
                duration: 360,
              },
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: notBefore must not be less than 0",
            accessToken: newUserDidrWriteAccessToken,
          });

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method as string}`);
        }
      }

      expect.assertions(testSetup.length * 2);

      await Promise.all(
        testSetup.map(async (setup) => {
          const response = await request(server)
            .post("/jsonrpc")
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
        })
      );
    });
  });
});
