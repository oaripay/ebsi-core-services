import { describe } from "@jest/globals";
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
import { createJWT, ES256KSigner } from "did-jwt";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JwtTarVefifyResult } from "@cef-ebsi/oauth2-auth";
import { useContainer } from "class-validator";
import { calculateJwkThumbprint, JWK, JWTVerifyResult } from "jose";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry-v4";
import { AsyncReturnType } from "@ebsiint-api/shared";
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

jest.mock("@cef-ebsi/oauth2-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/oauth2-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

jest.mock("@cef-ebsi/siop-auth", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const originalModule = jest.requireActual("@cef-ebsi/siop-auth");

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    __esModule: true,
    ...originalModule,
    verifyJwtTar: jest.fn(),
  };
});

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
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let ledgerService: LedgerService;

  let appAccessToken: string;
  let adminAccessToken: string;
  let testUserAccessToken: string;

  let adminSigner: ethers.Wallet;
  let adminDid: string;
  let testUser: UserDetails;

  let publicKeyJwk2: JWK;
  let thumbprint2: string;
  let publicKeyJwk3: JWK;
  let thumbprint3: string;

  const mockAuthOAuth2 = jest.spyOn(OAuth2Lib, "verifyJwtTar");
  const mockAuthSiop = jest.spyOn(SiopLib, "verifyJwtTar");

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocuments: 2,
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

    adminSigner = ethers.Wallet.createRandom();
    adminDid = testEnv.users[0].did;
    testUser = await createUser();

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

    // Mock libraries
    mockAuthOAuth2.mockImplementation(
      async (): Promise<JwtTarVefifyResult> =>
        Promise.reject(
          new Error("Forgot to implement the mock for OAuth2 verifyJwtTar?")
        )
    );

    mockAuthSiop.mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.reject(
          new Error("Forgot to implement the mock for Siop verifyJwtTar?")
        )
    );

    // Generate JWTs
    appAccessToken = await createJWT(
      { sub: "random-app" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      }
    );

    adminAccessToken = await createJWT(
      { sub: adminDid, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      }
    );

    testUserAccessToken = await createJWT(
      { sub: testUser.did, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
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
          "Invalid Authorisation Token: invalid_argument: Incorrect format JWT",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should reject a POST with an invalid app token", async () => {
      expect.assertions(4);

      // Mock reject JWT
      const verifyAccessTokenSpy = mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVefifyResult> =>
          Promise.reject(new Error("error message"))
      );

      const response = await request(server)
        .post("/jsonrpc")
        .auth(appAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: error message",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
      expect(verifyAccessTokenSpy).toHaveBeenCalledWith(appAccessToken, {
        op: "authorisation-api",
        trustedAppsRegistry: `${configService.get<string>(
          "trustedAppsRegistryApiUrl"
        )}/apps`,
        timeout: expect.any(Number) as number,
      });
    });

    it("should reject a POST with an invalid user token", async () => {
      expect.assertions(4);

      // Mock reject JWT
      const verifyAccessTokenSpy = mockAuthSiop.mockImplementation(async () =>
        Promise.reject(new Error("error message"))
      );

      const response = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: error message",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
      expect(verifyAccessTokenSpy).toHaveBeenCalledWith(testUserAccessToken, {
        audience: "ebsi-core-services",
        trustedAppsRegistry: `${configService.get<string>(
          "trustedAppsRegistryApiUrl"
        )}/apps`,
        timeout: expect.any(Number) as number,
      });
    });

    it("should throw Bad Request for a bad JSON-RPC call", async () => {
      expect.assertions(2);

      // Mock access token verification
      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVefifyResult> =>
          Promise.resolve({ payload: {} } as JwtTarVefifyResult)
      );

      const response = await request(server)
        .post("/jsonrpc")
        .auth(appAccessToken, { type: "bearer" })
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

      // Mock access token verification
      mockAuthOAuth2.mockImplementation(
        async (): Promise<JwtTarVefifyResult> =>
          Promise.resolve({ payload: {} } as JwtTarVefifyResult)
      );

      const response = await request(server)
        .post("/jsonrpc")
        .auth(appAccessToken, { type: "bearer" })
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
          ) as string,
        },
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult)
      );

      const now = Math.floor(Date.now() / 1000);
      const notBefore = now;
      const notAfter = now + 300;

      const param1 = {
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

      const param2 = {
        from: testUser.wallet.address,
        did: testUser.did,
        baseDocument: JSON.stringify({
          "@context": testUser.didDocument["@context"],
        }),
        vMethodId: testUser.thumbprint,
        publicKey: testUser.wallet.publicKey,
        isSecp256k1: true,
        notBefore,
        notAfter: notAfter + 1,
      } as InsertDidDocumentParam;

      const accessToken = testUserAccessToken;

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
        JSON.parse(
          JSON.stringify(transaction1)
        ) as unknown as UnsignedTransaction
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
          ) as string,
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
          ) as string,
        },
      });
      expect(responseSend1.status).toBe(400);
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult)
      );

      const signer = adminSigner;
      const accessToken = testUserAccessToken;
      const now = Math.floor(Date.now() / 1000);
      const param = {
        from: signer.address,
        did: testUser.did,
        baseDocument: JSON.stringify({
          "@context": ["https://www.w3.org/ns/did/v1"],
        }),
        vMethodId: testUser.thumbprint,
        publicKey: testUser.wallet.publicKey,
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
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const method = testMethod
      .replace("(test update attribute)", "")
      .replace("(with optional params)", "")
      .replace("(without validTo)", "");

    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult)
      );

      let param: JsonRpcParams = null;
      let accessToken = adminAccessToken;
      const signer = adminSigner;

      const now = Math.floor(Date.now() / 1000);

      switch (method) {
        case "insertDidDocument": {
          param = {
            from: signer.address,
            did: testUser.did,
            baseDocument: JSON.stringify({
              "@context": ["https://www.w3.org/ns/did/v1"],
            }),
            vMethodId: testUser.thumbprint,
            publicKey: testUser.wallet.publicKey,
            isSecp256k1: true,
            notBefore: now,
            notAfter: now + 3600,
          } as InsertDidDocumentParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "updateBaseDocument": {
          param = {
            from: signer.address,
            did: testUser.did,
            baseDocument: JSON.stringify({
              "@context": testUser.didDocument["@context"],
            }),
          } as UpdateBaseDocumentParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "addController": {
          param = {
            from: signer.address,
            did: testUser.did,
            controller: adminDid,
          } as AddControllerParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "revokeController": {
          param = {
            from: signer.address,
            did: testUser.did,
            controller: adminDid,
          } as RevokeControllerParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "addVerificationMethod": {
          param = {
            from: signer.address,
            did: testUser.did,
            vMethodId: thumbprint2,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk2)).toString(
              "hex"
            )}`,
            isSecp256k1: false,
          } as AddVerificationMethodParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "addVerificationRelationship": {
          param = {
            from: signer.address,
            did: testUser.did,
            name: "assertionMethod",
            vMethodId: testUser.thumbprint,
            notBefore: now,
            notAfter: now + 3600,
          } as AddVerificationRelationshipParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "expireVerificationMethod": {
          param = {
            from: signer.address,
            did: testUser.did,
            vMethodId: thumbprint2,
            notAfter: now + 600,
          } as ExpireVerificationMethodParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "revokeVerificationMethod": {
          param = {
            from: signer.address,
            did: testUser.did,
            vMethodId: thumbprint2,
            notAfter: now - 600,
          } as RevokeVerificationMethodParam;

          accessToken = testUserAccessToken;

          break;
        }

        case "rollVerificationMethod": {
          param = {
            from: signer.address,
            did: testUser.did,
            vMethodId: thumbprint3,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk3)).toString(
              "hex"
            )}`,
            isSecp256k1: false,
            notBefore: now,
            notAfter: now + 3600,
            oldVMethodId: thumbprint2,
            duration: 360,
          } as RollVerificationMethodParam;

          break;
        }

        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
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
          chainId: expect.any(String) as string,
          data: expect.any(String) as string,
          from: param.from,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: "0x0",
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
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
        result: expect.any(String) as string,
      });
      expect(responseSend.status).toBe(200);
    });

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult)
      );

      const signer = adminSigner;

      const testSetup: {
        params: JsonRpcParams;
        expectedErrorMessage: string;
        accessToken?: string;
      }[] = [];

      const now = Math.floor(Date.now() / 1000);

      switch (method) {
        case "insertDidDocument": {
          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              baseDocument: JSON.stringify({
                "@context": testUser.didDocument["@context"],
              }),
              vMethodId: testUser.thumbprint,
              publicKey: testUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              baseDocument: "{}",
              vMethodId: testUser.thumbprint,
              publicKey: testUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              // authentication can not be in the base document
              baseDocument: '{"@context":[],"authentication":[]}',
              vMethodId: testUser.thumbprint,
              publicKey: testUser.wallet.publicKey,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              baseDocument: JSON.stringify({
                "@context": testUser.didDocument["@context"],
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
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              baseDocument: JSON.stringify({
                "@context": testUser.didDocument["@context"],
              }),
              vMethodId: testUser.thumbprint,
              publicKey: `0x${crypto.randomBytes(35).toString("hex")}`,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: The public key must be of 33 bytes (secp256k1 compressed) or 65 bytes (secp256k1 uncompressed)",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              baseDocument: JSON.stringify({
                "@context": testUser.didDocument["@context"],
              }),
              vMethodId: testUser.thumbprint,
              publicKey: `0x00${crypto.randomBytes(32).toString("hex")}`,
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "Validation error: Invalid public key. Unknown point format",
            accessToken: testUserAccessToken,
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
              did: testUser.did,
              baseDocument: JSON.stringify({
                "@context": testUser.didDocument["@context"],
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
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "updateBaseDocument": {
          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              baseDocument: "{}",
            } as UpdateBaseDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              // authentication can not be in the base document
              baseDocument: '{"@context":[],"authentication":[]}',
            } as UpdateBaseDocumentParam,
            expectedErrorMessage:
              "Validation error: baseDocument must be a valid JSON string with at least the field @context and without verification methods, verification relationships, controllers or id",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "addController": {
          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              controller: adminDid,
            } as AddControllerParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              controller:
                "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
            } as AddControllerParam,
            expectedErrorMessage:
              "Validation error: controller must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "revokeController": {
          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              controller: adminDid,
            } as RevokeControllerParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              controller:
                "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
            } as RevokeControllerParam,
            expectedErrorMessage:
              "Validation error: controller must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "addVerificationMethod": {
          const publicKeyJwk = {
            kty: "OKP",
            crv: "Ed25519",
            x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
          };
          const thumbprint = await calculateJwkThumbprint(publicKeyJwk);

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              vMethodId: "bad vMethodId",
              publicKey: Buffer.from(JSON.stringify(publicKeyJwk)).toString(
                "hex"
              ),
              isSecp256k1: false,
            } as AddVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: vMethodId must be the thumbprint of the publicKey",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              vMethodId: thumbprint,
              publicKey: "0x32313029",
              isSecp256k1: false,
            } as AddVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: Invalid public key. Unexpected token ) in JSON at position 3",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "addVerificationRelationship": {
          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              name: "assertionMethod",
              vMethodId: testUser.thumbprint,
              notBefore: now,
              notAfter: now + 3600,
            } as AddVerificationRelationshipParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              name: "assertionMethod",
              vMethodId: testUser.thumbprint,
              notBefore: now,
              notAfter: -10,
            } as AddVerificationRelationshipParam,
            expectedErrorMessage:
              "Validation error: notAfter must not be less than 0",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              name: "bad-name",
              vMethodId: testUser.thumbprint,
              notBefore: now,
              notAfter: now + 3600,
            } as AddVerificationRelationshipParam,
            expectedErrorMessage:
              "Validation error: name must be one of the following values: authentication, assertionMethod, keyAgreement, capabilityInvocation, capabilityDelegation",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "expireVerificationMethod": {
          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              vMethodId: testUser.thumbprint,
              notAfter: -10,
            } as ExpireVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: notAfter must not be less than 0",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              vMethodId: testUser.thumbprint,
              notAfter: now + 600,
            } as ExpireVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "revokeVerificationMethod": {
          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              vMethodId: testUser.thumbprint,
              notAfter: -10,
            } as RevokeVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: notAfter must not be less than 0",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: "did:ebsi:znxntxQrN369GsNyjFjYb8fuvU7g3sJGyYGwMTcUGdzuy",
              vMethodId: testUser.thumbprint,
              notAfter: now - 600,
            } as RevokeVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          break;
        }

        case "rollVerificationMethod": {
          testSetup.push({
            params: {
              from: signer.address,
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
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: did must be a valid DID v1",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              vMethodId: "bad-thumbprint",
              publicKey:
                "0x0467ae84170dd193fd47d864caeaa36e995d62cab4a258cb9b7234b8cc6bb8aa5d6f4313b6f819d8334d4262094005700429c0e4e23b1e5427160f23f43c643d12",
              isSecp256k1: true,
              notBefore: now,
              notAfter: now + 3600,
              oldVMethodId: thumbprint2,
              duration: 360,
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: vMethodId must be the thumbprint of the publicKey",
            accessToken: testUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              did: testUser.did,
              vMethodId: thumbprint3,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk3)
              ).toString("hex")}`,
              isSecp256k1: false,
              notBefore: -10,
              notAfter: now + 3600,
              oldVMethodId: thumbprint2,
              duration: 360,
            } as RollVerificationMethodParam,
            expectedErrorMessage:
              "Validation error: notBefore must not be less than 0",
            accessToken: testUserAccessToken,
          });

          break;
        }

        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      expect.assertions(testSetup.length * 2);

      await Promise.all(
        testSetup.map(async (setup) => {
          const response = await request(server)
            .post("/jsonrpc")
            .auth(setup.accessToken ?? adminAccessToken, {
              type: "bearer",
            })
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
              message: expect.stringContaining(
                setup.expectedErrorMessage
              ) as string,
            },
          });
          expect(response.status).toBe(400);
        })
      );
    });
  });
});
