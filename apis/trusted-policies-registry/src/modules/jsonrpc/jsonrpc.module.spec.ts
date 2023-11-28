import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  it,
  expect,
} from "vitest";
import crypto from "node:crypto";
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
import { createJWT, ES256KSigner } from "did-jwt";
import * as SiopLib from "@cef-ebsi/siop-auth";
import type { JWTVerifyResult } from "jose";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { JsonRpcModule } from "./jsonrpc.module.js";
import { JsonRpcService } from "./jsonrpc.service.js";
import type { JsonRpcResponseObject } from "./jsonrpc.interface.js";
import {
  UnsignedTransaction,
  InsertPolicyParam,
  UpdatePolicyParam,
  AddPolicyConditionsParam,
  DeletePolicyConditionParam,
  ActivatePolicyParam,
  DeactivatePolicyParam,
  InsertUserAttributesParam,
  UpdateUserAttributeParam,
  DeleteUserAttributeParam,
} from "./dto/index.js";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils.js";
import { AllExceptionsFilter } from "../../filters/http-exception.filter.js";
import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry.js";
import type { ApiConfig } from "../../config/configuration.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { ATTRIBUTE_OPERATIONS } from "../policies/policies.interface.js";
import { createPolicy } from "../../../tests/utils/data.js";

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
  | InsertPolicyParam
  | UpdatePolicyParam
  | AddPolicyConditionsParam
  | DeletePolicyConditionParam
  | ActivatePolicyParam
  | DeactivatePolicyParam;

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

  const policy1 = createPolicy(1, "my-policy1");
  const policy2 = createPolicy(1, "my-policy1");
  const policy3 = createPolicy(1, "my-policy1");
  const userAddress = ethers.Wallet.createRandom().address;

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
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

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = app.getHttpServer();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate JWTs
    userAccessTokenPayload = { sub: "did:ebsi:admin" };
    userAccessToken = await createJWT(userAccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(crypto.randomBytes(32)),
    });

    defaultSignerSiopAccessTokenPayload = {
      sub: "did:ebsi:default-signer",
    };
    defaultSignerSiopAccessToken = await createJWT(
      defaultSignerSiopAccessTokenPayload,
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32)),
      },
    );
  });

  beforeEach(() => {
    // Mock TSR contract
    vi.spyOn(ledgerService, "getContract").mockImplementation(async () =>
      Promise.resolve(testEnv.policiesRegistryContract),
    );

    // Make sure we never use axios.post or axios.get in tests ;-)
    vi.spyOn(axios, "post").mockImplementation((url: string) => {
      throw new Error(`Forgot to mock an axios call? POST ${url}`);
    });

    vi.spyOn(axios, "get").mockImplementation((url: string) => {
      throw new Error(`Forgot to mock an axios call? GET ${url}`);
    });

    // For the tests, we assume that the DID is controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      async () => Promise.resolve(true),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
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

  it("should reject a POST with an invalid user token", async () => {
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = vi
      .spyOn(SiopLib, "verifyJwtTar")
      .mockImplementation(
        async (): Promise<JWTVerifyResult> =>
          Promise.reject(new Error("error message")),
      );

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
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(userAccessToken, {
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
    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.resolve({
          payload: userAccessTokenPayload,
        } as unknown as JWTVerifyResult),
    );

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
    const wallet = ethers.Wallet.createRandom();

    const { opType, policyConditions, policyName, description } = policy1;

    // Mock access token verification
    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.resolve({
          payload: userAccessTokenPayload,
        } as unknown as JWTVerifyResult),
    );

    const transaction = {
      from: wallet.address,
      to: policiesRegistryContract.address,
      data: policiesRegistryContract.interface.encodeFunctionData(
        "insertPolicy",
        [opType, policyConditions, policyName, description],
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

    // Mock access token verification
    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.resolve({
          payload: userAccessTokenPayload,
        } as unknown as JWTVerifyResult),
    );

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

    // Mock access token verification
    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.resolve({
          payload: defaultSignerSiopAccessTokenPayload,
        } as unknown as JWTVerifyResult),
    );

    // The DID is not controlled by the signer
    vi.spyOn(jsonRpcService, "isDidControlledByAddress").mockImplementation(
      async () => Promise.resolve(false),
    );

    const { opType, policyConditions, policyName, description } = policy1;
    const param = {
      from: signer.address,
      opType,
      policyConditions,
      policyName,
      description,
    } as InsertPolicyParam;

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

    // Mock access token verification
    vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
      async (): Promise<JWTVerifyResult> =>
        Promise.resolve({
          payload: defaultSignerSiopAccessTokenPayload,
        } as unknown as JWTVerifyResult),
    );

    let param: JsonRpcParams | null = null;

    const signer = ethers.Wallet.createRandom();

    const { opType, policyConditions, policyName, description } = policy1;
    param = {
      from: signer.address,
      opType,
      policyConditions,
      policyName,
      description,
    } as InsertPolicyParam;

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

  // Tests to be repeated for every method
  describe.each([
    "insertPolicy",
    "updatePolicy-byPolicyId",
    "addPolicyConditions-byPolicyId",
    "deletePolicyCondition-byPolicyId",
    "deactivatePolicy-byPolicyId",
    "activatePolicy-byPolicyId",
    "updatePolicy-byPolicyName",
    "addPolicyConditions-byPolicyName",
    "deletePolicyCondition-byPolicyName",
    "deactivatePolicy-byPolicyName",
    "activatePolicy-byPolicyName",
    "insertUserAttributes",
    "updateUserAttribute",
    "deleteUserAttribute",
  ])("/jsonrpc with method %s", (testMethod: string) => {
    const [method, typeTest] = testMethod.split("-");
    const byPolicyId = typeTest === "byPolicyId";
    const byPolicyName = typeTest === "byPolicyName";

    it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
      expect.assertions(4);

      // Mock access token verification
      vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
        async (): Promise<JWTVerifyResult> =>
          Promise.resolve({
            payload: defaultSignerSiopAccessTokenPayload,
          } as unknown as JWTVerifyResult),
      );

      let param: JsonRpcParams | null = null;

      const signer = testEnv.adminWallet;

      switch (method) {
        case "insertPolicy": {
          const { opType, policyConditions, policyName, description } = policy1;
          param = {
            from: signer.address,
            opType,
            policyConditions,
            policyName,
            description,
          } as InsertPolicyParam;
          break;
        }
        case "updatePolicy": {
          const { opType, policyName, description } = policy2;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            opType,
            description,
          } as UpdatePolicyParam;
          break;
        }
        case "addPolicyConditions": {
          const { policyConditions, policyName } = policy3;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            policyConditions,
          } as AddPolicyConditionsParam;
          break;
        }
        case "deletePolicyCondition": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            policyConditionId: "2",
          } as DeletePolicyConditionParam;
          break;
        }
        case "deactivatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } as DeactivatePolicyParam;
          break;
        }
        case "activatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } as ActivatePolicyParam;
          break;
        }
        case "insertUserAttributes": {
          param = {
            from: signer.address,
            address: userAddress,
            attributeNames: ["attr1", "attr2"],
            attributeValues: ["0x00", "0x01"],
          } as InsertUserAttributesParam;
          break;
        }
        case "updateUserAttribute": {
          param = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr1",
            attributeValue: "0x01",
          } as UpdateUserAttributeParam;
          break;
        }
        case "deleteUserAttribute": {
          param = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr1",
          } as DeleteUserAttributeParam;
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

      // Mock access token verification
      vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
        async (): Promise<JWTVerifyResult> =>
          Promise.resolve({
            payload: defaultSignerSiopAccessTokenPayload,
          } as unknown as JWTVerifyResult),
      );

      const signer = ethers.Wallet.createRandom();

      let param: JsonRpcParams | null = null;

      switch (method) {
        case "insertPolicy": {
          const { opType, policyConditions, policyName, description } = policy1;
          param = {
            from: signer.address,
            opType,
            policyConditions,
            policyName,
            description,
          } as InsertPolicyParam;
          break;
        }
        case "updatePolicy": {
          const { opType, policyName, description } = policy2;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            opType,
            description,
          } as UpdatePolicyParam;
          break;
        }
        case "addPolicyConditions": {
          const { policyConditions, policyName } = policy3;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            policyConditions,
          } as AddPolicyConditionsParam;
          break;
        }
        case "deletePolicyCondition": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
            policyConditionId: "2",
          } as DeletePolicyConditionParam;
          break;
        }
        case "deactivatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } as DeactivatePolicyParam;
          break;
        }
        case "activatePolicy": {
          const { policyName } = policy1;
          param = {
            from: signer.address,
            ...(byPolicyId && { policyId: "1" }),
            ...(byPolicyName && { policyName }),
          } as ActivatePolicyParam;
          break;
        }
        case "insertUserAttributes": {
          param = {
            from: signer.address,
            address: userAddress,
            attributeNames: ["attr1", "attr2"],
            attributeValues: ["0x00", "0x01"],
          } as InsertUserAttributesParam;
          break;
        }
        case "updateUserAttribute": {
          param = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr1",
            attributeValue: "0x01",
          } as UpdateUserAttributeParam;
          break;
        }
        case "deleteUserAttribute": {
          param = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr1",
          } as DeleteUserAttributeParam;
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
      // Mock access token verification
      vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
        async (): Promise<JWTVerifyResult> =>
          Promise.resolve({
            payload: defaultSignerSiopAccessTokenPayload,
          } as unknown as JWTVerifyResult),
      );

      const signer = ethers.Wallet.createRandom();

      const testSetup: {
        params: JsonRpcParams;
        expectedErrorMessage: string;
        accessToken?: string;
      }[] = [];

      switch (method) {
        case "insertPolicy": {
          testSetup.push({
            params: {
              from: signer.address,
              opType: policy1.opType,
              policyConditions: policy1.policyConditions.map(
                ({ expectedValue, ...condition }) => condition,
              ),
              policyName: policy1.policyName,
              // description: policy1.description, <- missing description
            } as InsertPolicyParam,
            expectedErrorMessage:
              "- Invalid params.0.description provided: description must be a string",
          });

          testSetup.push({
            params: {
              from: signer.address,
              opType: policy2.opType,
              // policyConditions: policy2.policyConditions, <- missing policyConditions
              policyName: policy2.policyName,
              description: policy2.description,
            } as InsertPolicyParam,
            expectedErrorMessage:
              "Invalid params.0.policyConditions provided: policyConditions must be an array",
          });

          testSetup.push({
            params: {
              from: signer.address,
              opType: policy2.opType,
              policyConditions: [
                ...policy2.policyConditions,
                {
                  name: "condition-string",
                  attributeName: "any",
                  value: `0x${Buffer.from("vxc4gdbfgb", "utf-8").toString(
                    "hex",
                  )}`,
                  expectedValue: "vxc4gdbfgb",
                  attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
                  typeOfValue: 47, // invalid typeOfValue
                },
              ].map(({ expectedValue, ...condition }) => condition),
              policyName: policy2.policyName,
              description: policy2.description,
            } as InsertPolicyParam,
            expectedErrorMessage:
              "Invalid params.0.policyConditions provided: each value in policyConditions. condition 5: typeOfValue must be 0 (UINT256), 1 (BYTES), 2 (ADDRESS), 3 (BYTES32), 4 (STRING), or 5 (BOOLEAN)",
          });

          testSetup.push({
            params: {
              from: "bad address",
              opType: policy2.opType,
              policyConditions: policy2.policyConditions,
              policyName: policy2.policyName,
              description: policy2.description,
            } as InsertPolicyParam,
            expectedErrorMessage:
              "Invalid params.0.from provided: from must be an Ethereum address",
          });

          break;
        }
        case "updatePolicy": {
          testSetup.push({
            params: {
              from: signer.address,
              opType: policy1.opType,
              policyId: "1",
              policyName: policy1.policyName,
              // description: policy1.description, <- missing description
            } as UpdatePolicyParam,
            expectedErrorMessage:
              "- Invalid params.0.description provided: description must be a string",
          });

          testSetup.push({
            params: {
              from: signer.address,
              opType: policy2.opType,
              policyId: "1",
              policyName: policy2.policyName,
              description: 15, // Invalid description
            } as unknown as UpdatePolicyParam,
            expectedErrorMessage:
              "Invalid params.0.description provided: description must be a string",
          });

          testSetup.push({
            params: {
              from: signer.address,
              opType: policy2.opType,
              policyId: "0x69042",
              policyName: policy2.policyName,
              description: policy2.description,
            } as UpdatePolicyParam,
            expectedErrorMessage:
              "Invalid params.0.policyId provided: policyId must be a number string",
          });

          testSetup.push({
            params: {
              from: "bad address",
              opType: policy2.opType,
              policyId: "1",
              policyName: policy2.policyName,
              description: policy2.description,
            } as UpdatePolicyParam,
            expectedErrorMessage:
              "Invalid params.0.from provided: from must be an Ethereum address",
          });

          break;
        }
        case "addPolicyConditions": {
          testSetup.push({
            params: {
              from: signer.address,
              policyId: "test",
              policyConditions: policy3.policyConditions.map(
                ({ expectedValue, ...condition }) => condition,
              ),
            } as AddPolicyConditionsParam,
            expectedErrorMessage:
              "- Invalid params.0.policyId provided: policyId must be a number string",
          });

          testSetup.push({
            params: {
              from: signer.address,
              policyId: "1",
              // policyConditions: policy3.policyConditions, <- missing policyConditions
            } as AddPolicyConditionsParam,
            expectedErrorMessage:
              "- Invalid params.0.policyConditions provided: policyConditions must be an array",
          });

          testSetup.push({
            params: {
              from: signer.address,
              policyId: "1",
              policyConditions: [
                ...policy2.policyConditions,
                {
                  name: "condition-string",
                  attributeName: "any",
                  value: `0x${Buffer.from("vxc4gdbfgb", "utf-8").toString(
                    "hex",
                  )}`,
                  expectedValue: "vxc4gdbfgb",
                  attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
                  typeOfValue: 47, // invalid typeOfValue
                },
              ].map(({ expectedValue, ...condition }) => condition),
            } as AddPolicyConditionsParam,
            expectedErrorMessage:
              "Invalid params.0.policyConditions provided: each value in policyConditions. condition 5: typeOfValue must be 0 (UINT256), 1 (BYTES), 2 (ADDRESS), 3 (BYTES32), 4 (STRING), or 5 (BOOLEAN)",
          });

          break;
        }
        case "deletePolicyCondition": {
          testSetup.push({
            params: {
              from: signer.address,
              policyId: "test",
              policyConditionId: "1",
            } as DeletePolicyConditionParam,
            expectedErrorMessage:
              "- Invalid params.0.policyId provided: policyId must be a number string",
          });

          testSetup.push({
            params: {
              from: signer.address,
              policyId: "1",
              policyConditionId: "test",
            } as DeletePolicyConditionParam,
            expectedErrorMessage:
              "- Invalid params.0.policyConditionId provided: policyConditionId must be a number string",
          });

          break;
        }
        case "deactivatePolicy": {
          testSetup.push({
            params: {
              from: signer.address,
              policyId: "test",
            } as DeactivatePolicyParam,
            expectedErrorMessage:
              "- Invalid params.0.policyId provided: policyId must be a number string",
          });

          break;
        }
        case "activatePolicy": {
          testSetup.push({
            params: {
              from: signer.address,
              policyId: "test",
            } as ActivatePolicyParam,
            expectedErrorMessage:
              "- Invalid params.0.policyId provided: policyId must be a number string",
          });

          break;
        }
        case "insertUserAttributes": {
          testSetup.push({
            params: {
              from: signer.address,
              address: userAddress,
              attributeNames: "attr1",
              attributeValues: ["0x00", "0x01"],
            } as unknown as InsertUserAttributesParam,
            expectedErrorMessage:
              "- Invalid params.0.attributeNames provided: attributeNames must be an array",
          });

          break;
        }
        case "updateUserAttribute": {
          testSetup.push({
            params: {
              from: signer.address,
              address: userAddress,
              attributeName: 12,
              attributeValue: "0x01",
            } as unknown as UpdateUserAttributeParam,
            expectedErrorMessage:
              "- Invalid params.0.attributeName provided: attributeName must be a string",
          });

          break;
        }
        case "deleteUserAttribute": {
          testSetup.push({
            params: {
              from: signer.address,
              address: userAddress,
              attributeName: 12,
            } as unknown as DeleteUserAttributeParam,
            expectedErrorMessage:
              "- Invalid params.0.attributeName provided: attributeName must be a string",
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
        const response1 = await request(server)
          .post("/jsonrpc")
          .auth(defaultSignerSiopAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [setup.params],
            id: 231,
          });

        expect(response1.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          error: {
            code: -32600,
            message: expect.stringContaining(setup.expectedErrorMessage),
          },
        });
        expect(response1.status).toBe(400);
      }
    });

    it("should throw an error when the unsignedTransaction has been tampered", async () => {
      expect.assertions(6);

      // Mock access token verification
      vi.spyOn(SiopLib, "verifyJwtTar").mockImplementation(
        async (): Promise<JWTVerifyResult> =>
          Promise.resolve({
            payload: defaultSignerSiopAccessTokenPayload,
          } as unknown as JWTVerifyResult),
      );

      const signer = ethers.Wallet.createRandom();

      let param1: JsonRpcParams;
      let param2: JsonRpcParams;

      switch (method) {
        case "insertPolicy": {
          const { opType, policyConditions, policyName, description } = policy1;

          param1 = {
            from: signer.address,
            opType,
            policyConditions,
            policyName,
            description,
          } as InsertPolicyParam;
          param2 = {
            from: signer.address,
            opType,
            policyConditions,
            policyName: "another name",
            description,
          } as InsertPolicyParam;
          break;
        }
        case "updatePolicy": {
          const { opType, policyName, description } = policy1;

          param1 = {
            from: signer.address,
            policyId: "1",
            opType,
            policyName,
            description,
          } as UpdatePolicyParam;
          param2 = {
            from: signer.address,
            policyId: "1",
            opType,
            policyName: "another name",
            description,
          } as UpdatePolicyParam;
          break;
        }
        case "addPolicyConditions": {
          const { policyConditions } = policy3;

          param1 = {
            from: signer.address,
            policyId: "1",
            policyConditions,
          } as AddPolicyConditionsParam;

          param2 = {
            from: signer.address,
            policyId: "2",
            policyConditions,
          } as AddPolicyConditionsParam;
          break;
        }
        case "deletePolicyCondition": {
          param1 = {
            from: signer.address,
            policyId: "1",
            policyConditionId: "2",
          } as DeletePolicyConditionParam;

          param2 = {
            from: signer.address,
            policyId: "1",
            policyConditionId: "3",
          } as DeletePolicyConditionParam;
          break;
        }
        case "deactivatePolicy": {
          param1 = {
            from: signer.address,
            policyId: "1",
          } as DeactivatePolicyParam;

          param2 = {
            from: signer.address,
            policyId: "2",
          } as DeactivatePolicyParam;

          break;
        }
        case "activatePolicy": {
          param1 = {
            from: signer.address,
            policyId: "1",
          } as ActivatePolicyParam;

          param2 = {
            from: signer.address,
            policyId: "2",
          } as ActivatePolicyParam;

          break;
        }
        case "insertUserAttributes": {
          param1 = {
            from: signer.address,
            address: userAddress,
            attributeNames: ["attr1", "attr2"],
            attributeValues: ["0x00", "0x01"],
          } as InsertUserAttributesParam;

          param2 = {
            from: signer.address,
            address: userAddress,
            attributeNames: ["attr1", "attr3"],
            attributeValues: ["0x00", "0x01"],
          } as InsertUserAttributesParam;
          break;
        }
        case "updateUserAttribute": {
          param1 = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr1",
            attributeValue: "0x01",
          } as UpdateUserAttributeParam;

          param2 = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr2",
            attributeValue: "0x01",
          } as UpdateUserAttributeParam;
          break;
        }
        case "deleteUserAttribute": {
          param1 = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr1",
          } as DeleteUserAttributeParam;

          param2 = {
            from: signer.address,
            address: userAddress,
            attributeName: "attr2",
          } as DeleteUserAttributeParam;
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
