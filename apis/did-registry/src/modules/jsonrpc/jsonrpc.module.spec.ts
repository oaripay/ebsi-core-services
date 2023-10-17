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
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { createJWT, ES256KSigner } from "did-jwt";
import * as OAuth2Lib from "@cef-ebsi/oauth2-auth";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JwtTarVerifyResult } from "@cef-ebsi/oauth2-auth";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import canonicalize from "canonicalize";
import { useContainer } from "class-validator";
import type { JWTVerifyResult } from "jose";
import type { HashName } from "multihashes";
import { DidRegistry, DidRegistry__factory } from "@ebsiint-sc/did-registry";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import {
  UnsignedTransaction,
  InsertHashAlgorithmParam,
  UpdateHashAlgorithmParam,
  InsertDidControllerParam,
  InsertDidDocumentParam,
  UpdateDidDocumentParam,
  UpdateDidControllerParam,
  RevokeDidControllerParam,
  AppendDidDocumentVersionHashParam,
  DetachDidDocumentVersionParam,
  AppendDidDocumentVersionMetadataParam,
  DetachDidDocumentVersionMetadataParam,
} from "./dto/index.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/didRegistry.js";
import {
  createDid,
  createDidDocument,
  createMetadata,
} from "../../../tests/utils/data.js";
import type { ApiConfig } from "../../config/configuration.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { JsonRpcService } from "./jsonrpc.service.js";

vi.mock("@cef-ebsi/oauth2-auth", async () => {
  const mod = await vi.importActual<typeof import("@cef-ebsi/oauth2-auth")>(
    "@cef-ebsi/oauth2-auth",
  );

  return {
    ...mod,
    verifyJwtTar: vi.fn(),
  };
});

vi.mock("@cef-ebsi/siop-auth", async () => {
  const mod = await vi.importActual<typeof import("@cef-ebsi/siop-auth")>(
    "@cef-ebsi/siop-auth",
  );

  return {
    ...mod,
    verifyJwtTar: vi.fn(),
  };
});

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertHashAlgorithmParam
  | UpdateHashAlgorithmParam
  | InsertDidDocumentParam
  | UpdateDidDocumentParam
  | InsertDidControllerParam
  | UpdateDidControllerParam
  | RevokeDidControllerParam
  | AppendDidDocumentVersionHashParam
  | DetachDidDocumentVersionParam
  | AppendDidDocumentVersionMetadataParam
  | DetachDidDocumentVersionMetadataParam;

interface DidDocumentDataset {
  didDocument: { [x: string]: unknown };
  didDocumentBuffer: Buffer;
  canonicalizedDidDocument: string;
  canonicalizedDidDocumentHash: string;
  timestampDataBuffer: Buffer;
  didVersionMetadataBuffer: Buffer;
}

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let didRegistryContract: DidRegistry;
  let didRegistryContractAddress: string;
  let configService: ConfigService<ApiConfig, true>;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let jsonRpcService: JsonRpcService;
  let appAccessToken: string;
  let adminAccessToken: string;
  let newUserAccessToken: string;

  let adminSigner: ethers.Wallet;
  let adminDid: string;
  let newUserDid: string;
  const badControllerDid = EbsiWallet.createDid();

  const multihashToNodeHashAlg: Partial<Record<HashName, string>> = {
    "sha2-256": "sha256",
    "sha2-512": "sha512",
    "sha3-224": "sha3-224",
    "sha3-256": "sha3-256",
    "sha3-384": "sha3-384",
    "sha3-512": "sha3-512",
  } as const;

  const computeHash = (value: string, multihash: HashName): string =>
    `0x${crypto
      .createHash(multihashToNodeHashAlg[multihash]!)
      .update(value, "utf-8")
      .digest()
      .toString("hex")}`;

  const prepareDidDocument = (
    did: string,
    multihash: HashName,
  ): DidDocumentDataset => {
    const didDocument = createDidDocument(did);

    const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

    // Canonicalize DID document
    // @ts-expect-error "canonicalize is not callable" <- the exported types are incorrect
    const canonicalizedDidDocument = (canonicalize(didDocument) as ReturnType<
      typeof canonicalize.default
    >)!;

    const canonicalizedDidDocumentHash = computeHash(
      canonicalizedDidDocument,
      multihash,
    );

    const timestampDataBuffer = Buffer.from(
      JSON.stringify({
        data: "test",
        r: crypto.randomBytes(8).toString("hex"),
      }),
    );
    const didVersionMetadataBuffer = Buffer.from(
      JSON.stringify(createMetadata()),
    );

    return {
      didDocument,
      didDocumentBuffer,
      canonicalizedDidDocument,
      canonicalizedDidDocumentHash,
      timestampDataBuffer,
      didVersionMetadataBuffer,
    };
  };

  let didDocument: DidDocumentDataset;
  let updatedDidDocument: DidDocumentDataset;
  let didDocumentInvalidMethod: DidDocumentDataset;
  const controllers: ethers.Wallet[] = [];

  const mockAuthOAuth2 = vi.spyOn(OAuth2Lib, "verifyJwtTar");
  const mockAuthSiop = vi.spyOn(SiopLib, "verifyJwtTar");

  beforeAll(async () => {
    // Spin up test blockchain (hardhat)
    testEnv = await setupTestEnv({
      didDocuments: 2,
    });

    didRegistryContract = testEnv.didRegistryContract;
    didRegistryContractAddress = didRegistryContract.address;

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

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);

    const firstAlgMultihash = testEnv.hashAlgorithms[0]!.multihash;

    adminSigner = testEnv.defaultController;
    adminDid = testEnv.didDocuments[0]!.did;
    newUserDid = createDid();

    didDocument = prepareDidDocument(newUserDid, firstAlgMultihash);
    updatedDidDocument = prepareDidDocument(newUserDid, firstAlgMultihash);
    didDocumentInvalidMethod = prepareDidDocument(
      badControllerDid,
      firstAlgMultihash,
    );

    // Mock Contract service
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(didRegistryContract),
    );

    // Mock libraries
    mockAuthOAuth2.mockImplementation(
      async (): Promise<JwtTarVerifyResult> =>
        Promise.reject(
          new Error("Forgot to implement the mock for OAuth2 verifyJwtTar?"),
        ),
    );

    mockAuthSiop.mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.reject(
          new Error("Forgot to implement the mock for Siop verifyJwtTar?"),
        ),
    );

    // Generate JWTs
    appAccessToken = await createJWT(
      { sub: "random-app" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      },
    );

    adminAccessToken = await createJWT(
      { sub: adminDid, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      },
    );

    newUserAccessToken = await createJWT(
      { sub: newUserDid, login_hint: "did_siop" },
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      },
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // Generic tests
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
        "Invalid Authorisation Token: invalid_argument: Incorrect format JWT",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid app token", async () => {
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = mockAuthOAuth2.mockImplementation(
      async (): Promise<JwtTarVerifyResult> =>
        Promise.reject(new Error("error message")),
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
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(appAccessToken, {
      op: "authorisation-api",
      trustedAppsRegistry: `${configService.get<string>(
        "trustedAppsRegistryApiUrl",
      )}/apps`,
      timeout: expect.any(Number),
    });
  });

  it("should reject a POST with an invalid user token", async () => {
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = mockAuthSiop.mockImplementation(async () =>
      Promise.reject(new Error("error message")),
    );

    const response = await request(server)
      .post("/jsonrpc")
      .auth(newUserAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail: "Invalid JWT: error message",
      status: 401,
      title: "Unauthorized",
      type: "about:blank",
    });
    expect(response.status).toBe(401);
    expect(
      (response.headers as { "content-type": string })["content-type"],
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(newUserAccessToken, {
      audience: "ebsi-core-services",
      trustedAppsRegistry: `${configService.get<string>(
        "trustedAppsRegistryApiUrl",
      )}/apps`,
      timeout: expect.any(Number),
    });
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    // Mock access token verification
    mockAuthOAuth2.mockImplementation(
      async (): Promise<JwtTarVerifyResult> =>
        Promise.resolve({ payload: {} } as JwtTarVerifyResult),
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

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: didRegistryContractAddress,
      data: didRegistryContract.interface.encodeFunctionData(
        "insertHashAlgorithm",
        ["0x0100", "sha-256", "2.16.840.1.101.3.4.2.1", "0x1", "sha2-256"],
      ),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction,
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    // Mock access token verification
    mockAuthOAuth2.mockImplementation(
      async (): Promise<JwtTarVerifyResult> =>
        Promise.resolve({ payload: {} } as JwtTarVerifyResult),
    );

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(appAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
        params: [
          {
            protocol: "eth",
            unsignedTransaction: transaction,
            r,
            s,
            v: `0x${Number(v).toString(16)}`,
            signedRawTransaction: sgnTx,
          },
        ],
        id: "45",
      });

    const { chainId } = await didRegistryContract.provider.getNetwork();
    const actualChainId = ethers.BigNumber.from(chainId).toHexString();

    expect(responseSend.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: `Invalid unsignedTransaction.chainId. Expected ${actualChainId}. Received 0x1b3b`,
      },
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an Invalid Request error for bad method", async () => {
    expect.assertions(2);

    // Mock access token verification
    mockAuthOAuth2.mockImplementation(
      async (): Promise<JwtTarVerifyResult> =>
        Promise.resolve({ payload: {} } as JwtTarVerifyResult),
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
          "The method 'unknown-method' is invalid",
        ),
      },
    });
    expect(response.status).toBe(400);
  });

  // EBSIINT-3464: sendSignedTransaction should throw an error if the DID document is not valid
  describe.each([
    "insertDidDocument",
    "updateDidDocument",
    "appendDidDocumentVersionHash",
    "detachDidDocumentVersionHash",
    "appendDidDocumentVersionMetadata",
    "detachDidDocumentVersionMetadata",
  ])("/jsonrpc with method sendSignedTransaction (%s)", (method: string) => {
    it(`should throw an error if the client tries to use ${method} with an invalid DID document`, async () => {
      expect.assertions(4);
      const wallet = ethers.Wallet.createRandom();
      const from = wallet.address;
      const did = createDid();

      // The DID document is incorrect because its "id" property is different from the DID of the JWT (newUserDid)
      const incorrectDidDocument = prepareDidDocument(did, "sha2-256");
      const {
        didDocumentBuffer,
        canonicalizedDidDocumentHash,
        timestampDataBuffer,
        didVersionMetadataBuffer,
      } = incorrectDidDocument;
      const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
      const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
      const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
      const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
        "hex",
      )}`;

      let data = "";

      switch (method) {
        case "insertDidDocument": {
          data = didRegistryContract.interface.encodeFunctionData(
            "insertDidDocument",
            [
              identifier,
              0, // hashAlgorithmId
              canonicalizedDidDocumentHash, // hashValue
              didVersionInfo,
              timestampData ?? "0x",
              didVersionMetadata ?? "0x",
            ],
          );
          break;
        }
        case "updateDidDocument": {
          data = didRegistryContract.interface.encodeFunctionData(
            "updateDidDocument",
            [
              identifier,
              0, // hashAlgorithmId
              canonicalizedDidDocumentHash, // hashValue
              didVersionInfo,
              timestampData ?? "0x",
              didVersionMetadata ?? "0x",
            ],
          );
          break;
        }
        case "appendDidDocumentVersionHash": {
          data = didRegistryContract.interface.encodeFunctionData(
            "appendDidDocumentVersionHash",
            [
              identifier,
              0, // hashAlgorithmId
              canonicalizedDidDocumentHash, // hashValue
              timestampData ?? "0x",
              didVersionInfo,
            ],
          );
          break;
        }
        case "detachDidDocumentVersionHash": {
          data = didRegistryContract.interface.encodeFunctionData(
            "detachDidDocumentVersionHash",
            [
              identifier,
              0, // hashAlgorithmId
              canonicalizedDidDocumentHash, // hashValue
              didVersionInfo,
            ],
          );
          break;
        }
        case "appendDidDocumentVersionMetadata": {
          data = didRegistryContract.interface.encodeFunctionData(
            "appendDidDocumentVersionMetadata",
            [identifier, didVersionInfo, didVersionMetadata],
          );
          break;
        }
        case "detachDidDocumentVersionMetadata": {
          data = didRegistryContract.interface.encodeFunctionData(
            "detachDidDocumentVersionMetadata",
            [identifier, didVersionInfo, didVersionMetadata],
          );
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const { chainId } = await didRegistryContract.provider.getNetwork();
      const actualChainId = ethers.BigNumber.from(chainId).toHexString();

      const nonceInt =
        await didRegistryContract.provider.getTransactionCount(from);

      const transaction = {
        from,
        to: didRegistryContractAddress,
        data,
        value: "0x0",
        nonce: ethers.BigNumber.from(nonceInt).toHexString(),
        chainId: actualChainId,
        gasLimit: "0x1000000",
        gasPrice: "0x0",
      };

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(transaction),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult),
      );

      const checkDidSpy = vi.spyOn(jsonRpcService, "checkDid");

      const responseSend = await request(server)
        .post("/jsonrpc")
        .auth(newUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method: "sendSignedTransaction",
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
          id: "45",
        });

      expect(checkDidSpy).toHaveBeenCalledTimes(1);
      expect(checkDidSpy).toHaveBeenCalledWith(
        newUserDid,
        identifier,
        didVersionInfo,
      );
      expect(responseSend.body).toStrictEqual({
        jsonrpc: "2.0",
        id: "45",
        error: {
          code: -32600,
          message: `DID document's "id" ${did} doesn't match JWT's DID ${newUserDid}`,
        },
      });
      expect(responseSend.status).toBe(400);
    });
  });

  // Tests to be repeated for every method
  describe.each([
    "insertHashAlgorithm",
    "updateHashAlgorithm",
    "insertDidDocument",
    "updateDidDocument",
    "insertDidController",
    "updateDidController",
    "revokeDidController",
    "appendDidDocumentVersionHash",
    "appendDidDocumentVersionHash(with optional params)",
    "detachDidDocumentVersionHash",
    "appendDidDocumentVersionMetadata",
    "detachDidDocumentVersionMetadata",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const withOptionalParams = testMethod.includes("(with optional params)");
    const method = testMethod
      .replace("(test update attribute)", "")
      .replace("(with optional params)", "")
      .replace("(without validTo)", "");

    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult),
      );

      let param: JsonRpcParams | null = null;
      let accessToken = adminAccessToken;
      let signer = adminSigner;

      switch (method) {
        case "insertHashAlgorithm": {
          param = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: signer.address,
            // ID of the hash we've just inserted via insertHashAlgorithm
            hashAlgorithmId: testEnv.hashAlgorithms.length,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;
          break;
        }
        case "insertDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;
          controllers.push(signer);

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "insertDidController": {
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const controller = ethers.Wallet.createRandom();
          controllers.push(controller);

          param = {
            from: signer.address,
            identifier,
            newControllerId: controller.address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "updateDidController": {
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const controller = controllers[controllers.length - 1]!;
          // Sign with the new controller
          signer = controller;

          param = {
            from: signer.address,
            identifier,
            newControllerId: controller.address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as UpdateDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "revokeDidController": {
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const controller = controllers[controllers.length - 1]!;

          param = {
            from: signer.address,
            identifier,
            oldControllerId: controller.address,
          } as RevokeDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            timestampDataBuffer,
            canonicalizedDidDocumentHash,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
          } as DetachDidDocumentVersionParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "appendDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as DetachDidDocumentVersionMetadataParam;

          accessToken = newUserAccessToken;

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
        ) as unknown as UnsignedTransaction,
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

    it("should accept a request without id", async () => {
      expect.assertions(2);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult),
      );

      const signer = adminSigner;
      let param: JsonRpcParams | null = null;
      let accessToken = adminAccessToken;

      switch (method) {
        case "insertHashAlgorithm": {
          param = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;
          break;
        }
        case "updateHashAlgorithm": {
          param = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;
          break;
        }
        case "insertDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const controllerId = ethers.Wallet.createRandom().address;

          param = {
            from: signer.address,
            identifier,
            newControllerId: controllerId,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "revokeDidController": {
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const controllerId = ethers.Wallet.createRandom().address;

          param = {
            from: signer.address,
            identifier,
            oldControllerId: controllerId,
          } as RevokeDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          param = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
          } as DetachDidDocumentVersionParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          accessToken = newUserAccessToken;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
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

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult),
      );

      const signer = adminSigner;

      const testSetup: {
        params: JsonRpcParams;
        expectedErrorMessage: string;
        accessToken?: string;
      }[] = [];

      switch (method) {
        case "insertHashAlgorithm": {
          testSetup.push({
            params: {
              from: signer.address,
              outputLength: -12,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 1,
              multihash: "sha2-256",
            } as InsertHashAlgorithmParam,
            expectedErrorMessage: "outputLength must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              outputLength: 256,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 3,
              multihash: "sha2-256",
            } as InsertHashAlgorithmParam,
            expectedErrorMessage: "status must not be greater than 2",
          });

          testSetup.push({
            params: {
              from: signer.address,
              outputLength: 256,
              ianaName: "",
              oid: "",
              status: 1,
              multihash: "sha-sha-sha-256",
            } as InsertHashAlgorithmParam,
            expectedErrorMessage: "multihash must be a valid multihash",
          });

          break;
        }
        case "updateHashAlgorithm": {
          testSetup.push({
            params: {
              from: signer.address,
              hashAlgorithmId: -1,
              outputLength: 256,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 1,
              multihash: "sha2-256",
            } as UpdateHashAlgorithmParam,
            expectedErrorMessage: "hashAlgorithmId must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              hashAlgorithmId: 1,
              outputLength: -1,
              ianaName: "sha-256",
              oid: "2.16.840.1.101.3.4.2.1",
              status: 1,
              multihash: "sha2-256",
            } as UpdateHashAlgorithmParam,
            expectedErrorMessage: "outputLength must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              hashAlgorithmId: 1,
              outputLength: 256,
              ianaName: "",
              oid: "",
              status: 1,
              multihash: "sha-sha-sha-256",
            } as UpdateHashAlgorithmParam,
            expectedErrorMessage: "multihash must be a valid multihash",
          });

          break;
        }
        case "insertDidDocument":
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;
          const randomHash = `0x${crypto.randomBytes(37).toString("hex")}`;
          const badDidVersionInfo = `0x${didDocumentInvalidMethod.didDocumentBuffer.toString(
            "hex",
          )}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: randomHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `Hash ${randomHash}'s length (296 bits) is different from the expected length (${
              testEnv.hashAlgorithms[0]!.outputLength
            } bits)`,
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: "0x1234ab",
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "didVersionInfo must be a DID document encoded in hexadecimal with a valid DID v1",
            accessToken: newUserAccessToken,
          });

          // Test case: DID document has an invalid `@context`
          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: `0x${Buffer.from(
                JSON.stringify({
                  // Invalid @context
                  "@context": "https://w3id.org/did/v1",
                  id: identifier,
                }),
              ).toString("hex")}`,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "didVersionInfo must be a DID document encoded in hexadecimal with a valid DID v1",
            accessToken: newUserAccessToken,
          });

          // Test case: DID document is missing an `id`
          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: `0x${Buffer.from(
                JSON.stringify({
                  "@context": "https://www.w3.org/ns/did/v1",
                }),
              ).toString("hex")}`,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage:
              "didVersionInfo must be a DID document encoded in hexadecimal with a valid DID v1",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 193,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: "Can't find hash algorithm with ID: 193",
            accessToken: newUserAccessToken,
          });

          const randomDid = createDid();
          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(randomDid).toString("hex")}`,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `Identifier ${randomDid} doesn't match JWT's DID ${newUserDid}`,
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `Identifier ${newUserDid} doesn't match JWT's DID ${adminDid}`,
            accessToken: adminAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: badDidVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam,
            expectedErrorMessage: `DID document's "id" ${badControllerDid} doesn't match JWT's DID ${newUserDid}`,
            accessToken: newUserAccessToken,
          });

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from("did:ebsi").toString("hex")}`,
              newControllerId: ethers.Wallet.createRandom().address,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage:
              "identifier must be a valid DID v1 encoded in hexadecimal",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
              newControllerId: "0x1234",
              notBefore: 1616408985883,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage: "newControllerId must be an Ethereum address",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
              newControllerId: ethers.Wallet.createRandom().address,
              notBefore: -123,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage: "notBefore must not be less than 0",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
              newControllerId: ethers.Wallet.createRandom().address,
              notBefore: 0,
              notAfter: 3232818053700,
            } as InsertDidControllerParam,
            expectedErrorMessage: `Identifier ${newUserDid} doesn't match JWT's DID ${adminDid}`,
            accessToken: adminAccessToken,
          });

          break;
        }
        case "revokeDidController": {
          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from("did:ebsi").toString("hex")}`,
              oldControllerId: ethers.Wallet.createRandom().address,
            } as RevokeDidControllerParam,
            expectedErrorMessage:
              "identifier must be a valid DID v1 encoded in hexadecimal",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
              oldControllerId: "0x1234",
            } as RevokeDidControllerParam,
            expectedErrorMessage: "oldControllerId must be an Ethereum address",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
            } as RevokeDidControllerParam,
            expectedErrorMessage: "oldControllerId must be an Ethereum address",
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
              oldControllerId: ethers.Wallet.createRandom().address,
            } as RevokeDidControllerParam,
            expectedErrorMessage: `Identifier ${newUserDid} doesn't match JWT's DID ${adminDid}`,
            accessToken: adminAccessToken,
          });

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: "0xnot-a-hash",
              didVersionInfo,
              timestampData,
            } as AppendDidDocumentVersionHashParam,
            expectedErrorMessage: "hashValue must be a hexadecimal number",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: "0x1234ab",

              timestampData,
            } as AppendDidDocumentVersionHashParam,
            expectedErrorMessage:
              "didVersionInfo must be a DID document encoded in hexadecimal with a valid DID v1",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
              timestampData: "0x1234ab",
            } as AppendDidDocumentVersionHashParam,
            expectedErrorMessage: "timestampData must be a hexadecimal JSON",
            accessToken: newUserAccessToken,
          });

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: "0xnot-a-hash",
              didVersionInfo,
            } as DetachDidDocumentVersionParam,
            expectedErrorMessage: "hashValue must be a hexadecimal number",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo: "0x1234ab",
            } as DetachDidDocumentVersionParam,
            expectedErrorMessage:
              "didVersionInfo must be a DID document encoded in hexadecimal with a valid DID v1",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              hashAlgorithmId: -1,
              hashValue: canonicalizedDidDocumentHash,
              didVersionInfo,
            } as DetachDidDocumentVersionParam,
            expectedErrorMessage: "hashAlgorithmId must not be less than 0",
            accessToken: newUserAccessToken,
          });

          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          testSetup.push({
            params: {
              from: signer.address,
              identifier: `0x${Buffer.from("did:ebsi").toString("hex")}`,
              didVersionInfo,
              didVersionMetadata,
            } as AppendDidDocumentVersionMetadataParam,
            expectedErrorMessage:
              "identifier must be a valid DID v1 encoded in hexadecimal",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              didVersionInfo: "0x1234ab",
              didVersionMetadata,
            } as AppendDidDocumentVersionMetadataParam,
            expectedErrorMessage:
              "didVersionInfo must be a DID document encoded in hexadecimal with a valid DID v1",
            accessToken: newUserAccessToken,
          });

          testSetup.push({
            params: {
              from: signer.address,
              identifier,
              didVersionInfo,
              didVersionMetadata: "0x",
            } as AppendDidDocumentVersionMetadataParam,
            expectedErrorMessage:
              "didVersionMetadata must be a hexadecimal JSON",
            accessToken: newUserAccessToken,
          });

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      expect.assertions(testSetup.length * 2);

      // Run requests sequentially
      // eslint-disable-next-line no-restricted-syntax
      for (const setup of testSetup) {
        // eslint-disable-next-line no-await-in-loop
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
            message: expect.stringContaining(setup.expectedErrorMessage),
          },
        });
        expect(response.status).toBe(400);
      }
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      // Mock access token verification
      mockAuthSiop.mockImplementation(async () =>
        Promise.resolve({ payload: {} } as JWTVerifyResult),
      );

      const signer = adminSigner;

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;
      let accessToken = adminAccessToken;

      switch (method) {
        case "insertHashAlgorithm": {
          param1 = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          param2 = {
            from: signer.address,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
            multihash: "sha2-256",
          } as InsertHashAlgorithmParam;

          break;
        }
        case "updateHashAlgorithm": {
          param1 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 1,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          param2 = {
            from: signer.address,
            hashAlgorithmId: 1,
            outputLength: 256,
            ianaName: "sha-256",
            oid: "2.16.840.1.101.3.4.2.1",
            status: 2,
            multihash: "sha2-256",
          } as UpdateHashAlgorithmParam;

          break;
        }
        case "insertDidDocument":
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = didDocument;
          const { didDocumentBuffer: didDocumentBuffer2 } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo1 = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionInfo2 = `0x${didDocumentBuffer2.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo1,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo2,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "insertDidController":
        case "updateDidController": {
          param1 = {
            from: signer.address,
            identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
            newControllerId: ethers.Wallet.createRandom().address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          param2 = {
            from: signer.address,
            identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
            newControllerId: ethers.Wallet.createRandom().address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "revokeDidController": {
          param1 = {
            from: signer.address,
            identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
            oldControllerId: ethers.Wallet.createRandom().address,
          } as RevokeDidControllerParam;

          param2 = {
            from: signer.address,
            identifier: `0x${Buffer.from(newUserDid).toString("hex")}`,
            oldControllerId: ethers.Wallet.createRandom().address,
          } as RevokeDidControllerParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;
          const { didDocumentBuffer: didDocumentBuffer2 } = didDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo1 = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionInfo2 = `0x${didDocumentBuffer2.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo1,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo2,
            ...(withOptionalParams && {
              timestampData,
            }),
          } as AppendDidDocumentVersionHashParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;
          const { didDocumentBuffer: didDocumentBuffer2 } = didDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo1 = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionInfo2 = `0x${didDocumentBuffer2.toString("hex")}`;

          param1 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo1,
          } as DetachDidDocumentVersionParam;

          param2 = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo: didVersionInfo2,
          } as DetachDidDocumentVersionParam;

          accessToken = newUserAccessToken;

          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex",
          )}`;
          const tamperedDidVersionMetadata = `0x${Buffer.from(
            JSON.stringify(createMetadata()),
          ).toString("hex")}`;

          param1 = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          param2 = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata: tamperedDidVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;

          accessToken = newUserAccessToken;

          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
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
          method,
          params: [param2],
          id: 232,
        });

      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const randomSigner = ethers.Wallet.createRandom();

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(transaction1),
        ) as unknown as UnsignedTransaction,
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
  });
});
