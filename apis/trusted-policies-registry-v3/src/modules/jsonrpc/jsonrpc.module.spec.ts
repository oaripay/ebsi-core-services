import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
  MockInstance,
} from "vitest";
import axios from "axios";
import request from "supertest";
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
  SignJWT,
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  type GenerateKeyPairResult,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import {
  type UnsignedTransaction,
  type InsertPolicySchema,
  type UpdatePolicySchema,
  type ActivatePolicySchema,
  type DeactivatePolicySchema,
  type InsertUserAttributesSchema,
  type DeleteUserAttributeSchema,
} from "./validators/index.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry.js";
import type { ApiConfig } from "../../config/configuration.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { createPolicy } from "../../../tests/utils/data.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertPolicySchema
  | UpdatePolicySchema
  | ActivatePolicySchema
  | DeactivatePolicySchema
  | InsertUserAttributesSchema
  | DeleteUserAttributeSchema;

describe("JsonRpc Module", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault;
  let policiesRegistryContract: PolicyRegistry;
  let jsonRpcService: JsonRpcService;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerService: LedgerService;
  let testEnv: Awaited<ReturnType<typeof setupTestEnv>>;
  let userAccessToken: string;
  let userAccessTokenPayload: Record<string, unknown>;
  let defaultSignerSiopAccessToken: string;
  let defaultSignerSiopAccessTokenPayload: Record<string, unknown>;
  let isDidControlledByAddressMock: MockInstance;

  const policy1 = createPolicy(1, "my-policy1");
  const policy2 = createPolicy(1, "my-policy1");
  const userAddress = ethers.Wallet.createRandom().address;

  const mockServer = setupServer();

  let authApiKeyPair: GenerateKeyPairResult;
  let authApiKid: string;

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url}`);
      },
    });

    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv({ policiesTotal: 3 });
    policiesRegistryContract = testEnv.policiesRegistryContract;

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => policiesRegistryContract.address,
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

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    userAccessTokenPayload = {
      sub: "did:ebsi:admin",
      scp: "openid tpr_write",
    };
    userAccessToken = await new SignJWT(userAccessTokenPayload)
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

    defaultSignerSiopAccessTokenPayload = {
      sub: "did:ebsi:default-signer",
      scp: "openid tpr_write",
    };
    defaultSignerSiopAccessToken = await new SignJWT(
      defaultSignerSiopAccessTokenPayload,
    )
      .setProtectedHeader({
        typ: "JWT",
        alg: "ES256",
        kid: authApiKid,
      })
      .sign(authApiKeyPair.privateKey);

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

  beforeEach(() => {
    // Mock TSR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(testEnv.policiesRegistryContract),
    );

    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(async () =>
      Promise.resolve(true),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should throw an error if the DID does not exist", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    // The DID does not exist
    vi.spyOn(axios, "post").mockImplementation((url: string) => {
      if (url.includes("/identifiers/did:ebsi:default-signer/actions")) {
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

    const { policyName, description } = policy1;
    const param = {
      from: signer.address,
      policyName,
      description,
    } satisfies InsertPolicySchema;

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
        message: "The DID did:ebsi:default-signer does not exist",
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
    const accessTokenWithInvalidKid = await new SignJWT(userAccessTokenPayload)
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

    const accessTokenWithInvalidSignature = await new SignJWT(
      userAccessTokenPayload,
    )
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
      .auth(userAccessToken, { type: "bearer" })
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
      .auth(userAccessToken, { type: "bearer" })
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

    const { policyName, description } = policy1;

    const transaction = {
      from: wallet.address,
      to: policiesRegistryContract.address,
      data: policiesRegistryContract.interface.encodeFunctionData(
        "insertPolicy",
        [policyName, description],
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

    const { chainId } = await policiesRegistryContract.provider.getNetwork();
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

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      async () => Promise.resolve(false),
    );

    const { policyName, description } = policy1;
    const param = {
      from: signer.address,
      policyName,
      description,
    } satisfies InsertPolicySchema;

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
        message: `The DID did:ebsi:default-signer is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the wallet doesn't have the role OPERATOR_ROLE 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929", async () => {
    expect.assertions(4);

    let param: JsonRpcParams | null = null;

    const signer = ethers.Wallet.createRandom();

    const { policyName, description } = policy1;
    param = {
      from: signer.address,
      policyName,
      description,
    } satisfies InsertPolicySchema;

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
        message: expect.stringContaining(
          `reverted with reason string 'AccessControl: account ${signer.address.toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'`,
        ),
      },
      jsonrpc: "2.0",
      id: "45",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the from attribute is not a valid Ethereum address", async () => {
    expect.assertions(2);

    const accessToken = userAccessToken;
    const param = {
      from: "0x123",
      policyName: "test",
      description: "test",
    } satisfies InsertPolicySchema;

    const responseBuild = await request(server)
      .post("/jsonrpc")
      .auth(accessToken, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertPolicy",
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

  // Tests to be repeated for every method
  describe.each([
    "insertPolicy",
    "updatePolicy-byPolicyId",
    "deactivatePolicy-byPolicyId",
    "activatePolicy-byPolicyId",
    "updatePolicy-byPolicyName",
    "deactivatePolicy-byPolicyName",
    "activatePolicy-byPolicyName",
    "insertUserAttributes",
    "deleteUserAttribute",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const [method, typeTest] = testMethod.split("-");
    const byPolicyId = typeTest === "byPolicyId";
    const byPolicyName = typeTest === "byPolicyName";

    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      let param: JsonRpcParams | null = null;

      const signer = testEnv.adminWallet;

      switch (method) {
        case "insertPolicy": {
          const { policyName, description } = policy1;
          param = {
            from: signer.address,
            policyName,
            description,
          } satisfies InsertPolicySchema;
          break;
        }
        case "updatePolicy": {
          const { policyName, description } = policy2;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            description,
          } satisfies UpdatePolicySchema;
          break;
        }
        case "deactivatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } satisfies DeactivatePolicySchema;
          break;
        }
        case "activatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } satisfies ActivatePolicySchema;
          break;
        }
        case "insertUserAttributes": {
          param = {
            from: signer.address,
            user: userAddress,
            attributes: ["attr1", "attr2"],
          } satisfies InsertUserAttributesSchema;
          break;
        }
        case "deleteUserAttribute": {
          param = {
            from: signer.address,
            user: userAddress,
            attribute: "attr1",
          } satisfies DeleteUserAttributeSchema;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        jsonrpc: "2.0",
        id: "45",
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);
    });

    it("should accept a request without id", async () => {
      expect.assertions(2);

      const signer = ethers.Wallet.createRandom();

      let param: JsonRpcParams | null = null;

      switch (method) {
        case "insertPolicy": {
          const { policyName, description } = policy1;
          param = {
            from: signer.address,
            policyName,
            description,
          } satisfies InsertPolicySchema;
          break;
        }
        case "updatePolicy": {
          const { policyName, description } = policy2;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            description,
          } satisfies UpdatePolicySchema;
          break;
        }
        case "deactivatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } satisfies DeactivatePolicySchema;
          break;
        }
        case "activatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } satisfies ActivatePolicySchema;
          break;
        }
        case "insertUserAttributes": {
          param = {
            from: signer.address,
            user: userAddress,
            attributes: ["attr1", "attr2"],
          } satisfies InsertUserAttributesSchema;
          break;
        }
        case "deleteUserAttribute": {
          param = {
            from: signer.address,
            user: userAddress,
            attribute: "attr1",
          } satisfies DeleteUserAttributeSchema;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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

      const params: JsonRpcParams[] = [];
      const expectedErrorMessages: string[] = [];

      switch (method) {
        case "insertPolicy": {
          params.push({
            from: signer.address,
            policyName: policy1.policyName,
            // description: policy1.description, <- missing description
          } as InsertPolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.description': Required",
          );

          params.push({
            from: "bad address",
            policyName: policy2.policyName,
            description: policy2.description,
          } satisfies InsertPolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.from': Invalid Ethereum address",
          );

          break;
        }
        case "updatePolicy": {
          params.push({
            from: signer.address,
            policyId: "1",
            policyName: policy1.policyName,
            // description: policy1.description, <- missing description
          } as UpdatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.description': Required",
          );

          params.push({
            from: signer.address,
            policyId: "1",
            policyName: policy2.policyName,
            description: 15, // Invalid description
          } as unknown as UpdatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.description': Expected string, received number",
          );

          params.push({
            from: signer.address,
            policyId: "badId",
            policyName: policy2.policyName,
            description: policy2.description,
          } satisfies UpdatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.policyId': Not an integer string",
          );

          break;
        }
        case "deactivatePolicy": {
          params.push({
            from: signer.address,
            policyId: "test",
          } satisfies DeactivatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.policyId': Not an integer string",
          );

          break;
        }
        case "activatePolicy": {
          params.push({
            from: signer.address,
            policyId: "test",
          } satisfies ActivatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.policyId': Not an integer string",
          );

          break;
        }
        case "insertUserAttributes": {
          params.push({
            from: signer.address,
            user: userAddress,
            attributes: "attr1",
          } as unknown as InsertUserAttributesSchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.attributes': Expected array, received string",
          );
          break;
        }
        case "deleteUserAttribute": {
          params.push({
            from: signer.address,
            user: userAddress,
            attribute: 12,
          } as unknown as DeleteUserAttributeSchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.attribute': Expected string, received number",
          );
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      expect.assertions(params.length * 2);

      await Promise.all(
        params.map(async (param, index) => {
          const response1 = await request(server)
            .post("/jsonrpc")
            .auth(defaultSignerSiopAccessToken, { type: "bearer" })
            .send({
              jsonrpc: "2.0",
              method,
              params: [param],
              id: 231,
            });

          expect(response1.body).toStrictEqual({
            jsonrpc: "2.0",
            id: 231,
            error: {
              code: -32600,
              message: expect.stringContaining(expectedErrorMessages[index]!),
            },
          });
          expect(response1.status).toBe(400);
        }),
      );
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      const signer = ethers.Wallet.createRandom();

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      switch (method) {
        case "insertPolicy": {
          const { policyName, description } = policy1;

          param1 = {
            from: signer.address,
            policyName,
            description,
          } satisfies InsertPolicySchema;
          param2 = {
            from: signer.address,
            policyName: "another name",
            description,
          } satisfies InsertPolicySchema;
          break;
        }
        case "updatePolicy": {
          const { policyName, description } = policy1;

          param1 = {
            from: signer.address,
            policyId: "1",
            policyName,
            description,
          } satisfies UpdatePolicySchema;
          param2 = {
            from: signer.address,
            policyId: "1",
            policyName: "another name",
            description,
          } satisfies UpdatePolicySchema;
          break;
        }
        case "deactivatePolicy": {
          param1 = {
            from: signer.address,
            policyId: "1",
          } satisfies DeactivatePolicySchema;

          param2 = {
            from: signer.address,
            policyId: "2",
          } satisfies DeactivatePolicySchema;

          break;
        }
        case "activatePolicy": {
          param1 = {
            from: signer.address,
            policyId: "1",
          } satisfies ActivatePolicySchema;

          param2 = {
            from: signer.address,
            policyId: "2",
          } satisfies ActivatePolicySchema;

          break;
        }
        case "insertUserAttributes": {
          param1 = {
            from: signer.address,
            user: userAddress,
            attributes: ["attr1", "attr2"],
          } satisfies InsertUserAttributesSchema;

          param2 = {
            from: signer.address,
            user: userAddress,
            attributes: ["attr1", "attr3"],
          } satisfies InsertUserAttributesSchema;
          break;
        }
        case "deleteUserAttribute": {
          param1 = {
            from: signer.address,
            user: userAddress,
            attribute: "attr1",
          } satisfies DeleteUserAttributeSchema;

          param2 = {
            from: signer.address,
            user: userAddress,
            attribute: "attr2",
          } satisfies DeleteUserAttributeSchema;
          break;
        }
        default: {
          throw new Error(`Test Error: Invalid method ${method}`);
        }
      }

      const responseBuild1: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
