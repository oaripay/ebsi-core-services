import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import type { GenerateKeyPairResult } from "jose";

import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import { methodNotAllowed } from "@ebsiint-api/shared";
import * as StatusList2021CredentialHelpers from "@ebsiint-api/shared";
import { Tir__factory } from "@ebsiint-sc/trusted-issuers-registry";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
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
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from "vitest";

import type { IssuerObject } from "../../../tests/utils/tir.js";
import type { ApiConfig } from "../../config/configuration.js";
import type {
  AddIssuerProxyParam,
  InsertIssuerParam,
  SetAttributeDataParam,
  SetAttributeMetadataParam,
  UnsignedTransaction,
  UpdateIssuerParam,
  UpdateIssuerProxyParam,
} from "./dto/index.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";

import { createDidDocument } from "../../../tests/utils/data.js";
import { createIssuer, setupTestEnv } from "../../../tests/utils/tir.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { IssuerType } from "../issuers/issuers.constants.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";

type JsonRpcParams =
  | AddIssuerProxyParam
  | InsertIssuerParam
  | SetAttributeDataParam
  | SetAttributeMetadataParam
  | UpdateIssuerParam
  | UpdateIssuerProxyParam;

interface SupertestJsonRpcResponse {
  body: JsonRpcResponseObject;
  status: number;
}

/**
 * Escape DID in URLs mocked by MSW
 * @see https://github.com/mswjs/msw/discussions/739#discussioncomment-2524732
 */
function escapeDid(url: string) {
  return url.replace("did:ebsi:", String.raw`did\:ebsi\:`);
}

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let tirContract: Tir;
  let tirContractAddress: string;
  let jsonRpcService: JsonRpcService;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let rootTao: IssuerObject;
  let tao1: IssuerObject;
  let tao1TirWriteAccessToken: string;
  let issuers: IssuerObject[];
  let issuer1TirInviteAccessToken: string;
  let isDidControlledByAddressMock: MockInstance;
  let configService: ConfigService<ApiConfig, true>;
  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;

  const mockServer = setupServer();

  function createParam(
    method: string,
    signer: ethers.BaseWallet,
    updateAttribute: boolean,
    tamper = false,
  ) {
    let param: JsonRpcParams;
    const issuer1 = issuers[0]!;
    const issuer2 = issuers[1]!;
    const issuer3 = issuers[2]!;

    switch (method) {
      case "addIssuerProxy": {
        param = {
          did: issuer1.did,
          from: signer.address,
          proxyData: tamper ? issuer2.proxy.utf8 : issuer1.proxy.utf8,
        } as AddIssuerProxyParam;
        break;
      }
      case "insertIssuer": {
        param = {
          attributeData: tamper ? issuer2.attribute.hex : issuer1.attribute.hex,
          did: issuer1.did,
          from: signer.address,
          issuerType: issuer1.issuerType,
          taoAttributeId: issuer1.taoAttributeId,
          taoDid: issuer1.tao,
        } as InsertIssuerParam;
        break;
      }
      case "setAttributeData": {
        // update data attribute1
        param = {
          attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
          attributeId: tamper ? issuer2.attribute.id : issuer1.attribute.id,
          did: issuer1.did,
          from: signer.address,
        } as SetAttributeDataParam;
        break;
      }
      case "setAttributeMetadata": {
        // update metadata attribute1
        param = {
          attributeId: tamper ? issuer2.attribute.id : issuer1.attribute.id,
          did: issuer1.did,
          from: signer.address,
          issuerType: issuer1.issuerType,
          taoAttributeId: issuer1.taoAttributeId,
          taoDid: issuer1.tao,
        } as SetAttributeMetadataParam;
        break;
      }
      case "updateIssuer": {
        // update attribute1: change it to attribute3
        param = updateAttribute
          ? ({
              attributeData: tamper
                ? issuer2.attribute.hex
                : issuer3.attribute.hex,
              did: issuer1.did,
              from: signer.address,
              issuerType: issuer3.issuerType,
              prevAttributeHash: issuer1.attribute.id,
              taoAttributeId: issuer3.taoAttributeId,
              taoDid: issuer3.tao,
            } satisfies UpdateIssuerParam)
          : ({
              attributeData: tamper
                ? issuer3.attribute.hex
                : issuer2.attribute.hex,
              did: issuer1.did,
              from: signer.address,
              issuerType: issuer2.issuerType,
              taoAttributeId: issuer2.taoAttributeId,
              taoDid: issuer2.tao,
            } satisfies UpdateIssuerParam);

        break;
      }
      case "updateIssuerProxy": {
        param = {
          did: issuer1.did,
          from: signer.address,
          proxyData: issuer2.proxy.utf8,
          proxyId: tamper ? issuer2.proxy.id : issuer1.proxy.id,
        } as UpdateIssuerProxyParam;
        break;
      }
      default: {
        throw new Error(`Test Error: Invalid method ${method}`);
      }
    }

    return param;
  }

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.error();
      },
    });

    // Spin up test blockchain
    testEnv = await setupTestEnv({
      issuersTotal: 5,
    });

    tirContract = testEnv.tirContract;
    tirContractAddress = await tirContract.getAddress();

    vi.stubEnv("CONTRACT_ADDR", await tirContract.getAddress());

    // Mock TIR contract
    vi.spyOn(Tir__factory, "connect").mockImplementation(
      // Create new instance without runner (provider)
      () => tirContract.connect(),
    );

    // Mock LedgerService
    vi.spyOn(LedgerService.prototype, "getProvider").mockImplementation(
      // @ts-expect-error Error due to a mismatch between ESM and CommonJS modules
      () => testEnv.provider,
    );

    rootTao = testEnv.issuers[0]!;
    tao1 = testEnv.issuers[1]!;

    // generate data for 3 issuers
    issuers = [];
    issuers.push(
      createIssuer(IssuerType.TI, tao1.did, tao1.attribute.id, rootTao.did),
      createIssuer(IssuerType.TI, tao1.did, tao1.attribute.id, rootTao.did),
      createIssuer(IssuerType.TI, tao1.did, tao1.attribute.id, rootTao.did),
    );

    // Start server
    const moduleFixture = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

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

    useContainer(app.select(JsonRpcModule), { fallbackOnErrors: true });
    await app.init();
    await fastifyInstance.ready();
    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const authApiPublicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(authApiPublicKeyJwk);

    // Mock Auth API v3
    const authorisationApiUrl = configService.get("authorisationApiUrl", {
      infer: true,
    });

    mockServer.use(
      // Mock Auth API v3 /.well-known/openid-configuration endpoint
      http.get(`${authorisationApiUrl}/.well-known/openid-configuration`, () =>
        HttpResponse.json({ jwks_uri: `${authorisationApiUrl}/jwks` }),
      ),
      // Mock Auth API v3 /jwks endpoint
      http.get(`${authorisationApiUrl}/jwks`, () =>
        HttpResponse.json({
          keys: [{ ...authApiPublicKeyJwk, kid: authApiKid }],
        }),
      ),
    );

    // Generate access tokens
    issuer1TirInviteAccessToken = await new SignJWT({
      scp: "openid tir_invite",
      sub: issuers[0]!.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    tao1TirWriteAccessToken = await new SignJWT({
      scp: "openid tir_write",
      sub: tao1.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    // Generate proxy
    const privateKey =
      StatusList2021CredentialHelpers.generatePrivateKey("ES256K");
    const {
      alg: publicKeyJwkAlg,
      kid: publicKeyJwkKid,
      ...publicKeyJwk
    } = await StatusList2021CredentialHelpers.getPublicKeyJwk(
      privateKey,
      "ES256K",
    );

    const issuer = {
      alg: "ES256K",
      did: issuers[0]!.did,
      kid: `${issuers[0]!.did}#keys-1`,
      signer: StatusList2021CredentialHelpers.getSigner(privateKey, "ES256K"),
    } satisfies EbsiIssuer;

    const ebsiEnvConfig = configService.get("ebsiEnvConfig", { infer: true });

    const issuerV1StatusList2021CredentialJwt =
      await createVerifiableCredentialJwt(
        issuers[0]!.proxy.statusList2021Credential,
        issuer,
        ebsiEnvConfig,
        { skipValidation: true },
      );

    const didRegistryApiUrl = configService.get("didRegistryApiUrl", {
      infer: true,
    });
    const issuer1DidDocument = createDidDocument(
      issuer.did,
      issuer.kid,
      publicKeyJwk,
    );

    mockServer.use(
      // Mock DIDR API v4 /identifiers/${issuer.did}
      http.get(
        escapeDid(`${didRegistryApiUrl}/identifiers/${issuer.did}`),
        () => HttpResponse.json(issuer1DidDocument),
      ),
      // Make test status list JWT available
      http.get(
        escapeDid(
          `${issuers[0]!.proxy.obj.prefix}${issuers[0]!.proxy.obj.testSuffix}`,
        ),
        () => HttpResponse.json(issuerV1StatusList2021CredentialJwt),
      ),
    );
  });

  beforeEach(() => {
    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(() => true);

    // Mock isStatusList2021Credential
    vi.spyOn(
      StatusList2021CredentialHelpers,
      "isStatusList2021Credential",
    ).mockImplementation(() => Promise.resolve(true));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    mockServer.close();

    await app.close();
  });

  it("should throw an error if the DID does not exist", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const param: InsertIssuerParam = {
      attributeData: issuers[0]!.attribute.hex,
      did: issuers[0]!.did,
      from: signer.address,
      issuerType: issuers[0]!.issuerType,
      taoAttributeId: issuers[0]!.taoAttributeId,
      taoDid: issuers[0]!.tao,
    };

    // The DID does not exist
    mockServer.use(
      http.post(
        escapeDid(
          `${configService.get("didRegistryApiUrl", { infer: true })}/identifiers/${tao1.did}/actions`,
        ),
        () =>
          HttpResponse.json(
            {
              error: { code: -32_600, message: "did doesn't exist" },
              // eslint-disable-next-line unicorn/no-null
              id: null,
              jsonrpc: "2.0",
            },
            { status: 400 },
          ),
      ),
    );
    isDidControlledByAddressMock.mockRestore();

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertIssuer",
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
      unsignedTransaction as UnsignedTransaction,
    );

    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
        message: `The DID ${tao1.did} does not exist`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
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
    const kid = await calculateJwkThumbprint(await exportJWK(signer.publicKey));
    const accessTokenWithInvalidKid = await new SignJWT({
      scp: "openid tir_invite",
      sub: issuers[0]!.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid,
        typ: "JWT",
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
      scp: "openid didr_write",
      sub: issuers[0]!.did,
    })
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
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
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      detail:
        '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
      status: 400,
      title: "Bad Request",
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);

    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      chainId: "0x1b3b",
      data: tirContract.interface.encodeFunctionData("getPolicy", ["policy1"]),
      from: wallet.address,
      gasLimit: "0x1000000",
      gasPrice: "0x00",
      nonce: "0x00",
      to: tirContractAddress,
      value: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      transaction as UnsignedTransaction,
    );

    const sgnTx = await wallet.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
            unsignedTransaction: transaction,
            v: `0x${v.toString(16)}`,
          },
        ],
      });

    const { chainId } = await testEnv.provider.getNetwork();
    const actualChainId = `0x${BigInt(chainId).toString(16)}`;

    expect(responseSend.body).toStrictEqual({
      error: {
        code: -32_600,
        message: `Invalid unsignedTransaction.chainId. Expected ${actualChainId}. Received 0x1b3b`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an Invalid Request error for bad method", async () => {
    expect.assertions(2);

    const response = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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

  it("should throw an error when the transaction is not a type 0 (legacy) transaction", async () => {
    expect.assertions(3);

    const signer = ethers.Wallet.createRandom();

    const param: InsertIssuerParam = {
      attributeData: issuers[0]!.attribute.hex,
      did: issuers[0]!.did,
      from: signer.address,
      issuerType: issuers[0]!.issuerType,
      taoAttributeId: issuers[0]!.taoAttributeId,
      taoDid: issuers[0]!.tao,
    };

    const accessToken = tao1TirWriteAccessToken;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(accessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertIssuer",
        params: [param],
      });

    expect(responseBuild.status).toBe(200);
    const transaction = responseBuild.body.result as UnsignedTransaction;

    const uTx = formatEthersUnsignedTransaction(transaction);

    // Remove "type: 0" from unsigned transaction, let ethers.js infer (incorrectly) that it's a type 1 transaction
    // @ts-expect-error The operand of a 'delete' operator must be optional
    delete uTx.type;

    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
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
            unsignedTransaction: transaction,
            v: `0x${v.toString(16)}`,
          },
        ],
      });

    expect(responseSend.body).toStrictEqual({
      error: {
        code: -32_600,
        message: expect.stringContaining(
          "property params[0].signedRawTransaction has failed the following constraints: isSignedRawTransaction",
        ),
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const param: InsertIssuerParam = {
      attributeData: issuers[0]!.attribute.hex,
      did: issuers[0]!.did,
      from: signer.address,
      issuerType: issuers[0]!.issuerType,
      taoAttributeId: issuers[0]!.taoAttributeId,
      taoDid: issuers[0]!.tao,
    };

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      () => Promise.resolve(false),
    );

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertIssuer",
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
      unsignedTransaction as UnsignedTransaction,
    );

    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
        message: `The DID ${tao1.did} is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each([
    { method: "insertIssuer" },
    { method: "updateIssuer" },
    { method: "updateIssuer", updateAttribute: true },
    { method: "setAttributeMetadata" },
    { method: "setAttributeData" },
    { method: "setAttributeData", useTirInviteToken: true },
    { method: "addIssuerProxy" },
    { method: "updateIssuerProxy" },
  ] as const)(
    "/jsonrpc with method %o",
    ({ method, updateAttribute = false, useTirInviteToken = false }) => {
      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(4);

        let accessToken = tao1TirWriteAccessToken;
        if (useTirInviteToken) {
          accessToken = issuer1TirInviteAccessToken;
        }

        const signer = ethers.Wallet.createRandom();
        const param: JsonRpcParams = createParam(
          method,
          signer,
          updateAttribute,
        );

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
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
          unsignedTransaction as UnsignedTransaction,
        );

        const sgnTx = await signer.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        const responseSend = await request(server)
          .post("/jsonrpc")
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

      it("should accept a request without id", async () => {
        expect.assertions(2);

        const signer = ethers.Wallet.createRandom();

        const param = createParam(method, signer, updateAttribute);

        const responseBuild = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
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

      it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
        expect.assertions(6);

        const signer = ethers.Wallet.createRandom();

        const param1 = createParam(method, signer, updateAttribute);
        const param2 = createParam(method, signer, updateAttribute);
        const param3 = createParam(method, signer, updateAttribute);

        let expectedErrorMessage1: string;
        let expectedErrorMessage2: string;
        let expectedErrorMessage3: string;

        switch (method) {
          case "addIssuerProxy":
          case "updateIssuerProxy": {
            // @ts-expect-error Delete required property
            delete (param1 as AddIssuerProxyParam).did;
            expectedErrorMessage1 =
              "property params[0].did has failed the following constraints: isDidV1";

            // @ts-expect-error Delete required property
            delete (param2 as AddIssuerProxyParam).proxyData;
            expectedErrorMessage2 =
              "property params[0].proxyData has failed the following constraints: isIssuerProxy";

            param3.from = "bad address";
            expectedErrorMessage3 =
              "property params[0].from has failed the following constraints: isEthereumAddress";
            break;
          }
          case "insertIssuer":
          case "updateIssuer": {
            // @ts-expect-error Delete required property
            delete (param1 as InsertIssuerParam).attributeData;
            expectedErrorMessage1 =
              "property params[0].attributeData has failed the following constraints: matches, isHexadecimal";

            // @ts-expect-error Delete required property
            delete (param2 as InsertIssuerParam).did;
            expectedErrorMessage2 =
              "property params[0].did has failed the following constraints: isDidV1";

            param3.from = "bad address";
            expectedErrorMessage3 =
              "property params[0].from has failed the following constraints: isEthereumAddress";
            break;
          }
          case "setAttributeData": {
            (param1 as SetAttributeDataParam).attributeId = crypto
              .randomBytes(12)
              .toString("hex"); // Not prefixed with 0x
            expectedErrorMessage1 =
              "property params[0].attributeId has failed the following constraints: matches";

            // @ts-expect-error Delete required property
            delete (param2 as InsertIssuerParam).did;
            expectedErrorMessage2 =
              "property params[0].did has failed the following constraints: isDidV1";

            (param3 as SetAttributeDataParam).attributeData = crypto
              .randomBytes(12)
              .toString("hex"); // Not prefixed with 0x
            expectedErrorMessage3 =
              "property params[0].attributeData has failed the following constraints: matches";
            break;
          }
          case "setAttributeMetadata": {
            (param1 as SetAttributeMetadataParam).attributeId = crypto
              .randomBytes(12)
              .toString("hex"); // Not prefixed with 0x
            expectedErrorMessage1 =
              "property params[0].attributeId has failed the following constraints: matches";

            // @ts-expect-error Delete required property
            delete (param2 as InsertIssuerParam).did;
            expectedErrorMessage2 =
              "property params[0].did has failed the following constraints: isDidV1";

            param3.from = "bad address";
            expectedErrorMessage3 =
              "property params[0].from has failed the following constraints: isEthereumAddress";
            break;
          }
          default: {
            throw new Error("Test Error: Invalid method");
          }
        }

        const response1 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param1],
          });

        expect(response1.body).toStrictEqual({
          error: {
            code: -32_600,
            message: expect.stringContaining(expectedErrorMessage1),
          },
          id: 231,
          jsonrpc: "2.0",
        });
        expect(response1.status).toBe(400);

        const response2 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param2],
          });

        expect(response2.body).toStrictEqual({
          error: {
            code: -32_600,
            message: expect.stringContaining(expectedErrorMessage2),
          },
          id: 231,
          jsonrpc: "2.0",
        });
        expect(response2.status).toBe(400);

        const response3 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param3],
          });

        expect(response3.body).toStrictEqual({
          error: {
            code: -32_600,
            message: expect.stringContaining(expectedErrorMessage3),
          },
          id: 231,
          jsonrpc: "2.0",
        });
        expect(response3.status).toBe(400);
      });

      it("should throw an error when the unsignedTransaction has been tampered", async () => {
        expect.assertions(6);

        const wallet1 = ethers.Wallet.createRandom();
        const wallet2 = ethers.Wallet.createRandom();

        const param1 = createParam(method, wallet1, updateAttribute);
        const param2 = createParam(method, wallet1, updateAttribute, true);

        const responseBuild1: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            id: 231,
            jsonrpc: "2.0",
            method,
            params: [param1],
          });

        expect(responseBuild1.status).toBe(200);

        const transaction1 = responseBuild1.body.result as UnsignedTransaction;

        const responseBuild2: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            id: 232,
            jsonrpc: "2.0",
            method,
            params: [param2],
          });

        expect(responseBuild2.status).toBe(200);

        const transaction2 = responseBuild2.body.result as UnsignedTransaction;

        const uTx = formatEthersUnsignedTransaction(transaction1);

        const sgnTx1 = await wallet1.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx1).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        // tampering signatures
        const responseSend1 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
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

        // tampering "from"
        transaction1.from = wallet2.address;
        const responseSend2 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
            message: `The signer of the transaction (${wallet1.address}) does not match with unsignedTransaction.from (${wallet2.address}) `,
          },
          id: "46",
          jsonrpc: "2.0",
        });
        expect(responseSend1.status).toBe(400);
      });
    },
  );
});
