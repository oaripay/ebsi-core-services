import axios from "axios";
import request from "supertest";
import crypto from "crypto";
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
import { Session as SiopSession } from "@cef-ebsi/siop-auth";
import { JsonRpcModule } from "./jsonrpc.module";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import {
  UnsignedTransaction,
  InsertPolicyParam,
  UpdatePolicyParam,
} from "./dto";
import { formatEthersUnsignedTransaction } from "./jsonrpc.utils";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { PolicyRegistry } from "../../contracts";
import { setupTestEnv } from "../../../tests/utils/trustedPoliciesRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { ApiConfig } from "../../config/configuration";
import { LedgerService } from "../../shared/services/ledger.service";
import { ATTRIBUTE_OPERATIONS } from "../policies/policies.interface";
import { createPolicy } from "../../../tests/utils/data";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams = InsertPolicyParam | UpdatePolicyParam;

jest.setTimeout(180000);

describe("JsonRpc Module", () => {
  let app: INestApplication;
  let server: HttpServer;
  let policiesRegistryContract: PolicyRegistry;
  let jsonRpcService: JsonRpcService;
  let configService: ConfigService<ApiConfig>;
  let ledgerService: LedgerService;
  let testEnv: AsyncReturnType<typeof setupTestEnv>;
  let userAccessToken: string;
  let userAccessTokenPayload: { [x: string]: unknown };
  let defaultSignerSiopAccessToken: string;
  let defaultSignerSiopAccessTokenPayload: { [x: string]: unknown };

  const policy1 = createPolicy();
  const policy2 = createPolicy();

  beforeAll(async () => {
    // Spin up test blockchain (ganache)
    testEnv = await setupTestEnv();
    policiesRegistryContract = testEnv.policiesRegistryContract;

    // Start server
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    // Generate JWTs
    userAccessTokenPayload = { sub: "did:ebsi:admin" };
    userAccessToken = await createJWT(userAccessTokenPayload, {
      issuer: "any",
      signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
    });

    defaultSignerSiopAccessTokenPayload = {
      sub: "did:ebsi:default-signer",
    };
    defaultSignerSiopAccessToken = await createJWT(
      defaultSignerSiopAccessTokenPayload,
      {
        issuer: "any",
        signer: ES256KSigner(crypto.randomBytes(32).toString("hex")),
      }
    );
  });

  beforeEach(() => {
    // Mock TSR contract
    jest
      .spyOn(ledgerService, "getContract")
      .mockImplementation(async () =>
        Promise.resolve(testEnv.policiesRegistryContract)
      );

    // Make sure we never use axios.post or axios.get in tests ;-)
    jest.spyOn(axios, "post").mockImplementation((url: string) => {
      throw new Error(`Forgot to mock an axios call? POST ${url}`);
    });

    jest.spyOn(axios, "get").mockImplementation((url: string) => {
      throw new Error(`Forgot to mock an axios call? GET ${url}`);
    });

    // For the tests, we assume that the DID is controlled by the signer
    jest
      .spyOn(jsonRpcService, "isDidControlledByAddress")
      .mockImplementation(async () => Promise.resolve(true));
  });

  afterEach(() => {
    jest.resetAllMocks();
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
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
  });

  it("should reject a POST with an invalid user token", async () => {
    expect.assertions(4);

    // Mock reject JWT
    const verifyAccessTokenSpy = jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.reject(new Error("error message"))
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
      (response.headers as { "content-type": string })["content-type"]
    ).toStrictEqual(expect.stringContaining("application/problem+json"));
    expect(verifyAccessTokenSpy).toHaveBeenCalledWith(
      userAccessToken,
      configService.get("authorisationApiDid")
    );
  });

  it("should throw Bad Request for a bad JSON-RPC call", async () => {
    expect.assertions(2);

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve(userAccessTokenPayload));

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

    const { opType, policyConditions, policyName, registry } = policy1;

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve(userAccessTokenPayload));

    const transaction = {
      from: wallet.address,
      to: policiesRegistryContract.address,
      data: policiesRegistryContract.interface.encodeFunctionData(
        "insertPolicy",
        [opType, policyConditions, policyName, registry]
      ),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(JSON.stringify(transaction)) as unknown as UnsignedTransaction
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
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () => Promise.resolve(userAccessTokenPayload));

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
          "The method 'unknown-method' is invalid"
        ) as string,
      },
    });
    expect(response.status).toBe(400);
  });

  it("should throw an error if the signer doesn't control the DID", async () => {
    expect.assertions(4);

    const signer = ethers.Wallet.createRandom();

    // Mock access token verification
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.resolve(defaultSignerSiopAccessTokenPayload)
      );

    // The DID is not controlled by the signer
    jest
      .spyOn(jsonRpcService, "isDidControlledByAddress")
      .mockImplementation(async () => Promise.resolve(false));

    const { opType, policyConditions, policyName, registry } = policy1;
    const param = {
      from: signer.address,
      opType,
      policyConditions,
      policyName,
      registry,
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
    jest
      .spyOn(SiopSession.prototype, "verifyAccessToken")
      .mockImplementation(async () =>
        Promise.resolve(defaultSignerSiopAccessTokenPayload)
      );

    let param: JsonRpcParams = null;

    const signer = ethers.Wallet.createRandom();

    const { opType, policyConditions, policyName, registry } = policy1;
    param = {
      from: signer.address,
      opType,
      policyConditions,
      policyName,
      registry,
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
          `reverted with reason string 'AccessControl: account ${signer.address.toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929'`
        ) as string,
      },
      jsonrpc: "2.0",
      id: "45",
    });
    expect(responseSend.status).toBe(400);
  });

  // Tests to be repeated for every method
  describe.each(["insertPolicy", "updatePolicy"])(
    "/jsonrpc with method %s",
    (method: string) => {
      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(4);

        // Mock access token verification
        jest
          .spyOn(SiopSession.prototype, "verifyAccessToken")
          .mockImplementation(async () =>
            Promise.resolve(defaultSignerSiopAccessTokenPayload)
          );

        let param: JsonRpcParams = null;

        const signer = testEnv.adminWallet;

        switch (method) {
          case "insertPolicy": {
            const { opType, policyConditions, policyName, registry } = policy1;
            param = {
              from: signer.address,
              opType,
              policyConditions,
              policyName,
              registry,
            } as InsertPolicyParam;
            break;
          }
          case "updatePolicy": {
            const { opType, policyName, registry } = policy2;
            param = {
              from: signer.address,
              policyId: "1",
              opType,
              policyName,
              registry,
            } as UpdatePolicyParam;
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
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);
      });

      it("should accept a request without id", async () => {
        expect.assertions(2);

        // Mock access token verification
        jest
          .spyOn(SiopSession.prototype, "verifyAccessToken")
          .mockImplementation(async () =>
            Promise.resolve(defaultSignerSiopAccessTokenPayload)
          );

        const signer = ethers.Wallet.createRandom();

        let param: JsonRpcParams = null;

        switch (method) {
          case "insertPolicy": {
            const { opType, policyConditions, policyName, registry } = policy1;
            param = {
              from: signer.address,
              opType,
              policyConditions,
              policyName,
              registry,
            } as InsertPolicyParam;
            break;
          }
          case "updatePolicy": {
            const { opType, policyName, registry } = policy2;
            param = {
              from: signer.address,
              opType,
              policyId: "1",
              policyName,
              registry,
            } as UpdatePolicyParam;
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
          result: expect.objectContaining({}) as unknown,
        });
        expect(responseBuild.status).toBe(200);
      });

      it(`should throw an Invalid Request error for bad use of ${method}`, async () => {
        // Mock access token verification
        jest
          .spyOn(SiopSession.prototype, "verifyAccessToken")
          .mockImplementation(async () =>
            Promise.resolve(defaultSignerSiopAccessTokenPayload)
          );

        const signer = ethers.Wallet.createRandom();

        const params: JsonRpcParams[] = [];
        const expectedErrorMessages: string[] = [];

        switch (method) {
          case "insertPolicy": {
            params.push({
              from: signer.address,
              opType: policy1.opType,
              policyConditions: policy1.policyConditions.map(
                ({ expectedValue, ...condition }) => condition
              ),
              // policyName: policy1.policyName, <- missing policyName
              registry: policy1.registry,
            } as InsertPolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyName provided: policyName must be a string"
            );

            params.push({
              from: signer.address,
              opType: policy2.opType,
              // policyConditions: policy2.policyConditions, <- missing policyConditions
              policyName: policy2.policyName,
              registry: policy2.registry,
            } as InsertPolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.policyConditions provided: policyConditions must be an array"
            );

            params.push({
              from: signer.address,
              opType: policy2.opType,
              policyConditions: [
                ...policy2.policyConditions,
                {
                  name: "condition-string",
                  attributeName: "any",
                  value: `0x${Buffer.from("vxc4gdbfgb", "utf-8").toString(
                    "hex"
                  )}`,
                  expectedValue: "vxc4gdbfgb",
                  attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
                  typeOfValue: 47, // invalid typeOfValue
                },
              ].map(({ expectedValue, ...condition }) => condition),
              policyName: policy2.policyName,
              registry: policy2.registry,
            } as InsertPolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.policyConditions.5.typeOfValue provided: typeOfValue must be less or equal to 5"
            );

            params.push({
              from: "bad address",
              opType: policy2.opType,
              policyConditions: policy2.policyConditions,
              policyName: policy2.policyName,
              registry: policy2.registry,
            } as InsertPolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.from provided: from must be an Ethereum address"
            );

            break;
          }
          case "updatePolicy": {
            params.push({
              from: signer.address,
              opType: policy1.opType,
              policyId: "1",
              // policyName: policy1.policyName, <- missing policyName
              registry: policy1.registry,
            } as UpdatePolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyName provided: policyName must be a string"
            );

            params.push({
              from: signer.address,
              opType: policy2.opType,
              policyId: "1",
              policyName: policy2.policyName,
              registry: 15, // Invalid registry
            } as unknown as UpdatePolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.registry provided: registry must be a string"
            );

            params.push({
              from: signer.address,
              opType: policy2.opType,
              policyId: "0x69042",
              policyName: policy2.policyName,
              registry: policy2.registry,
            } as UpdatePolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.policyId provided: policyId must be a number string"
            );

            params.push({
              from: "bad address",
              opType: policy2.opType,
              policyId: "1",
              policyName: policy2.policyName,
              registry: policy2.registry,
            } as UpdatePolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.from provided: from must be an Ethereum address"
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
                message: expect.stringContaining(
                  expectedErrorMessages[index]
                ) as string,
              },
            });
            expect(response1.status).toBe(400);
          })
        );
      });

      it("should throw an error when the unsignedTransaction has been tampered", async () => {
        expect.assertions(6);

        // Mock access token verification
        jest
          .spyOn(SiopSession.prototype, "verifyAccessToken")
          .mockImplementation(async () =>
            Promise.resolve(defaultSignerSiopAccessTokenPayload)
          );

        const signer = ethers.Wallet.createRandom();

        let param1: JsonRpcParams;
        let param2: JsonRpcParams;

        switch (method) {
          case "insertPolicy": {
            const { opType, policyConditions, policyName, registry } = policy1;

            param1 = {
              from: signer.address,
              opType,
              policyConditions,
              policyName,
              registry,
            } as InsertPolicyParam;
            param2 = {
              from: signer.address,
              opType,
              policyConditions,
              policyName: "another name",
              registry,
            } as InsertPolicyParam;
            break;
          }
          case "updatePolicy": {
            const { opType, policyName, registry } = policy1;

            param1 = {
              from: signer.address,
              policyId: "1",
              opType,
              policyName,
              registry,
            } as UpdatePolicyParam;
            param2 = {
              from: signer.address,
              policyId: "1",
              opType,
              policyName: "another name",
              registry,
            } as UpdatePolicyParam;
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
            JSON.stringify(transaction1)
          ) as unknown as UnsignedTransaction
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
              "does not match with the signedRawTransaction"
            ) as string,
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
              "does not match with unsignedTransaction.from"
            ) as string,
          },
        });
        expect(responseSend1.status).toBe(400);
      });
    }
  );
});
