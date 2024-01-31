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
import { randomBytes } from "crypto";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
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
import type { GenerateKeyPairResult } from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  TrackAndTrace,
  TrackAndTrace__factory,
} from "@ebsiint-sc/track-and-trace";
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
} from "./validators/index.js";

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
  | RemoveDocumentSchema;

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let trackAndTraceRegistryContract: TrackAndTrace;
  let configService: ConfigService<ApiConfig, true>;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;

  let user1: UserDetails;
  let user2: UserDetails;
  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;
  const documentHash1 = `0x${randomBytes(32).toString("hex")}`;

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

    trackAndTraceRegistryContract = testEnv.trackAndTraceContract;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => trackAndTraceRegistryContract.address,
    );

    // Mock TrackAndTrace contract
    vi.spyOn(TrackAndTrace__factory, "connect").mockImplementation(
      () => trackAndTraceRegistryContract,
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

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(trackAndTraceRegistryContract),
    );

    // Generate key pair for Authorisation API v3 and create access token
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

    user1 = {
      did: "did:ebsi:zf62uhvaQuUZty6sMxz9qVV",
      wallet: ethers.Wallet.createRandom(),
      accessToken: {
        tntAuthorise: "",
        tntCreate: "",
        tntWrite: "",
      },
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

    user2 = {
      did: "did:ebsi:z25eGB9RuaYR1nQGpH6mvm4Q",
      wallet: ethers.Wallet.createRandom(),
      accessToken: {
        tntAuthorise: "",
        tntCreate: "",
        tntWrite: "",
      },
    };

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
        didEbsi: user1.did,
        whiteList: true,
      } satisfies AuthoriseDidSchema;

      const param2 = {
        from: user1.wallet.address,
        didEbsi: user1.did,
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
        didEbsi: user1.did,
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
    "authoriseDid",
    "createDocument",
    "createDocument(external timestamp)",
    "removeDocument",
  ] as const)("/jsonrpc with method %s", (m) => {
    const method = m.replace("(external timestamp)", "");
    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      let param: JsonRpcParams;
      let accessToken: string;
      const signer = ethers.Wallet.createRandom();

      switch (m) {
        case "authoriseDid": {
          param = {
            from: signer.address,
            didEbsi: user1.did,
            whiteList: true,
          } satisfies AuthoriseDidSchema;
          accessToken = user1.accessToken.tntAuthorise;
          break;
        }
        case "createDocument": {
          param = {
            from: signer.address,
            documentHash: documentHash1,
            documentMetadata: "test metadata",
            didEbsiCreator: user1.did,
          } satisfies CreateDocumentSchema;
          accessToken = user1.accessToken.tntCreate;
          break;
        }
        case "createDocument(external timestamp)": {
          param = {
            from: signer.address,
            documentHash: `0x${randomBytes(32).toString("hex")}`,
            documentMetadata: "test metadata",
            didEbsiCreator: user1.did,
            timestamp: Math.floor(Date.now() / 1000),
            timestampProof: `0x${randomBytes(32).toString("hex")}`,
          } satisfies CreateDocumentSchema;
          accessToken = user1.accessToken.tntCreate;
          break;
        }
        case "removeDocument": {
          param = {
            from: signer.address,
            documentHash: documentHash1,
          } satisfies RemoveDocumentSchema;
          accessToken = user1.accessToken.tntWrite;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${m as string}`);
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
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
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

      switch (m) {
        case "authoriseDid": {
          // Invalid access token (not the right sub)
          testSetup.push({
            params: {
              from: signer.address,
              didEbsi: user1.did,
              whiteList: true,
            } satisfies AuthoriseDidSchema,
            expectedErrorMessage:
              "Access token sub doesn't match the DID from the payload",
            accessToken: user2.accessToken.tntAuthorise,
          });

          testSetup.push({
            params: {
              from: signer.address,
              didEbsi: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              whiteList: true,
            } satisfies AuthoriseDidSchema,
            expectedErrorMessage:
              "Invalid 'params.0.didEbsi': Unsupported version \"2\"",
            accessToken: user1.accessToken.tntAuthorise,
          });

          break;
        }
        case "createDocument": {
          testSetup.push({
            params: {
              from: signer.address,
              documentHash: `0x${randomBytes(32).toString("hex")}`,
              documentMetadata: "test metadata",
              didEbsiCreator: user1.did,
            } satisfies CreateDocumentSchema,
            expectedErrorMessage:
              "'createDocument' requires an access token with the scope 'tnt_create'",
            accessToken: user1.accessToken.tntAuthorise,
          });

          testSetup.push({
            params: {
              from: signer.address,
              documentHash: `bad-document-hash`,
              documentMetadata: "test metadata",
              didEbsiCreator: user1.did,
            } satisfies CreateDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.documentHash': Must start with 0x",
            accessToken: user1.accessToken.tntCreate,
          });

          break;
        }
        case "createDocument(external timestamp)": {
          testSetup.push({
            params: {
              from: signer.address,
              documentHash: `0x${randomBytes(32).toString("hex")}`,
              documentMetadata: "test metadata",
              didEbsiCreator: user1.did,
              timestamp: "bad-timestamp",
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies CreateDocumentSchema,
            expectedErrorMessage: "Invalid 'params.0.timestamp': Invalid input",
            accessToken: user1.accessToken.tntCreate,
          });

          testSetup.push({
            params: {
              from: signer.address,
              documentHash: `0x${randomBytes(32).toString("hex")}`,
              documentMetadata: "test metadata",
              didEbsiCreator: user1.did,
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: "bad proof",
            } satisfies CreateDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.timestampProof': Must start with 0x",
            accessToken: user1.accessToken.tntCreate,
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
            accessToken: user1.accessToken.tntAuthorise,
          });

          testSetup.push({
            params: {
              from: signer.address,
              documentHash: `bad-document-hash`,
            } satisfies RemoveDocumentSchema,
            expectedErrorMessage:
              "Invalid 'params.0.documentHash': Must start with 0x",
            accessToken: user1.accessToken.tntWrite,
          });

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${m as string}`);
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
});
