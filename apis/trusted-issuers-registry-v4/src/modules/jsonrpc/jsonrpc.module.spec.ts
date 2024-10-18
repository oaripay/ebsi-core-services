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
import { fastifyAccepts } from "@fastify/accepts";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
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
import { methodNotAllowed } from "@ebsiint-api/shared";
import * as StatusList2021CredentialHelpers from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import type {
  UnsignedTransaction,
  InsertIssuerParam,
  UpdateIssuerParam,
  SetAttributeMetadataParam,
  SetAttributeDataParam,
  AddIssuerProxyParam,
  UpdateIssuerProxyParam,
} from "./dto/index.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { createIssuer, setupTestEnv } from "../../../tests/utils/tir.js";
import type { IssuerObject } from "../../../tests/utils/tir.js";
import { LedgerService } from "../ledger/ledger.service.js";
import type { ApiConfig } from "../../config/configuration.js";
import { createDidDocument } from "../../../tests/utils/data.js";
import { IssuerType } from "../issuers/issuers.constants.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertIssuerParam
  | UpdateIssuerParam
  | SetAttributeMetadataParam
  | SetAttributeDataParam
  | AddIssuerProxyParam
  | UpdateIssuerProxyParam;

/**
 * Escape DID in URLs mocked by MSW
 * @see https://github.com/mswjs/msw/discussions/739#discussioncomment-2524732
 */
function escapeDid(url: string) {
  return url.replace("did:ebsi:", "did\\:ebsi\\:");
}

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
  let configService: ConfigService<ApiConfig, true>;
  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;

  const mockServer = setupServer();

  function createParam(
    method: string,
    signer: ethers.Wallet,
    updateAttribute: boolean,
    tamper = false,
  ) {
    let param: JsonRpcParams;
    const issuer1 = issuers[0]!;
    const issuer2 = issuers[1]!;
    const issuer3 = issuers[2]!;

    switch (method) {
      case "insertIssuer": {
        param = {
          attributeData: tamper ? issuer2.attribute.hex : issuer1.attribute.hex,
          did: issuer1.did,
          issuerType: issuer1.issuerType,
          taoDid: issuer1.tao,
          taoAttributeId: issuer1.taoAttributeId,
          from: signer.address,
        } as InsertIssuerParam;
        break;
      }
      case "updateIssuer": {
        if (updateAttribute) {
          // update attribute1: change it to attribute3
          param = {
            attributeData: tamper
              ? issuer2.attribute.hex
              : issuer3.attribute.hex,
            did: issuer1.did,
            issuerType: issuer3.issuerType,
            taoDid: issuer3.tao,
            taoAttributeId: issuer3.taoAttributeId,
            from: signer.address,
            prevAttributeHash: issuer1.attribute.id,
          } as UpdateIssuerParam;
        } else {
          // updateIssuer: add attribute2
          param = {
            attributeData: tamper
              ? issuer3.attribute.hex
              : issuer2.attribute.hex,
            did: issuer1.did,
            issuerType: issuer2.issuerType,
            taoDid: issuer2.tao,
            taoAttributeId: issuer2.taoAttributeId,
            from: signer.address,
          } as UpdateIssuerParam;
        }
        break;
      }
      case "setAttributeMetadata": {
        // update metadata attribute1
        param = {
          from: signer.address,
          did: issuer1.did,
          attributeId: tamper ? issuer2.attribute.id : issuer1.attribute.id,
          issuerType: issuer1.issuerType,
          taoDid: issuer1.tao,
          taoAttributeId: issuer1.taoAttributeId,
        } as SetAttributeMetadataParam;
        break;
      }
      case "setAttributeData": {
        // update data attribute1
        param = {
          from: signer.address,
          did: issuer1.did,
          attributeId: tamper ? issuer2.attribute.id : issuer1.attribute.id,
          attributeData: `0x${crypto.randomBytes(12).toString("hex")}`,
        } as SetAttributeDataParam;
        break;
      }
      case "addIssuerProxy": {
        param = {
          from: signer.address,
          did: issuer1.did,
          proxyData: tamper ? issuer2.proxy.utf8 : issuer1.proxy.utf8,
        } as AddIssuerProxyParam;
        break;
      }
      case "updateIssuerProxy": {
        param = {
          from: signer.address,
          did: issuer1.did,
          proxyId: tamper ? issuer2.proxy.id : issuer1.proxy.id,
          proxyData: issuer2.proxy.utf8,
        } as UpdateIssuerProxyParam;
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
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const authApiPublicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(authApiPublicKeyJwk);

    // Mock Auth API v3
    const authorisationApiUrl = configService.get<string>(
      "authorisationApiUrl",
    );

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
      alg: "ES256K",
      signer: StatusList2021CredentialHelpers.getSigner(privateKey, "ES256K"),
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
            "did-registry": "v4",
            "trusted-issuers-registry": "v4",
            "trusted-policies-registry": "v2",
            "trusted-schemas-registry": "v2",
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
    // Mock TIR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => tirContract,
    );

    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(async () =>
      Promise.resolve(true),
    );

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
      issuerType: issuers[0]!.issuerType,
      taoDid: issuers[0]!.tao,
      taoAttributeId: issuers[0]!.taoAttributeId,
      from: signer.address,
    };

    // The DID does not exist
    mockServer.use(
      http.post(
        escapeDid(
          `${configService.get<string>(
            "didRegistryApiUrl",
          )}/identifiers/${tao1.did}/actions`,
        ),
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
        method: "insertIssuer",
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
    expect.assertions(2);

    const response = await request(server)
      .post("/jsonrpc")
      .auth(tao1TirWriteAccessToken, { type: "bearer" })
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
      to: tirContractAddress,
      data: tirContract.interface.encodeFunctionData("getPolicy", ["policy1"]),
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

    const param: InsertIssuerParam = {
      attributeData: issuers[0]!.attribute.hex,
      did: issuers[0]!.did,
      issuerType: issuers[0]!.issuerType,
      taoDid: issuers[0]!.tao,
      taoAttributeId: issuers[0]!.taoAttributeId,
      from: signer.address,
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
        method: "insertIssuer",
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
          jsonrpc: "2.0",
          id: null,
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
          case "insertIssuer":
          case "updateIssuer":
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
          case "setAttributeMetadata":
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
          case "setAttributeData":
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
          case "addIssuerProxy":
          case "updateIssuerProxy":
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
          default:
            throw new Error("Test Error: Invalid method");
        }

        const response1 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param1],
            id: 231,
          });

        expect(response1.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: expect.stringContaining(expectedErrorMessage1),
          },
        });
        expect(response1.status).toBe(400);

        const response2 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param2],
            id: 231,
          });

        expect(response2.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: expect.stringContaining(expectedErrorMessage2),
          },
        });
        expect(response2.status).toBe(400);

        const response3 = await request(server)
          .post("/jsonrpc")
          .auth(tao1TirWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [param3],
            id: 231,
          });

        expect(response3.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: expect.stringContaining(expectedErrorMessage3),
          },
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
