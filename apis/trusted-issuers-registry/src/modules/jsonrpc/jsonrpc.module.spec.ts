import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterAll,
  it,
  expect,
  MockInstance,
} from "vitest";
import request from "supertest";
import axios, { type AxiosResponse } from "axios";
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
import { createJWT, ES256KSigner } from "did-jwt";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import {
  createVerifiableCredentialJwt,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import * as vcLib from "@cef-ebsi/verifiable-credential";
import { exportJWK, generateKeyPair, JWTVerifyResult } from "jose";
import { useContainer } from "class-validator";
import { StatusList2021Credential } from "@ebsiint-api/shared";
import { JsonRpcModule } from "./jsonrpc.module.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import {
  UnsignedTransaction,
  InsertPolicyParam,
  UpdatePolicyParam,
  AddIssuerProxyParam,
  UpdateIssuerProxyParam,
} from "./dto/index.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { setupTestEnv } from "../../../tests/utils/tir.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { AttributeObject } from "../issuers/issuers.interface.js";
import type { ApiConfig } from "../../config/configuration.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertPolicyParam
  | UpdatePolicyParam
  | AddIssuerProxyParam
  | UpdateIssuerProxyParam;

let tokenVerificationResolve = true;
let customPayload = {
  sub: "test",
} as unknown;

vi.mock("@cef-ebsi/siop-auth", async () => {
  const originalModule = await vi.importActual<
    typeof import("@cef-ebsi/siop-auth")
  >("@cef-ebsi/siop-auth");

  return {
    ...originalModule,
    verifyJwtTar: vi.fn().mockImplementation(async () => {
      if (!tokenVerificationResolve)
        return Promise.reject(new Error("error message"));
      return Promise.resolve({
        payload: customPayload,
      } as JWTVerifyResult);
    }),
  };
});

vi.mock("@cef-ebsi/verifiable-credential", async () => {
  const mod = await vi.importActual<
    typeof import("@cef-ebsi/verifiable-credential")
  >("@cef-ebsi/verifiable-credential");

  return {
    ...mod,
  };
});

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let tirContract: Tir;
  let tirContractAddress: string;
  let jsonRpcService: JsonRpcService;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let ledgerService: LedgerService;
  let userAccessToken: string;
  let userAccessTokenPayload: Record<string, unknown>;
  let defaultSignerSiopAccessToken: string;
  let defaultSignerSiopAccessTokenPayload: Record<string, unknown>;
  let isDidControlledByAddressMock: MockInstance;

  const createIssuer = () => {
    const did = EbsiWallet.createDid();
    const json = {
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 4e8).toISOString(),
    };
    const data = Buffer.from(JSON.stringify(json));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.sha256(data).slice(2);
    const attribute: AttributeObject = {
      body: dataBase64,
      hash: dataHash,
    };
    const attributeData = `0x${data.toString("hex")}`;

    return { did, attribute, attributeData };
  };

  function createPolicy() {
    const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const policyData = `0x${data.toString("hex")}`;
    return {
      policyId,
      policyData,
    };
  }

  function createIssuerProxy(issuerDid: string) {
    const rawProxyData = {
      prefix: "https://example.net",
      headers: {
        Authorization: `Bearer ${crypto.randomBytes(16).toString("hex")}`,
      },
      testSuffix: "/cred/1",
    };

    const proxyData = JSON.stringify(rawProxyData);
    const proxyId = ethers.utils.sha256(Buffer.from(proxyData));

    return {
      issuerDid,
      rawProxyData,
      proxyData,
      proxyId,
    };
  }

  const issuerV1 = createIssuer();
  const issuerV2 = createIssuer();
  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const issuerV1Proxy1 = createIssuerProxy(issuerV1.did);
  const issuerV1Proxy2 = createIssuerProxy(issuerV1.did);
  const issuerV1StatusList2021Credential: StatusList2021Credential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
    ],
    id: `${issuerV1Proxy1.rawProxyData.prefix}${issuerV1Proxy1.rawProxyData.testSuffix}`,
    type: [
      "VerifiableCredential",
      "VerifiableAttestation",
      "StatusList2021Credential",
    ],
    issuer: issuerV1.did,
    issued: "2021-04-05T14:27:40Z",
    issuanceDate: "2021-04-05T14:27:40Z",
    validFrom: "2021-04-05T14:27:40Z",
    credentialSubject: {
      id: `${issuerV1Proxy1.rawProxyData.prefix}${issuerV1Proxy1.rawProxyData.testSuffix}#list`,
      type: "StatusList2021",
      statusPurpose: "revocation",
      encodedList:
        "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
    },
    credentialSchema: {
      id: "https://example.net",
      type: "FullJsonSchemaValidator2021",
    },
  };
  let issuerV1StatusList2021CredentialJwt: string;

  function createParam(method: string, signer: ethers.Wallet, tamper = false) {
    let param: JsonRpcParams;

    switch (method) {
      case "insertPolicy": {
        param = {
          from: signer.address,
          policyId: tamper ? policy2.policyId : policy1.policyId,
          policyData: policy1.policyData,
        } as InsertPolicyParam;
        break;
      }
      case "updatePolicy": {
        param = {
          from: signer.address,
          policyId: tamper ? policy2.policyId : policy1.policyId,
          policyData: policy2.policyData,
        } as UpdatePolicyParam;
        break;
      }
      case "addIssuerProxy": {
        param = {
          from: signer.address,
          did: tamper ? issuerV2.did : issuerV1Proxy1.issuerDid,
          proxyData: issuerV1Proxy1.proxyData,
        } as AddIssuerProxyParam;
        break;
      }
      case "updateIssuerProxy": {
        param = {
          from: signer.address,
          did: tamper ? issuerV2.did : issuerV1Proxy1.issuerDid,
          proxyId: issuerV1Proxy1.proxyId,
          proxyData: issuerV1Proxy2.proxyData,
        } as UpdateIssuerProxyParam;
        break;
      }
      default:
        throw new Error(`Test Error: Invalid method ${method}`);
    }

    return param;
  }

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({
      policiesTotal: 0,
      policiesRevisionsTotal: 0,
      issuersTotal: 2, // create 2 random issuers
    });

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

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    useContainer(app.select(JsonRpcModule), { fallbackOnErrors: true });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate JWTs
    userAccessTokenPayload = { sub: "did:ebsi:user" };
    userAccessToken = await createJWT(userAccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(crypto.randomBytes(32)),
    });

    defaultSignerSiopAccessTokenPayload = {
      sub: "did:ebsi:user",
    };
    defaultSignerSiopAccessToken = await createJWT(
      defaultSignerSiopAccessTokenPayload,
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      },
    );

    const keyPair = await generateKeyPair("ES256K");
    const privateKeyJwk = await exportJWK(keyPair.privateKey);
    const publicKeyJwk = await exportJWK(keyPair.publicKey);

    const issuer: EbsiIssuer = {
      did: issuerV1.did,
      kid: `${issuerV1.did}#keys-1`,
      publicKeyJwk,
      privateKeyJwk,
      alg: "ES256K",
    };

    issuerV1StatusList2021CredentialJwt = await createVerifiableCredentialJwt(
      issuerV1StatusList2021Credential,
      issuer,
      {
        ebsiAuthority: "example.net",
        skipValidation: true,
      },
    );

    // Mock VC Lib validation
    vi.spyOn(vcLib, "verifyCredentialJwt").mockImplementation(
      async (jwt: string) => {
        if (jwt === issuerV1StatusList2021CredentialJwt)
          return Promise.resolve(issuerV1StatusList2021Credential);

        return Promise.reject(new Error("Invalid JWT"));
      },
    );
  });

  beforeEach(() => {
    // Mock TIR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(tirContract),
    );

    // Make sure we never use axios.post or axios.get in tests ;-)
    vi.spyOn(axios, "post").mockImplementation(() => {
      throw new Error("Forgot to mock an axios call?");
    });

    vi.spyOn(axios, "get").mockImplementation((url: string) => {
      if (
        url ===
        `${issuerV1Proxy1.rawProxyData.prefix}${issuerV1Proxy1.rawProxyData.testSuffix}`
      ) {
        // Mock issuer's proxy response (StatusList2021Credential)
        return Promise.resolve({
          status: 200,
          data: issuerV1StatusList2021CredentialJwt,
        } as AxiosResponse<unknown>);
      }

      throw new Error("Forgot to mock an axios call?");
    });

    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(async () =>
      Promise.resolve(true),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("should throw an error if the DID does not exist", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const param: JsonRpcParams = {
      from: signer.address,
      policyId: crypto.randomBytes(10).toString("hex"),
      policyData: `0x${crypto.randomBytes(10).toString("hex")}`,
    } as InsertPolicyParam;

    // Mock access token verification
    tokenVerificationResolve = true;
    customPayload = defaultSignerSiopAccessTokenPayload;

    // The DID does not exist
    vi.spyOn(axios, "post").mockImplementation((url: string) => {
      if (url.includes("/identifiers/did:ebsi:user/actions")) {
        return Promise.resolve({
          data: {
            jsonrpc: "2.0",
            error: { code: -32600, message: "did doesn't exist" },
            id: null,
          },
          status: 400,
        });
      }
      throw new Error(`Forgot to mock an axios call? POST ${url}`);
    });
    isDidControlledByAddressMock.mockRestore();

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertPolicy",
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
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        message: "The DID did:ebsi:user does not exist",
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

  it("should reject a POST with an invalid user token", async () => {
    expect.assertions(3);

    // Mock reject JWT
    tokenVerificationResolve = false;

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    // Mock access token verification
    tokenVerificationResolve = true;
    customPayload = userAccessTokenPayload;

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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

    // Mock access token verification
    tokenVerificationResolve = true;
    customPayload = userAccessTokenPayload;
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
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction,
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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

    // Mock access token verification
    tokenVerificationResolve = true;
    customPayload = userAccessTokenPayload;

    const response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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

    const param: JsonRpcParams = {
      from: signer.address,
      policyId: crypto.randomBytes(10).toString("hex"),
      policyData: `0x${crypto.randomBytes(10).toString("hex")}`,
    } as InsertPolicyParam;

    // Mock access token verification
    tokenVerificationResolve = true;
    customPayload = defaultSignerSiopAccessTokenPayload;

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      async () => Promise.resolve(false),
    );

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertPolicy",
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
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        message: `The DID did:ebsi:user is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each([
    "insertPolicy",
    "updatePolicy",
    "addIssuerProxy",
    "updateIssuerProxy",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const method = testMethod.replace("(test update attribute)", "");

    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      // Mock access token verification
      // Authenticate as admin
      tokenVerificationResolve = true;
      customPayload = defaultSignerSiopAccessTokenPayload;

      const signer = ethers.Wallet.createRandom();
      const param: JsonRpcParams = createParam(method, signer);

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth("jwt", { type: "bearer" })
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
        .auth("jwt", { type: "bearer" })
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
      tokenVerificationResolve = true;
      customPayload = defaultSignerSiopAccessTokenPayload;

      const signer = ethers.Wallet.createRandom();

      const param = createParam(method, signer);

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth("jwt", { type: "bearer" })
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

      // Mock access token verification
      tokenVerificationResolve = true;
      customPayload = defaultSignerSiopAccessTokenPayload;

      const signer = ethers.Wallet.createRandom();

      const param1 = createParam(method, signer);
      const param2 = createParam(method, signer);
      const param3 = createParam(method, signer);

      let expectedErrorMessage1: string;
      let expectedErrorMessage2: string;
      let expectedErrorMessage3: string;

      switch (method) {
        case "insertPolicy":
        case "updatePolicy":
          // @ts-expect-error "The operand of a 'delete' operator must be optional"
          delete (param1 as InsertPolicyParam).policyData;
          expectedErrorMessage1 =
            "property params[0].policyData has failed the following constraints: matches, isHexadecimal";

          // @ts-expect-error "The operand of a 'delete' operator must be optional"
          delete (param2 as InsertPolicyParam).policyId;
          expectedErrorMessage2 =
            "property params[0].policyId has failed the following constraints: isString";

          param3.from = "bad address";
          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        case "addIssuerProxy":
        case "updateIssuerProxy":
          // @ts-expect-error "The operand of a 'delete' operator must be optional"
          delete (param1 as AddIssuerProxyParam).did;
          expectedErrorMessage1 =
            "property params[0].did has failed the following constraints: isDidV1";

          // @ts-expect-error "The operand of a 'delete' operator must be optional"
          delete (param2 as AddIssuerProxyParam).proxyData;
          expectedErrorMessage2 =
            "property params[0].proxyData has failed the following constraints: isIssuerProxy";

          param3.from = "bad address";
          expectedErrorMessage3 =
            "property params[0].from has failed the following constraints: isEthereumAddress";
          break;
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const response1 = await request(server)
        .post("/jsonrpc")
        .auth("jwt", { type: "bearer" })
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
        .auth("jwt", { type: "bearer" })
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
        .auth("jwt", { type: "bearer" })
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

      // Mock access token verification
      tokenVerificationResolve = true;
      customPayload = defaultSignerSiopAccessTokenPayload;

      const wallet1 = ethers.Wallet.createRandom();
      const wallet2 = ethers.Wallet.createRandom();

      const param1 = createParam(method, wallet1);
      const param2 = createParam(method, wallet1, true);

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth("jwt", { type: "bearer" })
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
        .auth("jwt", { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [param2],
          id: 232,
        });
      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(transaction1),
        ) as unknown as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx1 = await wallet1.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx1);

      // tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
        .auth("jwt", { type: "bearer" })
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
        .auth("jwt", { type: "bearer" })
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
  });
});
