import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { methodNotAllowed } from "@ebsiint-api/shared";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v3";
import { fastifyAccepts } from "@fastify/accepts";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import axios from "axios";
import { ethers } from "ethers";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  type GenerateKeyPairResult,
  SignJWT,
} from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
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

import type { ApiConfig } from "../../config/configuration.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";

import { createPolicy } from "../../../tests/utils/data.js";
import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import {
  type ActivatePolicySchema,
  type DeactivatePolicySchema,
  type DeleteUserAttributeSchema,
  type InsertPolicySchema,
  type InsertUserAttributesSchema,
  type UnsignedTransaction,
  type UpdatePolicySchema,
} from "./validators/index.js";

type JsonRpcParams =
  | ActivatePolicySchema
  | DeactivatePolicySchema
  | DeleteUserAttributeSchema
  | InsertPolicySchema
  | InsertUserAttributesSchema
  | UpdatePolicySchema;

interface SupertestJsonRpcResponse {
  body: JsonRpcResponseObject;
  status: number;
}

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
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.error();
      },
    });

    // Spin up test blockchain
    testEnv = await setupTestEnv();
    policiesRegistryContract = testEnv.policiesRegistryContract;
    const policiesRegistryContractAddress =
      await policiesRegistryContract.getAddress();

    vi.spyOn(LedgerService.prototype, "getContractAddress").mockImplementation(
      () => policiesRegistryContractAddress,
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

    await app.init();
    await fastifyInstance.ready();

    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate key pair for Authorisation API v3 and create access token
    authApiKeyPair = await generateKeyPair("ES256");
    const publicKeyJwk = await exportJWK(authApiKeyPair.publicKey);
    authApiKid = await calculateJwkThumbprint(publicKeyJwk);

    userAccessTokenPayload = {
      scp: "openid tpr_write",
      sub: "did:ebsi:admin",
    };
    userAccessToken = await new SignJWT(userAccessTokenPayload)
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    defaultSignerSiopAccessTokenPayload = {
      scp: "openid tpr_write",
      sub: "did:ebsi:default-signer",
    };

    defaultSignerSiopAccessToken = await new SignJWT(
      defaultSignerSiopAccessTokenPayload,
    )
      .setProtectedHeader({
        alg: "ES256",
        kid: authApiKid,
        typ: "JWT",
      })
      .sign(authApiKeyPair.privateKey);

    // Mock Auth API
    const authorisationApiUrl = configService.get("authorisationApiUrl", {
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
    );
  });

  beforeEach(() => {
    // Mock TSR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(
      () => testEnv.policiesRegistryContract,
    );
    vi.spyOn(ledgerService, "getEthersProvider").mockImplementation(
      // @ts-expect-error Error due to a mismatch between ESM and CommonJS modules
      () => testEnv.provider,
    );

    // For the tests, we assume that the DID is controlled by the signer
    isDidControlledByAddressMock = vi.spyOn(
      jsonRpcService,
      "isDidControlledByAddress",
    );
    isDidControlledByAddressMock.mockImplementation(() => true);
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
            error: { code: -32_600, message: "did doesn't exist" },
            // eslint-disable-next-line unicorn/no-null
            id: null,
            jsonrpc: "2.0",
          },
          status: 400,
        });
      }
      throw new Error(`Forgot to mock an axios call? POST ${url}`);
    });

    isDidControlledByAddressMock.mockRestore();

    const { description, policyName } = policy1;
    const param = {
      description,
      from: signer.address,
      policyName,
    } satisfies InsertPolicySchema;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertPolicy",
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
      // eslint-disable-next-line unicorn/prefer-structured-clone
      JSON.parse(
        JSON.stringify(unsignedTransaction),
      ) as unknown as UnsignedTransaction,
    );
    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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

    const accessTokenWithInvalidSignature = await new SignJWT(
      userAccessTokenPayload,
    )
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
    expect.assertions(4);

    let response = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
      .send();

    expect(response.body).toStrictEqual({
      error: {
        code: -32_600,
        message: "JSON-RPC payload must be an object",
      },
      // eslint-disable-next-line unicorn/no-null
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
        code: -32_600,
        message: [
          "Invalid 'jsonrpc': Invalid literal value, expected \"2.0\"",
          "Invalid 'method': Required",
          "Invalid 'params': Required",
        ].join("\n"),
      },
      // eslint-disable-next-line unicorn/no-null
      id: null,
      jsonrpc: "2.0",
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error when sendSignedTransaction is used with a wrong chainId", async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();

    const { description, policyName } = policy1;

    const transaction = {
      chainId: "0x1b3b",
      data: policiesRegistryContract.interface.encodeFunctionData(
        "insertPolicy",
        [policyName, description],
      ),
      from: wallet.address,
      gasLimit: "0x1000000",
      gasPrice: "0x00",
      nonce: "0x00",
      to: await policiesRegistryContract.getAddress(),
      value: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      // eslint-disable-next-line unicorn/prefer-structured-clone
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction,
    );

    const sgnTx = await wallet.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(userAccessToken, { type: "bearer" })
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
      .auth(userAccessToken, { type: "bearer" })
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

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      () => Promise.resolve(false),
    );

    const { description, policyName } = policy1;
    const param = {
      description,
      from: signer.address,
      policyName,
    } satisfies InsertPolicySchema;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertPolicy",
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
      // eslint-disable-next-line unicorn/prefer-structured-clone
      JSON.parse(
        JSON.stringify(unsignedTransaction),
      ) as unknown as UnsignedTransaction,
    );

    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        message: `The DID did:ebsi:default-signer is not controlled by the address ${signer.address}`,
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the wallet doesn't have the role OPERATOR_ROLE 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    const { description, policyName } = policy1;
    const param = {
      description,
      from: signer.address,
      policyName,
    } satisfies InsertPolicySchema;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
      .send({
        id: 231,
        jsonrpc: "2.0",
        method: "insertPolicy",
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
      // eslint-disable-next-line unicorn/prefer-structured-clone
      JSON.parse(
        JSON.stringify(unsignedTransaction),
      ) as unknown as UnsignedTransaction,
    );

    const sgnTx = await signer.signTransaction(uTx);
    const signature = ethers.Transaction.from(sgnTx).signature;
    if (!signature) {
      throw new Error("Signature not found");
    }
    const { r, s, v } = signature;

    const responseSend = await request(server)
      .post("/jsonrpc")
      .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
        message: expect.stringContaining(
          `reverted with reason string 'AccessControl: account ${signer.address.toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'`,
        ),
      },
      id: "45",
      jsonrpc: "2.0",
    });
    expect(responseSend.status).toBe(400);
  });

  it("should throw an error if the from attribute is not a valid Ethereum address", async () => {
    expect.assertions(2);

    const accessToken = userAccessToken;
    const param = {
      description: "test",
      from: "0x123",
      policyName: "test",
    } satisfies InsertPolicySchema;

    const responseBuild = await request(server)
      .post("/jsonrpc")
      .auth(accessToken, { type: "bearer" })
      .send({
        id: 123,
        jsonrpc: "2.0",
        method: "insertPolicy",
        params: [param],
      });

    expect(responseBuild.body).toStrictEqual({
      error: {
        code: -32_600,
        message: "Invalid 'params.0.from': Invalid Ethereum address",
      },
      id: 123,
      jsonrpc: "2.0",
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

      let param: JsonRpcParams;

      const signer = testEnv.adminWallet;

      switch (method) {
        case "activatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } satisfies ActivatePolicySchema;
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
        case "deleteUserAttribute": {
          param = {
            attribute: "attr1",
            from: signer.address,
            user: userAddress,
          } satisfies DeleteUserAttributeSchema;
          break;
        }
        case "insertPolicy": {
          const { description, policyName } = policy1;
          param = {
            description,
            from: signer.address,
            policyName,
          } satisfies InsertPolicySchema;
          break;
        }
        case "insertUserAttributes": {
          param = {
            attributes: ["attr1", "attr2"],
            from: signer.address,
            user: userAddress,
          } satisfies InsertUserAttributesSchema;
          break;
        }
        case "updatePolicy": {
          const { description, policyName } = policy2;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            description,
          } satisfies UpdatePolicySchema;
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
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(
          JSON.stringify(unsignedTransaction),
        ) as unknown as UnsignedTransaction,
      );

      const sgnTx = await signer.signTransaction(uTx);
      const signature = ethers.Transaction.from(sgnTx).signature;
      if (!signature) {
        throw new Error("Signature not found");
      }
      const { r, s, v } = signature;

      const responseSend = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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

      let param: JsonRpcParams;

      switch (method) {
        case "activatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } satisfies ActivatePolicySchema;
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
        case "deleteUserAttribute": {
          param = {
            attribute: "attr1",
            from: signer.address,
            user: userAddress,
          } satisfies DeleteUserAttributeSchema;
          break;
        }
        case "insertPolicy": {
          const { description, policyName } = policy1;
          param = {
            description,
            from: signer.address,
            policyName,
          } satisfies InsertPolicySchema;
          break;
        }
        case "insertUserAttributes": {
          param = {
            attributes: ["attr1", "attr2"],
            from: signer.address,
            user: userAddress,
          } satisfies InsertUserAttributesSchema;
          break;
        }
        case "updatePolicy": {
          const { description, policyName } = policy2;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            description,
          } satisfies UpdatePolicySchema;
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
        // eslint-disable-next-line unicorn/no-null
        id: null,
        jsonrpc: "2.0",
        result: expect.objectContaining({}),
      });
      expect(responseBuild.status).toBe(200);
    });

    it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
      const signer = ethers.Wallet.createRandom();

      const params: JsonRpcParams[] = [];
      const expectedErrorMessages: string[] = [];

      switch (method) {
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
        case "deleteUserAttribute": {
          params.push({
            attribute: 12,
            from: signer.address,
            user: userAddress,
          } as unknown as DeleteUserAttributeSchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.attribute': Expected string, received number",
          );
          break;
        }
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
            description: policy2.description,
            from: "bad address",
            policyName: policy2.policyName,
          } satisfies InsertPolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.from': Invalid Ethereum address",
          );

          break;
        }
        case "insertUserAttributes": {
          params.push({
            attributes: "attr1",
            from: signer.address,
            user: userAddress,
          } as unknown as InsertUserAttributesSchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.attributes': Expected array, received string",
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
            description: 15, // Invalid description
            from: signer.address,
            policyId: "1",
            policyName: policy2.policyName,
          } as unknown as UpdatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.description': Expected string, received number",
          );

          params.push({
            description: policy2.description,
            from: signer.address,
            policyId: "badId",
            policyName: policy2.policyName,
          } satisfies UpdatePolicySchema);

          expectedErrorMessages.push(
            "Invalid 'params.0.policyId': Not an integer string",
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
              id: 231,
              jsonrpc: "2.0",
              method,
              params: [param],
            });

          expect(response1.body).toStrictEqual({
            error: {
              code: -32_600,
              message: expect.stringContaining(expectedErrorMessages[index]!),
            },
            id: 231,
            jsonrpc: "2.0",
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
        case "deleteUserAttribute": {
          param1 = {
            attribute: "attr1",
            from: signer.address,
            user: userAddress,
          } satisfies DeleteUserAttributeSchema;

          param2 = {
            attribute: "attr2",
            from: signer.address,
            user: userAddress,
          } satisfies DeleteUserAttributeSchema;
          break;
        }
        case "insertPolicy": {
          const { description, policyName } = policy1;

          param1 = {
            description,
            from: signer.address,
            policyName,
          } satisfies InsertPolicySchema;
          param2 = {
            description,
            from: signer.address,
            policyName: "another name",
          } satisfies InsertPolicySchema;
          break;
        }
        case "insertUserAttributes": {
          param1 = {
            attributes: ["attr1", "attr2"],
            from: signer.address,
            user: userAddress,
          } satisfies InsertUserAttributesSchema;

          param2 = {
            attributes: ["attr1", "attr3"],
            from: signer.address,
            user: userAddress,
          } satisfies InsertUserAttributesSchema;
          break;
        }
        case "updatePolicy": {
          const { description, policyName } = policy1;

          param1 = {
            description,
            from: signer.address,
            policyId: "1",
            policyName,
          } satisfies UpdatePolicySchema;
          param2 = {
            description,
            from: signer.address,
            policyId: "1",
            policyName: "another name",
          } satisfies UpdatePolicySchema;
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
          id: 231,
          jsonrpc: "2.0",
          method,
          params: [param1],
        });

      expect(responseBuild1.status).toBe(200);

      const transaction1 = responseBuild1.body.result as UnsignedTransaction;

      const responseBuild2: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
        .send({
          id: 232,
          jsonrpc: "2.0",
          method,
          params: [param2],
        });

      expect(responseBuild2.status).toBe(200);
      const transaction2 = responseBuild2.body.result as UnsignedTransaction;

      const randomSigner = ethers.Wallet.createRandom();

      const uTx = formatEthersUnsignedTransaction(
        // eslint-disable-next-line unicorn/prefer-structured-clone
        JSON.parse(
          JSON.stringify(transaction1),
        ) as unknown as UnsignedTransaction,
      );

      const sgnTx1 = await randomSigner.signTransaction(uTx);
      const signature = ethers.Transaction.from(sgnTx1).signature;
      if (!signature) {
        throw new Error("Signature not found");
      }
      const { r, s, v } = signature;

      // Tampering signatures
      const responseSend1 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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

      // Tampering "from"
      transaction1.from = transaction2.from;
      const responseSend2 = await request(server)
        .post("/jsonrpc")
        .auth(defaultSignerSiopAccessToken, { type: "bearer" })
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
          message: expect.stringContaining(
            "does not match with unsignedTransaction.from",
          ),
        },
        id: "46",
        jsonrpc: "2.0",
      });
      expect(responseSend1.status).toBe(400);
    });
  });
});
