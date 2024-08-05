import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  it,
  expect,
  afterEach,
  MockInstance,
} from "vitest";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import crypto from "node:crypto";
import type { RawServerDefault } from "fastify";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry-v3";
import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import type { GenerateKeyPairResult } from "jose";
import { useContainer } from "class-validator";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import * as StatusList2021CredentialHelpers from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { createIssuer, setupTestEnv } from "../../../tests/utils/tir.js";
import type { IssuerObject } from "../../../tests/utils/tir.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import { createDidDocument } from "../../../tests/utils/data.js";
import { IssuerType } from "../issuers/issuers.constants.js";
import type { SetAttributeMetadataSchema } from "./validators/RequestSetAttributeMetadataSchema.js";
import type { SetAttributeDataSchema } from "./validators/RequestSetAttributeDataSchema.js";
import type { AddIssuerProxySchema } from "./validators/RequestAddIssuerProxySchema.js";
import type { UpdateIssuerProxySchema } from "./validators/RequestUpdateIssuerProxySchema.js";
import type { UnsignedTransaction } from "./validators/RequestSendSignedTransactionSchema.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | SetAttributeMetadataSchema
  | SetAttributeDataSchema
  | AddIssuerProxySchema
  | UpdateIssuerProxySchema;

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let tirContract: Tir;
  let tirContractAddress: string;
  let jsonRpcService: JsonRpcService;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let rootTao: IssuerObject;
  let tao1: IssuerObject;
  let tao1TirWriteAccessToken: string;
  let issuers: IssuerObject[];
  let issuer1TirInviteAccessToken: string;
  let isDidControlledByAddressMock: MockInstance;
  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;
  let configService: ConfigService<ApiConfig, true>;

  const mockServer = setupServer();

  function createParam(method: string, signer: ethers.Wallet, tamper = false) {
    let param: JsonRpcParams;
    const issuer1 = issuers[0]!;
    const issuer2 = issuers[1]!;

    switch (method) {
      case "setAttributeMetadata": {
        // update metadata attribute1
        param = {
          from: signer.address,
          did: issuer1.did,
          revisionId: tamper ? issuer2.attribute.id : issuer1.attribute.id,
          issuerType: issuer1.issuerType,
          taoDid: issuer1.tao,
          attributeIdTao: issuer1.attributeIdTao,
        } satisfies SetAttributeMetadataSchema;
        break;
      }
      case "setAttributeData": {
        // update data attribute1
        param = {
          from: signer.address,
          did: issuer1.did,
          attributeId: issuer1.attribute.id,
          attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
        } satisfies SetAttributeDataSchema;
        break;
      }
      case "addIssuerProxy": {
        param = {
          from: signer.address,
          did: issuer1.did,
          proxyData: tamper ? issuer2.proxy.utf8 : issuer1.proxy.utf8,
        } satisfies AddIssuerProxySchema;
        break;
      }
      case "updateIssuerProxy": {
        param = {
          from: signer.address,
          did: issuer1.did,
          proxyId: tamper ? issuer2.proxy.id : issuer1.proxy.id,
          proxyData: issuer2.proxy.utf8,
        } satisfies UpdateIssuerProxySchema;
        break;
      }
      default:
        throw new Error(`Test Error: Invalid method ${method}`);
    }

    return param;
  }

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.warning();
      },
    });

    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      issuersTotal: 5,
    });

    rootTao = testEnv.issuers[0]!;
    tao1 = testEnv.issuers[1]!;

    // generate data for 3 issuers
    issuers = [];
    issuers.push(
      createIssuer(IssuerType.TI, tao1.did, tao1.attribute.id, rootTao.did),
    );
    issuers.push(
      createIssuer(IssuerType.TI, tao1.did, tao1.attribute.id, rootTao.did),
    );
    issuers.push(
      createIssuer(IssuerType.TI, tao1.did, tao1.attribute.id, rootTao.did),
    );

    tirContract = testEnv.tirContract;
    tirContractAddress = tirContract.address;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => tirContract.address,
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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    useContainer(app.select(JsonRpcModule), { fallbackOnErrors: true });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const authApiPublicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(authApiPublicKeyJwk);

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
          keys: [{ ...authApiPublicKeyJwk, kid: authApiKid }],
        }),
      ),
    );

    // Generate access tokens
    issuer1TirInviteAccessToken = await new SignJWT({
      sub: issuers[0]!.did,
      scp: "openid tir_invite",
    })
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    tao1TirWriteAccessToken = await new SignJWT({
      sub: tao1.did,
      scp: "openid tir_write",
    })
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    // Generate proxy
    const privateKey =
      StatusList2021CredentialHelpers.generatePrivateKey("ES256K");
    const {
      kid: publicKeyJwkKid,
      alg: publicKeyJwkAlg,
      ...publicKeyJwk
    } = await StatusList2021CredentialHelpers.getPublicKeyJwk(
      privateKey,
      "ES256K",
    );

    const issuer = {
      did: issuers[0]!.did,
      kid: `${issuers[0]!.did}#keys-1`,
      signer: StatusList2021CredentialHelpers.getSigner(privateKey, "ES256K"),
      alg: "ES256K",
    } satisfies EbsiIssuer;

    const domain = configService.get("domain", { infer: true });
    const ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    const trustedHostnames = configService.get<string[]>("trustedHostnames");

    const issuerV1StatusList2021CredentialJwt =
      await createVerifiableCredentialJwt(
        issuers[0]!.proxy.statusList2021Credential,
        issuer,
        {
          network: configService.get("network", { infer: true }),
          hosts: [ebsiAuthority, ...trustedHostnames],
          services: {
            "did-registry": "v5",
            "trusted-issuers-registry": "v5",
            "trusted-policies-registry": "v3",
            "trusted-schemas-registry": "v3",
          },
          skipValidation: true,
        },
      );

    const didRegistryApiUrl = configService.get<string>("didRegistryApiUrl");
    const issuer1DidDocument = createDidDocument(
      issuer.did,
      issuer.kid,
      publicKeyJwk,
    );

    mockServer.use(
      // Mock DIDR API /identifiers/${issuer.did}
      http.get(`${didRegistryApiUrl}/identifiers/${issuer.did}`, () =>
        HttpResponse.json(issuer1DidDocument),
      ),
      // Make test status list JWT available
      http.get(
        `${issuers[0]!.proxy.obj.prefix}${issuers[0]!.proxy.obj.testSuffix}`,
        () => HttpResponse.json(issuerV1StatusList2021CredentialJwt),
      ),
      // Create "not found" status list URL
      http.get(
        "https://not-found.net/cred/1",
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
  });

  beforeEach(() => {
    // Mock TIR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(tirContract),
    );

    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(async () =>
      Promise.resolve(true),
    );

    // Mock checkStatusList2021Credential
    vi.spyOn(
      StatusList2021CredentialHelpers,
      "checkStatusList2021Credential",
    ).mockImplementation(() => Promise.resolve({ success: true } as const));
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
    const issuer = issuers[0]!;

    const param: SetAttributeMetadataSchema = {
      from: signer.address,
      did: issuer.did,
      revisionId: issuer.attribute.id,
      issuerType: issuer.issuerType,
      taoDid: issuer.tao,
      attributeIdTao: issuer.attributeIdTao,
    };

    // The DID does not exist
    mockServer.use(
      http.post(
        `${configService.get<string>(
          "didRegistryApiUrl",
        )}/identifiers/${tao1.did}/actions`,
        () =>
          HttpResponse.json(
            {
              jsonrpc: "2.0",
              error: { code: -32600, message: "did doesn't exist" },
              id: null,
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
        jsonrpc: "2.0",
        method: "setAttributeMetadata",
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
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
      error: {
        code: -32600,
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
      sub: issuers[0]!.did,
      scp: "openid tir_invite",
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
      sub: issuers[0]!.did,
      scp: "openid didr_write",
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
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);

    const wallet = ethers.Wallet.createRandom();

    const transaction = {
      from: wallet.address,
      to: tirContractAddress,
      data: tirContract.interface.encodeFunctionData("getIssuer", [
        "random_issuer",
      ]),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction)) as UnsignedTransaction,
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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

    const { chainId } = await tirContract.provider.getNetwork();
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

    const response = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();
    const issuer = issuers[0]!;

    const param: SetAttributeMetadataSchema = {
      from: signer.address,
      did: issuer.did,
      revisionId: issuer.attribute.id,
      issuerType: issuer.issuerType,
      taoDid: issuer.tao,
      attributeIdTao: issuer.attributeIdTao,
    };

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      async () => Promise.resolve(false),
    );

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "setAttributeMetadata",
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
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
      error: {
        code: -32600,
        message: `The DID ${tao1.did} is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each([
    { method: "setAttributeMetadata" },
    { method: "setAttributeData" },
    { method: "setAttributeData", useTirInviteToken: true },
    { method: "addIssuerProxy" },
    { method: "updateIssuerProxy" },
  ] as const)(
    "/jsonrpc with method %o",
    ({ method, useTirInviteToken = false }) => {
      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(4);

        let accessToken = tao1TirWriteAccessToken;
        if (useTirInviteToken) {
          accessToken = issuer1TirInviteAccessToken;
        }

        const signer = ethers.Wallet.createRandom();
        const param: JsonRpcParams = createParam(method, signer);

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

      it("should accept a request without id", async () => {
        expect.assertions(2);

        const signer = ethers.Wallet.createRandom();

        const param = createParam(method, signer);

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
          jsonrpc: "2.0",
          id: null,
          result: expect.objectContaining({}),
        });
        expect(responseBuild.status).toBe(200);
      });

      it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
        const signer = ethers.Wallet.createRandom();

        const testSetup: {
          params: JsonRpcParams;
          expectedErrorMessage: string;
          accessToken: string;
        }[] = [];

        const issuer1 = issuers[0]!;
        const issuer2 = issuers[1]!;

        switch (method) {
          case "setAttributeMetadata": {
            testSetup.push({
              params: {
                from: signer.address,
                // Missing "did"
                // did: issuer1.did,
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage: "Invalid 'params.0.did': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                // Invalid "did"
                did: "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9KbqWsaTDqWzTdxV8Up5ZsKEyY2287nhqc9wPxspHkyEn5xHi9Lnnt9kEkPJd2tFpmpx8z8dgHfbLmLhFRm5jpfvxGUwoykD87ec7znw9NhN9fMTBXmm4zb3amdW5SqZ7QW5A",
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.did': The DID must start with \"did:ebsi:\"",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Missing "revisionId"
                // revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage: "Invalid 'params.0.revisionId': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "revisionId"
                revisionId: "not hexadecimal",
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.revisionId': Must be hexadecimal",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "revisionId"
                revisionId:
                  "883a16a2b265a6ebf1e9e375c59a7171baa3122a425b745eda806401127c8b2f",
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.revisionId': Must be prefixed with 0x",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                revisionId: issuer1.attribute.id,
                // Invalid "issuerType"
                issuerType: 42,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.issuerType': Number must be less than or equal to 4",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                // Invalid "taoDid"
                taoDid:
                  "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9KbqWsaTDqWzTdxV8Up5ZsKEyY2287nhqc9wPxspHkyEn5xHi9Lnnt9kEkPJd2tFpmpx8z8dgHfbLmLhFRm5jpfvxGUwoykD87ec7znw9NhN9fMTBXmm4zb3amdW5SqZ7QW5A",
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.taoDid': The DID must start with \"did:ebsi:\"",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                // Invalid "attributeIdTao"
                attributeIdTao: "not hexadecimal",
              } as SetAttributeMetadataSchema,
              expectedErrorMessage: [
                "Invalid 'params.0.attributeIdTao': Must be prefixed with 0x",
                "Invalid 'params.0.attributeIdTao': String must contain exactly 66 character(s)",
                "Invalid 'params.0.attributeIdTao': Must be hexadecimal",
              ].join("\n"),
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                // Invalid "attributeIdTao"
                attributeIdTao: "0xnot hexadecimal",
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.attributeIdTao': Must be hexadecimal",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao:
                  "883a16a2b265a6ebf1e9e375c59a7171baa3122a425b745eda806401127c8b2f",
              } as SetAttributeMetadataSchema,
              expectedErrorMessage: [
                "Invalid 'params.0.attributeIdTao': Must be prefixed with 0x",
                "Invalid 'params.0.attributeIdTao': String must contain exactly 66 character(s)",
              ].join("\n"),
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: "bad address",
                did: issuer1.did,
                revisionId: issuer1.attribute.id,
                issuerType: issuer1.issuerType,
                taoDid: issuer1.tao,
                attributeIdTao: issuer1.attributeIdTao,
              } as SetAttributeMetadataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.from': Invalid Ethereum address",
              accessToken: tao1TirWriteAccessToken,
            });

            break;
          }
          case "setAttributeData": {
            testSetup.push({
              params: {
                from: signer.address,
                // Missing "did"
                // did: issuer1.did,
                attributeId: issuer1.attribute.id,
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage: "Invalid 'params.0.did': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                // Invalid "did"
                did: "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9KbqWsaTDqWzTdxV8Up5ZsKEyY2287nhqc9wPxspHkyEn5xHi9Lnnt9kEkPJd2tFpmpx8z8dgHfbLmLhFRm5jpfvxGUwoykD87ec7znw9NhN9fMTBXmm4zb3amdW5SqZ7QW5A",
                attributeId: issuer1.attribute.id,
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.did': The DID must start with \"did:ebsi:\"",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Missing "attributeId"
                // attributeId: issuer1.attribute.id,
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage: "Invalid 'params.0.attributeId': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "attributeId"
                attributeId:
                  "883a16a2b265a6ebf1e9e375c59a7171baa3122a425b745eda806401127c8b2f",
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.attributeId': Must be prefixed with 0x",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "attributeId"
                attributeId: "0xnot hexadecimal",
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.attributeId': Must be hexadecimal",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                attributeId: issuer1.attribute.id,
                // Invalid "attributeData", not prefixed with 0x
                attributeData: crypto.randomBytes(12).toString("hex"),
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.attributeData': Must be prefixed with 0x",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                attributeId: issuer1.attribute.id,
                // Invalid "attributeData"
                attributeData: "not hexadecimal",
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.attributeData': Must be hexadecimal",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: "bad address",
                did: issuer1.did,
                attributeId: issuer1.attribute.id,
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.from': Invalid Ethereum address",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                attributeId: `0x${crypto.randomBytes(12).toString("hex")}`, // Too short
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage:
                "Invalid 'params.0.attributeId': String must contain exactly 66 character(s)",
              accessToken: tao1TirWriteAccessToken,
            });

            const randomAttributeId = `0x${crypto.randomBytes(32).toString("hex")}`;
            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                attributeId: randomAttributeId,
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage: `Invalid 'params.0.attributeId': Attribute ${randomAttributeId} does not exist`,
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer2.did,
                attributeId: issuer1.attribute.id,
                attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
              } as SetAttributeDataSchema,
              expectedErrorMessage: `Invalid 'params.0': Attribute ${issuer1.attribute.id} does not relate to ${issuer2.did}`,
              accessToken: tao1TirWriteAccessToken,
            });

            break;
          }
          case "addIssuerProxy": {
            testSetup.push({
              params: {
                from: signer.address,
                // Missing "did"
                // did: issuer1.did,
                proxyData: issuer1.proxy.utf8,
              } as AddIssuerProxySchema,
              expectedErrorMessage: "Invalid 'params.0.did': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                // Invalid "did"
                did: "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9KbqWsaTDqWzTdxV8Up5ZsKEyY2287nhqc9wPxspHkyEn5xHi9Lnnt9kEkPJd2tFpmpx8z8dgHfbLmLhFRm5jpfvxGUwoykD87ec7znw9NhN9fMTBXmm4zb3amdW5SqZ7QW5A",
                proxyData: issuer1.proxy.utf8,
              } as AddIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.did': The DID must start with \"did:ebsi:\"",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Missing "proxyData"
                // proxyData: issuer1.proxy.utf8,
              } as AddIssuerProxySchema,
              expectedErrorMessage: "Invalid 'params.0.proxyData': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  // "prefix" attribute is missing
                }),
              } as AddIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Missing prefix",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  prefix: "https://example.net",
                  // Missing "headers" attribute
                }),
              } as AddIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Missing headers",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  prefix: "https://example.net",
                  headers: {
                    Authorization: `Bearer ${crypto
                      .randomBytes(16)
                      .toString("hex")}`,
                  },
                  // Missing "testSuffix" attribute
                }),
              } as AddIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Missing testSuffix",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  prefix: "https://not-found.net",
                  headers: {
                    Authorization: `Bearer ${crypto
                      .randomBytes(16)
                      .toString("hex")}`,
                  },
                  testSuffix: "/cred/1",
                }),
              } as AddIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Error while loading https://not-found.net/cred/1",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: "bad address",
                did: issuer1.did,
                proxyData: issuer1.proxy.utf8,
              } as AddIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.from': Invalid Ethereum address",
              accessToken: tao1TirWriteAccessToken,
            });

            break;
          }
          case "updateIssuerProxy": {
            testSetup.push({
              params: {
                from: signer.address,
                // Missing "did"
                // did: issuer1.did,
                proxyId: issuer1.proxy.id,
                proxyData: issuer1.proxy.utf8,
              } as UpdateIssuerProxySchema,
              expectedErrorMessage: "Invalid 'params.0.did': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                // Invalid "did"
                did: "did:key:z2dmzD81cgPx8Vki7JbuuMmFYrWPgYoytykUZ3eyqht1j9KbqWsaTDqWzTdxV8Up5ZsKEyY2287nhqc9wPxspHkyEn5xHi9Lnnt9kEkPJd2tFpmpx8z8dgHfbLmLhFRm5jpfvxGUwoykD87ec7znw9NhN9fMTBXmm4zb3amdW5SqZ7QW5A",
                proxyId: issuer1.proxy.id,
                proxyData: issuer1.proxy.utf8,
              } as UpdateIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.did': The DID must start with \"did:ebsi:\"",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Missing "proxyId"
                // proxyId: issuer1.proxy.id,
                proxyData: issuer1.proxy.utf8,
              } as UpdateIssuerProxySchema,
              expectedErrorMessage: "Invalid 'params.0.proxyId': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                // Invalid "proxyId"
                proxyId: "not 66 chars and not hex",
                proxyData: issuer1.proxy.utf8,
              } as UpdateIssuerProxySchema,
              expectedErrorMessage: [
                "Invalid 'params.0.proxyId': Must be prefixed with 0x",
                "Invalid 'params.0.proxyId': String must contain exactly 66 character(s)",
                "Invalid 'params.0.proxyId': Must be hexadecimal",
              ].join("\n"),
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                proxyId: issuer1.proxy.id,
                // Missing "proxyData"
                // proxyData: issuer1.proxy.utf8,
              } as UpdateIssuerProxySchema,
              expectedErrorMessage: "Invalid 'params.0.proxyData': Required",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                proxyId: issuer1.proxy.id,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  // "prefix" attribute is missing
                }),
              } as UpdateIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Missing prefix",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                proxyId: issuer1.proxy.id,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  prefix: "https://example.net",
                  // Missing "headers" attribute
                }),
              } as UpdateIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Missing headers",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                proxyId: issuer1.proxy.id,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  prefix: "https://example.net",
                  headers: {
                    Authorization: `Bearer ${crypto
                      .randomBytes(16)
                      .toString("hex")}`,
                  },
                  // Missing "testSuffix" attribute
                }),
              } as UpdateIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Missing testSuffix",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: signer.address,
                did: issuer1.did,
                proxyId: issuer1.proxy.id,
                // Invalid "proxyData"
                proxyData: JSON.stringify({
                  prefix: "https://not-found.net",
                  headers: {
                    Authorization: `Bearer ${crypto
                      .randomBytes(16)
                      .toString("hex")}`,
                  },
                  testSuffix: "/cred/1",
                }),
              } as UpdateIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.proxyData': Error while loading https://not-found.net/cred/1",
              accessToken: tao1TirWriteAccessToken,
            });

            testSetup.push({
              params: {
                from: "bad address",
                did: issuer1.did,
                proxyId: issuer1.proxy.id,
                proxyData: issuer1.proxy.utf8,
              } as UpdateIssuerProxySchema,
              expectedErrorMessage:
                "Invalid 'params.0.from': Invalid Ethereum address",
              accessToken: tao1TirWriteAccessToken,
            });

            break;
          }
          default: {
            throw new Error("Test Error: Invalid method");
          }
        }

        expect.assertions(testSetup.length * 2);

        // Run requests sequentially
        // eslint-disable-next-line no-restricted-syntax
        for (const setup of testSetup) {
          const id = crypto.randomInt(0, 256);

          // eslint-disable-next-line no-await-in-loop
          const response = await request(server)
            .post("/jsonrpc")
            .auth(setup.accessToken, { type: "bearer" })
            .send({
              jsonrpc: "2.0",
              method,
              params: [setup.params],
              id,
            });

          expect(response.body).toStrictEqual({
            jsonrpc: "2.0",
            id,
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

        const wallet1 = ethers.Wallet.createRandom();
        const wallet2 = ethers.Wallet.createRandom();

        const param1 = createParam(method, wallet1);
        const param2 = createParam(method, wallet1, true);

        const responseBuild1: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param2],
            id: 232,
          });

        expect(responseBuild2.status).toBe(200);

        const transaction2 = responseBuild2.body.result as UnsignedTransaction;

        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(JSON.stringify(transaction1)) as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx1 = await wallet1.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

        // tampering signatures
        const responseSend1 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
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

        // tampering "from"
        transaction1.from = wallet2.address;
        const responseSend2 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
            message: `The signer of the transaction (${wallet1.address}) does not match with unsignedTransaction.from (${wallet2.address}) `,
          },
        });
        expect(responseSend1.status).toBe(400);
      });
    },
  );
});
