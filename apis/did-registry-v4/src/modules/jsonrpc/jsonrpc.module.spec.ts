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
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
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
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v2";
import { methodNotAllowed } from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
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
} from "./dto/index.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { createUser, UserDetails } from "../../../tests/utils/data.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/didRegistry.js";
import type { ApiConfig } from "../../config/configuration.js";
import { LedgerService } from "../ledger/ledger.service.js";

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

describe(
  "JsonRpc Module",
  () => {
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

      vi.spyOn(
        LedgerService.prototype,
        "getContractAddress",
      ).mockImplementation(() => didRegistryContract.address);

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

      // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
      await app.register(fastifyHelmet, {
        contentSecurityPolicy: {
          directives: {
            "frame-ancestors": ["'none'"],
          },
        },
        xFrameOptions: {
          action: "deny",
        },
      });

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
      vi.spyOn(ledgerService, "getContractV1").mockImplementation(
        () => testEnv.setupV1.didRegistryV1Contract,
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

      // Mock Auth API v3
      const authorisationApiUrl = configService.get<string>(
        "authorisationApiUrl",
      );

      mockServer.use(
        // Mock Auth API v3 /.well-known/openid-configuration endpoint
        http.get(
          `${authorisationApiUrl}/.well-known/openid-configuration`,
          () => HttpResponse.json({ jwks_uri: `${authorisationApiUrl}/jwks` }),
        ),
        // Mock Auth API v3 /jwks endpoint
        http.get(`${authorisationApiUrl}/jwks`, () =>
          HttpResponse.json({ keys: [{ ...publicKeyJwk, kid: authApiKid }] }),
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

        const response = await request(server).post("/jsonrpc").send();

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
          (response.headers as { "content-type": string })["content-type"],
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
        } satisfies InsertDidDocumentParam;

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
        } satisfies InsertDidDocumentParam;

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
          JSON.parse(JSON.stringify(transaction1)) as UnsignedTransaction,
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
              "does not match with the signedRawTransaction",
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
        } satisfies InsertDidDocumentParam;

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
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
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
        } satisfies InsertDidDocumentParam;

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
          result: expect.objectContaining({}),
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
            } satisfies InsertDidDocumentParam;
            break;
          }
          case "updateBaseDocument": {
            param = {
              from: signer.address,
              did: existingUser.did,
              baseDocument: JSON.stringify({
                "@context": existingUser.didDocument["@context"],
              }),
            } satisfies UpdateBaseDocumentParam;
            break;
          }
          case "addController": {
            param = {
              from: signer.address,
              did: existingUser.did,
              controller: existingUser2.did,
            } satisfies AddControllerParam;

            break;
          }
          case "revokeController": {
            param = {
              from: signer.address,
              did: existingUser.did,
              controller: existingUser2.did,
            } satisfies RevokeControllerParam;
            break;
          }
          case "addVerificationMethod": {
            param = {
              from: signer.address,
              did: existingUser.did,
              vMethodId: thumbprint2,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk2),
              ).toString("hex")}`,
              isSecp256k1: false,
            } satisfies AddVerificationMethodParam;
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
            } satisfies AddVerificationRelationshipParam;
            break;
          }
          case "expireVerificationMethod": {
            param = {
              from: signer.address,
              did: existingUser.did,
              vMethodId: thumbprint2,
              notAfter: now + 600,
            } satisfies ExpireVerificationMethodParam;
            break;
          }
          case "revokeVerificationMethod": {
            param = {
              from: signer.address,
              did: existingUser.did,
              vMethodId: thumbprint2,
              notAfter: now - 600,
            } satisfies RevokeVerificationMethodParam;
            break;
          }
          case "rollVerificationMethod": {
            param = {
              from: signer.address,
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
            } satisfies RollVerificationMethodParam;
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
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
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
              } satisfies InsertDidDocumentParam,
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
              } satisfies InsertDidDocumentParam,
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
              } satisfies InsertDidDocumentParam,
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
              } satisfies InsertDidDocumentParam,
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
                vMethodId: newUser.thumbprint,
                publicKey: `0x${crypto.randomBytes(35).toString("hex")}`,
                isSecp256k1: true,
                notBefore: now,
                notAfter: now + 3600,
              } satisfies InsertDidDocumentParam,
              expectedErrorMessage:
                "Invalid public key. The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
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
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk),
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: now,
                notAfter: now + 3600,
              } as InsertDidDocumentParam,
              expectedErrorMessage:
                "Validation error: isSecp256k1 must be equal to true",
              accessToken: newUserDidrInviteAccessToken,
            });

            const v1Did = testEnv.setupV1.didDocuments[0]!.did;
            const v1UserDidrInviteAccessToken = await new SignJWT({
              sub: v1Did,
              scp: "openid didr_invite",
            })
              .setProtectedHeader({
                typ: "JWT",
                alg: "ES256",
                kid: authApiKid,
              })
              .sign(authApiKeyPair.privateKey);
            testSetup.push({
              params: {
                from: signer.address,
                did: v1Did,
                baseDocument: JSON.stringify({
                  "@context": newUser.didDocument["@context"],
                }),
                vMethodId: newUser.thumbprint,
                publicKey: newUser.wallet.publicKey,
                isSecp256k1: true,
                notBefore: now,
                notAfter: now + 3600,
              } satisfies InsertDidDocumentParam,
              expectedErrorMessage: `The address ${signer.address} is not the controller of ${v1Did} in DID Registry V3`,
              accessToken: v1UserDidrInviteAccessToken,
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
              } satisfies UpdateBaseDocumentParam,
              expectedErrorMessage:
                "'updateBaseDocument' requires an access token with the scope 'didr_write'",
              accessToken: newUserDidrInviteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: newUser.did,
                baseDocument: "{}",
              } satisfies UpdateBaseDocumentParam,
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
              } satisfies UpdateBaseDocumentParam,
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
              } satisfies AddControllerParam,
              expectedErrorMessage:
                "'addController' requires an access token with the scope 'didr_write'",
              accessToken: newUserDidrInviteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                controller: existingUser.did,
              } satisfies AddControllerParam,
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
              } satisfies AddControllerParam,
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
              } satisfies RevokeControllerParam,
              expectedErrorMessage:
                "'revokeController' requires an access token with the scope 'didr_write'",
              accessToken: newUserDidrInviteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                controller: existingUser.did,
              } satisfies RevokeControllerParam,
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
              } satisfies RevokeControllerParam,
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
                  JSON.stringify(publicKeyJwk2),
                ).toString("hex")}`,
                isSecp256k1: false,
              } satisfies AddVerificationMethodParam,
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
                vMethodId: thumbprint,
                publicKey: "0x3231302",
                isSecp256k1: false,
              } satisfies AddVerificationMethodParam,
              expectedErrorMessage: `Validation error: Invalid public key. The public key must be an even number of bytes`,
              accessToken: newUserDidrWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: newUser.did,
                vMethodId: thumbprint,
                publicKey: `0x${Buffer.from(
                  JSON.stringify({
                    // Not a valid JWK
                    kty: "EC",
                    crv: "P-256",
                    x: "0",
                    y: "0",
                  }),
                ).toString("hex")}`,
                isSecp256k1: false,
              } satisfies AddVerificationMethodParam,
              expectedErrorMessage: `Validation error: Invalid public key`,
              accessToken: newUserDidrWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: newUser.did,
                vMethodId: thumbprint,
                publicKey: `0x${Buffer.from(
                  JSON.stringify({
                    kty: "EC",
                    x: "t7vngJgDSKdHLcUghceCC6zU7IISAhJwcYj3DJe-npc",
                    y: "ccPOx7uc_xoWEC3o3tPzAwupdj7go7OVVOjnJ4nJFS8",
                    crv: "P-256",
                    // Trying to register a private key
                    d: "yonRY9HaidYqPo1pP277AuuCxcIE3vWayvsOxqWJ9Sg",
                  }),
                ).toString("hex")}`,
                isSecp256k1: false,
              } satisfies AddVerificationMethodParam,
              expectedErrorMessage: `Validation error: Invalid public key. ECC Private Key 'd' is not allowed`,
              accessToken: newUserDidrWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: newUser.did,
                vMethodId: thumbprint,
                publicKey: `0x${Buffer.from(
                  JSON.stringify({
                    kty: "OKP",
                    crv: "Ed25519",
                    x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo",
                    // Trying to register a private key
                    d: "nWGxne_9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A",
                  }),
                ).toString("hex")}`,
                isSecp256k1: false,
              } satisfies AddVerificationMethodParam,
              expectedErrorMessage: `Validation error: Invalid public key. EdDSA Private Key 'd' is not allowed`,
              accessToken: newUserDidrWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: newUser.did,
                vMethodId: thumbprint,
                publicKey: `0x${Buffer.from(
                  JSON.stringify({
                    kty: "RSA",
                    n: "whYOFK2Ocbbpb_zVypi9SeKiNUqKQH0zTKN1-6fpCTu6ZalGI82s7XK3tan4dJt90ptUPKD2zvxqTzFNfx4HHHsrYCf2-FMLn1VTJfQazA2BvJqAwcpW1bqRUEty8tS_Yv4hRvWfQPcc2Gc3-_fQOOW57zVy-rNoJc744kb30NjQxdGp03J2S3GLQu7oKtSDDPooQHD38PEMNnITf0pj-KgDPjymkMGoJlO3aKppsjfbt_AH6GGdRghYRLOUwQU-h-ofWHR3lbYiKtXPn5dN24kiHy61e3VAQ9_YAZlwXC_99GGtw_NpghFAuM4P1JDn0DppJldy3PGFC0GfBCZASw",
                    e: "AQAB",
                    // Trying to register a private key
                    d: "VuVE_KEP6323WjpbBdAIv7HGahGrgGANvbxZsIhm34lsVOPK0XDegZkhAybMZHjRhp-gwVxX5ChC-J3cUpOBH5FNxElgW6HizD2Jcq6t6LoLYgPSrfEHm71iHg8JsgrqfUnGYFzMJmv88C6WdCtpgG_qJV1K00_Ly1G1QKoBffEs-v4fAMJrCbUdCz1qWto-PU-HLMEo-krfEpGgcmtZeRlDADh8cETMQlgQfQX2VWq_aAP4a1SXmo-j0cvRU4W5Fj0RVwNesIpetX2ZFz4p_JmB5sWFEj_fC7h5z2lq-6Bme2T3BHtXkIxoBW0_pYVnASC8P2puO5FnVxDmWuHDYQ",
                    p: "07rgXd_tLUhVRF_g1OaqRZh5uZ8hiLWUSU0vu9coOaQcatSqjQlIwLW8UdKv_38GrmpIfgcEVQjzq6rFBowUm9zWBO9Eq6enpasYJBOeD8EMeDK-nsST57HjPVOCvoVC5ZX-cozPXna3iRNZ1TVYBY3smn0IaxysIK-zxESf4pM",
                    q: "6qrE9TPhCS5iNR7QrKThunLu6t4H_8CkYRPLbvOIt2MgZyPLiZCsvdkTVSOX76QQEXt7Y0nTNua69q3K3Jhf-YOkPSJsWTxgrfOnjoDvRKzbW3OExIMm7D99fVBODuNWinjYgUwGSqGAsb_3TKhtI-Gr5ls3fn6B6oEjVL0dpmk",
                    dp: "mHqjrFdgelT2OyiFRS3dAAPf3cLxJoAGC4gP0UoQyPocEP-Y17sQ7t-ygIanguubBy65iDFLeGXa_g0cmSt2iAzRAHrDzI8P1-pQl2KdWSEg9ssspjBRh_F_AiJLLSPRWn_b3-jySkhawtfxwO8Kte1QsK1My765Y0zFvJnjPws",
                    dq: "KmjaV4YcsVAUp4z-IXVa5htHWmLuByaFjpXJOjABEUN0467wZdgjn9vPRp-8Ia8AyGgMkJES_uUL_PDDrMJM9gb4c6P4-NeUkVtreLGMjFjA-_IQmIMrUZ7XywHsWXx0c2oLlrJqoKo3W-hZhR0bPFTYgDUT_mRWjk7wV6wl46E",
                    qi: "iYltkV_4PmQDfZfGFpzn2UtYEKyhy-9t3Vy8Mw2VHLAADKGwJvVK5ficQAr2atIF1-agXY2bd6KV-w52zR8rmZfTr0gobzYIyqHczOm13t7uXJv2WygY7QEC2OGjdxa2Fr9RnvS99ozMa5nomZBqTqT7z5QV33czjPRCjvg6FcE",
                  }),
                ).toString("hex")}`,
                isSecp256k1: false,
              } satisfies AddVerificationMethodParam,
              expectedErrorMessage: `Validation error: Invalid public key. Private Exponent 'd' is not allowed`,
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
              } satisfies AddVerificationRelationshipParam,
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
              } satisfies AddVerificationRelationshipParam,
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
              } satisfies AddVerificationRelationshipParam,
              expectedErrorMessage:
                "Validation error: notAfter must not be less than 0",
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
              } satisfies ExpireVerificationMethodParam,
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
              } satisfies ExpireVerificationMethodParam,
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
              } satisfies ExpireVerificationMethodParam,
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
              } satisfies RevokeVerificationMethodParam,
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
              } satisfies RevokeVerificationMethodParam,
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
              } satisfies RevokeVerificationMethodParam,
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
              } satisfies RollVerificationMethodParam,
              expectedErrorMessage:
                "'rollVerificationMethod' requires an access token with the scope 'didr_write'",
              accessToken: newUserDidrInviteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
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
              } satisfies RollVerificationMethodParam,
              expectedErrorMessage:
                "Validation error: did must be a valid DID v1",
              accessToken: newUserDidrWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
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
              } satisfies RollVerificationMethodParam,
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

        // Run requests sequentially
        // eslint-disable-next-line no-restricted-syntax
        for (const setup of testSetup) {
          // eslint-disable-next-line no-await-in-loop
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
        }
      });
    });
  },
  { timeout: 300_000 },
);
