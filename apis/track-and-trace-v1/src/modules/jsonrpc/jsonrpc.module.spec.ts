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
import { randomBytes } from "node:crypto";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import {
  calculateJwkThumbprint,
  SignJWT,
  generateKeyPair,
  exportJWK,
} from "jose";
import type { GenerateKeyPairResult } from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  TrackAndTrace,
  TrackAndTrace__factory,
} from "@ebsiint-sc/track-and-trace";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { util } from "@cef-ebsi/key-did-resolver";
import { encode } from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trackAndTrace.js";
import type { ApiConfig } from "../../config/configuration.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type {
  UnsignedTransaction,
  AuthoriseDidSchema,
  CreateDocumentSchema,
  RemoveDocumentSchema,
  GrantAccessSchema,
  RevokeAccessSchema,
  WriteEventSchema,
} from "./validators/index.js";
import { didToHex } from "../../shared/utils.js";
import { Permission, AccountType } from "../../shared/constants.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface UserDetails {
  did: string;
  wallet: ethers.Wallet;
  accessToken: {
    tntAuthorise: string;
    tntCreate: string;
    tntWrite: string;
  };
}

type JsonRpcParams =
  | AuthoriseDidSchema
  | CreateDocumentSchema
  | RemoveDocumentSchema
  | GrantAccessSchema
  | RevokeAccessSchema
  | WriteEventSchema;

/**
 * Encode DID in URLs mocked by MSW
 * @see https://github.com/mswjs/msw/discussions/739#discussioncomment-2524732
 */
function encodeDid(did: string) {
  return did.replaceAll(":", "\\:");
}

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let trackAndTraceContract: TrackAndTrace;
  let configService: ConfigService<ApiConfig, true>;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;

  const user1 = {
    did: "did:ebsi:zf62uhvaQuUZty6sMxz9qVV",
    wallet: ethers.Wallet.createRandom(),
    accessToken: {
      tntAuthorise: "",
      tntCreate: "",
      tntWrite: "",
    },
  } satisfies UserDetails;
  const user2 = {
    did: "did:ebsi:z25eGB9RuaYR1nQGpH6mvm4Q",
    wallet: ethers.Wallet.createRandom(),
    accessToken: {
      tntAuthorise: "",
      tntCreate: "",
      tntWrite: "",
    },
  } satisfies UserDetails;
  const user3Wallet = ethers.Wallet.createRandom();
  const user3PublicKeyJwk = encode.publicKey.fromHexToJWK(
    user3Wallet.publicKey,
  );
  const user3 = {
    did: util.createDid(user3PublicKeyJwk),
    wallet: user3Wallet,
    accessToken: {
      tntAuthorise: "",
      tntCreate: "",
      tntWrite: "",
    },
  } satisfies UserDetails;

  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;
  const documentHash1 = `0x${randomBytes(32).toString("hex")}`;
  const documentHash2 = `0x${randomBytes(32).toString("hex")}`;

  const mockServer = setupServer();

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url}`);
      },
    });

    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv();

    trackAndTraceContract = testEnv.trackAndTraceContract;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => trackAndTraceContract.address,
    );

    // Mock TrackAndTrace contract
    vi.spyOn(TrackAndTrace__factory, "connect").mockImplementation(
      () => trackAndTraceContract,
    );

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(trackAndTraceContract),
    );

    // Generate key pair for Authorisation API v4 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    const createAccessToken = (sub: string, scp: string) => {
      return new SignJWT({ sub, scp })
        .setProtectedHeader({
          typ: "JWT",
          alg: "ES256",
          kid: authApiKid,
        })
        .sign(authApiKeyPair.privateKey);
    };

    user1.accessToken.tntAuthorise = await createAccessToken(
      user1.did,
      "openid tnt_authorise",
    );
    user1.accessToken.tntCreate = await createAccessToken(
      user1.did,
      "openid tnt_create",
    );
    user1.accessToken.tntWrite = await createAccessToken(
      user1.did,
      "openid tnt_write",
    );

    user2.accessToken.tntAuthorise = await createAccessToken(
      user2.did,
      "openid tnt_authorise",
    );
    user2.accessToken.tntCreate = await createAccessToken(
      user2.did,
      "openid tnt_create",
    );
    user2.accessToken.tntWrite = await createAccessToken(
      user2.did,
      "openid tnt_write",
    );

    user3.accessToken.tntAuthorise = await createAccessToken(
      user3.did,
      "openid tnt_authorise",
    );
    user3.accessToken.tntCreate = await createAccessToken(
      user3.did,
      "openid tnt_create",
    );
    user3.accessToken.tntWrite = await createAccessToken(
      user3.did,
      "openid tnt_write",
    );

    // Mock Auth API and DIDR API
    const authorisationApiUrl = configService.get("authorisationApiUrl", {
      infer: true,
    });
    const didRegistryApiUrl = configService.get("didRegistryApiUrl", {
      infer: true,
    });

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
      // Mock users 1 and 2 DID documents (the documents don't matter, they just need to exist)
      http.get(`${didRegistryApiUrl}/identifiers/${encodeDid(user1.did)}`, () =>
        HttpResponse.json({}),
      ),
      http.get(`${didRegistryApiUrl}/identifiers/${encodeDid(user2.did)}`, () =>
        HttpResponse.json({}),
      ),
    );

    // Grant "write" access to user1 and user3 on documentsWithBlockSource[0]
    const { creatorAccount } = testEnv;
    const document = testEnv.documentsWithBlockSource[0]!;

    const txWrite1 = await trackAndTraceContract.grantAccess(
      document.documentHash,
      Buffer.from(creatorAccount),
      await didToHex(user1.did),
      0,
      0,
      1,
    );

    await txWrite1.wait();

    const txWrite2 = await trackAndTraceContract.grantAccess(
      document.documentHash,
      Buffer.from(creatorAccount),
      await didToHex(user3.did),
      0,
      1,
      1,
    );

    await txWrite2.wait();
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
        sub: user1.did,
        scp: "openid tnt_authorise",
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
        sub: user1.did,
        scp: "openid tnt_authorise",
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
      expect.assertions(4);

      let response = await request(server)
        .post("/jsonrpc")
        .auth(user1.accessToken.tntAuthorise, { type: "bearer" })
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
        .post("/jsonrpc")
        .auth(user1.accessToken.tntAuthorise, { type: "bearer" })
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
        .post("/jsonrpc")
        .auth(user1.accessToken.tntAuthorise, { type: "bearer" })
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

      const param1 = {
        from: user1.wallet.address,
        senderDid: user1.did,
        authorisedDid: user1.did,
        whiteList: true,
      } satisfies AuthoriseDidSchema;

      const param2 = {
        from: user1.wallet.address,
        senderDid: user1.did,
        authorisedDid: user1.did,
        whiteList: false,
      } satisfies AuthoriseDidSchema;

      const accessToken = user1.accessToken.tntAuthorise;

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "authoriseDid",
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
          method: "authoriseDid",
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

    it("should throw an error if the from attribute is not a valid Ethereum address", async () => {
      expect.assertions(2);

      const accessToken = user1.accessToken.tntAuthorise;
      const param = {
        from: "0x123",
        senderDid: user1.did,
        authorisedDid: user1.did,
        whiteList: true,
      } satisfies AuthoriseDidSchema;

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "authoriseDid",
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
    { test: "authoriseDid", user: user1 },
    { test: "createDocument", user: user1 },
    {
      test: "createDocument(external timestamp)",
      user: user1,
    },
    { test: "grantAccess", user: user1 },
    { test: "grantAccess(granted by did:key)", user: user3 },
    { test: "revokeAccess(revoked by did:key)", user: user3 },
    { test: "revokeAccess", user: user1 },
    { test: "writeEvent", user: user1 },
    { test: "writeEvent", user: user3 },
    { test: "writeEvent(external timestamp)", user: user1 },
    { test: "removeDocument", user: user1 },
  ] as const)(
    "/jsonrpc with method $test (user: $user.did)",
    ({ test, user }) => {
      const method = test
        .replace("(external timestamp)", "")
        .replace("(granted by did:key)", "")
        .replace("(revoked by did:key)", "");

      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(4);

        let param: JsonRpcParams;
        let accessToken: string;
        const signer = user.wallet;

        switch (test) {
          case "authoriseDid": {
            param = {
              from: signer.address,
              senderDid: user.did,
              authorisedDid: user.did,
              whiteList: true,
            } satisfies AuthoriseDidSchema;
            accessToken = user.accessToken.tntAuthorise;
            break;
          }
          case "createDocument": {
            param = {
              from: signer.address,
              documentHash: documentHash1,
              documentMetadata: "test metadata",
              didEbsiCreator: user.did,
            } satisfies CreateDocumentSchema;
            accessToken = user.accessToken.tntCreate;
            break;
          }
          case "createDocument(external timestamp)": {
            param = {
              from: signer.address,
              documentHash: documentHash2,
              documentMetadata: "test metadata",
              didEbsiCreator: user.did,
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies CreateDocumentSchema;
            accessToken = user.accessToken.tntCreate;
            break;
          }
          case "grantAccess": {
            // access granted by a did:ebsi
            param = {
              from: signer.address,
              documentHash: documentHash2,
              grantedByAccount: await didToHex(user.did),
              subjectAccount: await didToHex(user3.did),
              grantedByAccType: AccountType.DID_EBSI,
              subjectAccType: AccountType.DID_KEY,
              permission: Permission.DELEGATE,
            } satisfies GrantAccessSchema;
            accessToken = user1.accessToken.tntWrite;
            break;
          }
          case "grantAccess(granted by did:key)": {
            param = {
              from: signer.address,
              documentHash: documentHash2,
              grantedByAccount: await didToHex(user3.did),
              subjectAccount: await didToHex(user2.did),
              grantedByAccType: AccountType.DID_KEY,
              subjectAccType: AccountType.DID_EBSI,
              permission: Permission.WRITE,
            } satisfies GrantAccessSchema;
            accessToken = user3.accessToken.tntWrite;
            break;
          }
          case "revokeAccess(revoked by did:key)": {
            // access revoked by a did:key
            param = {
              from: signer.address,
              documentHash: documentHash2,
              revokedByAccount: await didToHex(user3.did),
              subjectAccount: await didToHex(user2.did),
              permission: 1,
            } satisfies RevokeAccessSchema;
            accessToken = user3.accessToken.tntWrite;
            break;
          }
          case "revokeAccess": {
            // access revoked by a did:ebsi
            param = {
              from: signer.address,
              documentHash: documentHash2,
              revokedByAccount: await didToHex(user.did),
              subjectAccount: await didToHex(user3.did),
              permission: 0,
            } satisfies RevokeAccessSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          case "writeEvent": {
            const document = testEnv.documentsWithBlockSource[0]!;
            param = {
              from: signer.address,
              eventParams: {
                documentHash: document.documentHash,
                externalHash: `0x${randomBytes(32).toString("hex")}`,
                sender: await didToHex(user.did),
                origin: "",
                metadata: "test event metadata",
              },
            } satisfies WriteEventSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          case "writeEvent(external timestamp)": {
            const document = testEnv.documentsWithBlockSource[0]!;
            param = {
              from: signer.address,
              eventParams: {
                documentHash: document.documentHash,
                externalHash: `0x${randomBytes(32).toString("hex")}`,
                sender: await didToHex(user.did),
                origin: "",
                metadata: "test event metadata",
              },
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies WriteEventSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          case "removeDocument": {
            param = {
              from: signer.address,
              documentHash: documentHash1,
            } satisfies RemoveDocumentSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          default: {
            // TS will return an error if we forget to cover a case
            const exhaustiveCheck: never = test;
            throw new Error(
              `Test Error: Invalid method ${exhaustiveCheck as string}`,
            );
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

        switch (test) {
          case "authoriseDid": {
            testSetup.push({
              params: {
                from: signer.address,
                senderDid: user.did,
                authorisedDid: "not did",
                whiteList: true,
              } satisfies AuthoriseDidSchema,
              expectedErrorMessage: `Invalid 'params.0.authorisedDid': The DID must start with "did:ebsi:"`,
              accessToken: user2.accessToken.tntAuthorise,
            });

            testSetup.push({
              params: {
                from: signer.address,
                senderDid: user.did,
                authorisedDid:
                  "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
                whiteList: true,
              } satisfies AuthoriseDidSchema,
              expectedErrorMessage:
                "Invalid 'params.0.authorisedDid': Unsupported version \"2\"",
              accessToken: user.accessToken.tntAuthorise,
            });

            const randomAuthorisedDid = EbsiWallet.createDid();
            const didRegistryApiUrl = configService.get("didRegistryApiUrl", {
              infer: true,
            });
            mockServer.use(
              http.get(
                `${didRegistryApiUrl}/identifiers/${encodeDid(randomAuthorisedDid)}`,
                () =>
                  HttpResponse.json(
                    {
                      title: "Identifier Not Found",
                      status: 404,
                      type: "about:blank",
                      detail: `Identifier ${randomAuthorisedDid} not found`,
                    },
                    { status: 404 },
                  ),
              ),
            );

            testSetup.push({
              params: {
                from: signer.address,
                senderDid: user.did,
                authorisedDid: randomAuthorisedDid, // Random DID that doesn't exist
                whiteList: true,
              } satisfies AuthoriseDidSchema,
              expectedErrorMessage: `Invalid 'params.0.authorisedDid': Identifier ${randomAuthorisedDid} not found | Registry used: https://api-test.ebsi.eu/did-registry/v5/identifiers`,
              accessToken: user.accessToken.tntAuthorise,
            });

            testSetup.push({
              params: {
                from: signer.address,
                senderDid: EbsiWallet.createDid(), // senderDid doesn't match the access token subject
                authorisedDid: user2.did,
                whiteList: true,
              } satisfies AuthoriseDidSchema,
              expectedErrorMessage:
                "Access token sub doesn't match the DID from the payload",
              accessToken: user.accessToken.tntAuthorise,
            });

            break;
          }
          case "createDocument": {
            testSetup.push({
              params: {
                from: signer.address,
                documentHash: `0x${randomBytes(32).toString("hex")}`,
                documentMetadata: "test metadata",
                didEbsiCreator: user.did,
              } satisfies CreateDocumentSchema,
              expectedErrorMessage:
                "'createDocument' requires an access token with the scope 'tnt_create'",
              accessToken: user.accessToken.tntAuthorise,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: `bad-document-hash`,
                documentMetadata: "test metadata",
                didEbsiCreator: user.did,
              } satisfies CreateDocumentSchema,
              expectedErrorMessage:
                "Invalid 'params.0.documentHash': Must start with 0x",
              accessToken: user.accessToken.tntCreate,
            });

            break;
          }
          case "createDocument(external timestamp)": {
            testSetup.push({
              params: {
                from: signer.address,
                documentHash: `0x${randomBytes(32).toString("hex")}`,
                documentMetadata: "test metadata",
                didEbsiCreator: user.did,
                timestamp: "bad-timestamp",
                timestampProof: `0x${randomBytes(32).toString("hex")}`,
              } satisfies CreateDocumentSchema,
              expectedErrorMessage:
                "Invalid 'params.0.timestamp': Invalid input",
              accessToken: user.accessToken.tntCreate,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: `0x${randomBytes(32).toString("hex")}`,
                documentMetadata: "test metadata",
                didEbsiCreator: user.did,
                timestamp: Math.floor(Date.now() / 1000),
                timestampProof: "bad proof",
              } satisfies CreateDocumentSchema,
              expectedErrorMessage:
                "Invalid 'params.0.timestampProof': Must start with 0x",
              accessToken: user.accessToken.tntCreate,
            });

            break;
          }
          case "grantAccess": {
            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                grantedByAccount: `0x${Buffer.from("bad did").toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: AccountType.DID_EBSI,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0.grantedByAccount': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                grantedByAccount: `0x${Buffer.from(user1.did).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: 10,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0.subjectAccType': Number must be 0 (did:ebsi) or 1 (did:key)",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                grantedByAccount: `0x${Buffer.from(user1.did).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: AccountType.DID_KEY,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0': subjectAccount and subjectAccType don't match",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                grantedByAccount: `0x${Buffer.from(user1.did).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_KEY,
                subjectAccType: AccountType.DID_EBSI,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0': grantedByAccount and grantedByAccType don't match",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                // Random DID, doesn't match with access token sub
                grantedByAccount: `0x${Buffer.from(EbsiWallet.createDid()).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: AccountType.DID_EBSI,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Access token sub doesn't match the DID from the payload",
              accessToken: user1.accessToken.tntWrite,
            });

            break;
          }
          case "grantAccess(granted by did:key)": {
            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                grantedByAccount: `0x${Buffer.from("bad did").toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: AccountType.DID_EBSI,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0.grantedByAccount': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                grantedByAccount: `0x${Buffer.from(user1.did).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: 10,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0.subjectAccType': Number must be 0 (did:ebsi) or 1 (did:key)",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                // Random DID, doesn't match with access token sub
                grantedByAccount: `0x${Buffer.from(EbsiWallet.createDid()).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                grantedByAccType: AccountType.DID_EBSI,
                subjectAccType: AccountType.DID_EBSI,
                permission: Permission.DELEGATE,
              } satisfies GrantAccessSchema,
              expectedErrorMessage:
                "Access token sub doesn't match the DID from the payload",
              accessToken: user1.accessToken.tntWrite,
            });

            break;
          }
          case "revokeAccess(revoked by did:key)":
          case "revokeAccess": {
            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                revokedByAccount: `0x${Buffer.from("bad did").toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                permission: 0,
              } satisfies RevokeAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0.revokedByAccount': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
              accessToken: user1.accessToken.tntWrite,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: documentHash2,
                revokedByAccount: `0x${Buffer.from(user1.did).toString("hex")}`,
                subjectAccount: `0x${Buffer.from(user2.did).toString("hex")}`,
                permission: 10,
              } satisfies RevokeAccessSchema,
              expectedErrorMessage:
                "Invalid 'params.0.permission': Number must be 0 (delegate) or 1 (write)",
              accessToken: user1.accessToken.tntWrite,
            });

            break;
          }
          case "writeEvent": {
            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(user.did),
                  origin: "",
                  metadata: "test event metadata",
                },
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntCreate,
              expectedErrorMessage:
                "'writeEvent' requires an access token with the scope 'tnt_write'",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: `bad-document-hash`, // Invalid hash
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(user.did),
                  origin: "",
                  metadata: "test event metadata",
                },
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Invalid 'params.0.eventParams.documentHash': Must start with 0x",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: user.did, // DID is not encoded in hexadecimal
                  origin: "",
                  metadata: "test event metadata",
                },
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage: "Invalid 'params.0.eventParams.sender",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: `0x${randomBytes(32).toString("hex")}`, // Not a DID
                  origin: "",
                  metadata: "test event metadata",
                },
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Invalid 'params.0.eventParams.sender': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(EbsiWallet.createDid()),
                  origin: "",
                  metadata: "test event metadata",
                },
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Access token sub doesn't match the DID from the payload",
            });

            break;
          }
          case "writeEvent(external timestamp)": {
            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(user.did),
                  origin: "",
                  metadata: "test event metadata",
                },
                timestamp: Math.floor(Date.now() / 1000),
                timestampProof: `0x${randomBytes(32).toString("hex")}`,
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntCreate,
              expectedErrorMessage:
                "'writeEvent' requires an access token with the scope 'tnt_write'",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: `bad-document-hash`, // Invalid hash
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(user.did),
                  origin: "",
                  metadata: "test event metadata",
                },
                timestamp: Math.floor(Date.now() / 1000),
                timestampProof: `0x${randomBytes(32).toString("hex")}`,
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Invalid 'params.0.eventParams.documentHash': Must start with 0x",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: user.did, // DID is not encoded in hexadecimal
                  origin: "",
                  metadata: "test event metadata",
                },
                timestamp: Math.floor(Date.now() / 1000),
                timestampProof: `0x${randomBytes(32).toString("hex")}`,
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage: "Invalid 'params.0.eventParams.sender",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: `0x${randomBytes(32).toString("hex")}`, // Not a DID
                  origin: "",
                  metadata: "test event metadata",
                },
                timestamp: Math.floor(Date.now() / 1000),
                timestampProof: `0x${randomBytes(32).toString("hex")}`,
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Invalid 'params.0.eventParams.sender': The public key must be secp256k1 uncompressed (64 bytes or 65 bytes with 0x04 prefix)",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(user.did),
                  origin: "",
                  metadata: "test event metadata",
                },
                timestamp: "bad-timestamp",
                timestampProof: `0x${randomBytes(32).toString("hex")}`,
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Invalid 'params.0.timestamp': Invalid input",
            });

            testSetup.push({
              params: {
                from: signer.address,
                eventParams: {
                  documentHash: documentHash1,
                  externalHash: `0x${randomBytes(32).toString("hex")}`,
                  sender: await didToHex(user.did),
                  origin: "",
                  metadata: "test event metadata",
                },
                timestamp: Math.floor(Date.now() / 1000),
                timestampProof: "bad-proof",
              } satisfies WriteEventSchema,
              accessToken: user.accessToken.tntWrite,
              expectedErrorMessage:
                "Invalid 'params.0.timestampProof': Must start with 0x",
            });

            break;
          }
          case "removeDocument": {
            testSetup.push({
              params: {
                from: signer.address,
                documentHash: `0x${randomBytes(32).toString("hex")}`,
              } satisfies RemoveDocumentSchema,
              expectedErrorMessage:
                "'removeDocument' requires an access token with the scope 'tnt_write'",
              accessToken: user.accessToken.tntAuthorise,
            });

            testSetup.push({
              params: {
                from: signer.address,
                documentHash: `bad-document-hash`,
              } satisfies RemoveDocumentSchema,
              expectedErrorMessage:
                "Invalid 'params.0.documentHash': Must start with 0x",
              accessToken: user.accessToken.tntWrite,
            });

            break;
          }
          default: {
            // TS will return an error if we forget to cover a case
            const exhaustiveCheck: never = test;
            throw new Error(
              `Test Error: Invalid method ${exhaustiveCheck as string}`,
            );
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
    },
  );
});
