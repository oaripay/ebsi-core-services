import { describe, beforeAll, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import {
  PaginatedList,
  prefixWith0x,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import {
  PolicyLink,
  PolicyResponseObject,
} from "../../src/modules/policies/policies.interface.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import {
  ActivatePolicyParam,
  DeactivatePolicyParam,
  InsertPolicyParam,
  UnsignedTransaction,
  UpdatePolicyParam,
} from "../../src/modules/jsonrpc/dto/index.js";
import { createPolicy } from "../utils/data.js";
import { requestSiopJwt } from "../utils/siopJwt.js";
import { describeWriteOps, writeOps } from "../utils/writeOps.js";
import { getServer } from "../utils/getServer.js";

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

interface SupertestPolicyResponse {
  status: number;
  body: PolicyResponseObject;
}

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertPolicyParam
  | UpdatePolicyParam
  | ActivatePolicyParam
  | DeactivatePolicyParam;

describe("TPR API v3 - Policies (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerApi: string;
  let adminTestWallet: ethers.Wallet;
  let testAdminAccessToken: string;
  let testUserAccessToken: string;
  let sampleTransaction: string;

  let blockscout: {
    url: string;
    bearerToken: string;
  };

  const pName = `test-${crypto.randomBytes(5).toString("hex")}`;
  const policy1 = createPolicy(1, pName);
  const policy2 = createPolicy(1, pName);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    server = getServer(app, configService);

    if (writeOps()) {
      adminTestWallet = new ethers.Wallet(
        prefixWith0x(configService.get("testAdminPrivateKey")),
      );

      // Generate a valid Client JWT (SIOP) for the tests
      try {
        testUserAccessToken = await requestSiopJwt({
          clientKid: configService.get<string>("testUserKid"),
          clientPrivateKey: configService.get<string>("testUserPrivateKey"),
          configService,
        });

        testAdminAccessToken = await requestSiopJwt({
          clientKid: configService.get<string>("testAdminKid"),
          clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
          configService,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    }

    blockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");
  });

  afterAll(async () => {
    await app.close();
  });

  describeWriteOps()("/jsonrpc", () => {
    // policy id to test "activate" and "deactivate"
    let policyA: PolicyResponseObject;
    beforeAll(async () => {
      let getPoliciesResponse: SupertestPoliciesResponse =
        await request(server).get("/policies");
      const { last } = getPoliciesResponse.body.links!;
      getPoliciesResponse = await request(server).get(
        `/policies${last.slice(last.indexOf("?"))}`,
      );
      if (getPoliciesResponse.body.items.length === 1) {
        const { prev } = getPoliciesResponse.body.links!;
        getPoliciesResponse = await request(server).get(
          `/policies${prev.slice(last.indexOf("?"))}`,
        );
      }
      const name =
        getPoliciesResponse.body.items[
          getPoliciesResponse.body.items.length - 2
        ]!.policyName;
      const policyResponse: SupertestPolicyResponse = await request(server).get(
        `/policies/${name}`,
      );
      policyA = policyResponse.body;
    });

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

      const invalidAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const response = await request(server)
        .post("/jsonrpc")
        .auth(invalidAccessToken, { type: "bearer" })
        .send();

      let trustedAppsRegistryApiUrl = configService.get<string>(
        "trustedAppsRegistryApiUrl",
      );

      // Use TEST_LB_DOMAIN if defined
      if (configService.get<string>("testLoadBalancerDomain")) {
        trustedAppsRegistryApiUrl = trustedAppsRegistryApiUrl.replace(
          configService.get<string>("domain"),
          configService.get<string>("testLoadBalancerDomain"),
        );
      }

      expect(response.body).toStrictEqual({
        detail: `Invalid JWT: JWT with invalid kid. It should be hosted at ${trustedAppsRegistryApiUrl}/apps`,
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
        .auth(testAdminAccessToken, { type: "bearer" })
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

      const response = await request(server)
        .post("/jsonrpc")
        .auth(testAdminAccessToken, { type: "bearer" })
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

      const { policyName, description } = policy1;
      const param = {
        from: signer.address,
        policyName,
        description,
      } as InsertPolicyParam;

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testAdminAccessToken, { type: "bearer" })
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
        .auth(testAdminAccessToken, { type: "bearer" })
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
          message: `The DID ${
            configService.get<string>("testAdminKid").split("#")[0]
          } is not controlled by the address ${signer.address}`,
        },
        id: "45",
        jsonrpc: "2.0",
      });
      expect(responseSend.status).toBe(400);
    });

    it("should throw an error if the wallet doesn't have the role OPERATOR_ROLE 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929", async () => {
      expect.assertions(3);

      let param: JsonRpcParams | null = null;

      const signer = new ethers.Wallet(configService.get("testUserPrivateKey"));

      const { policyName, description } = policy1;
      param = {
        from: signer.address,
        policyName,
        description,
      } as InsertPolicyParam;

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
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

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
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

      // Wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
        responseSend.body.result as string,
      );

      // The transaction should have failed
      expect(receipt.status).toBe(0);
    });

    // Tests to be repeated for every method
    describe.each([
      "insertPolicy",
      "updatePolicy",
      "deactivatePolicy",
      "activatePolicy",
    ])("/jsonrpc with method %s", (method: string) => {
      describeWriteOps()("(test writing data on the ledger)", () => {
        it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
          expect.assertions(7);

          let param: JsonRpcParams | null = null;

          // Get number of existing policies
          const response: SupertestPoliciesResponse =
            await request(server).get("/policies");
          // Update last policy
          const lastPolicyId = `${response.body.total}`;

          // Use test account, as defined in hardhat.config.ts
          const signer = adminTestWallet;

          switch (method) {
            case "insertPolicy": {
              const { policyName, description } = policy1;
              param = {
                from: signer.address,
                policyName,
                description,
              } as InsertPolicyParam;
              break;
            }
            case "updatePolicy": {
              const { policyName, description } = policy2;
              param = {
                from: signer.address,
                policyName,
                description,
              } as UpdatePolicyParam;
              break;
            }
            case "deactivatePolicy": {
              param = {
                from: signer.address,
                policyName: policyA.policyName,
              } as DeactivatePolicyParam;
              break;
            }
            case "activatePolicy": {
              param = {
                from: signer.address,
                policyName: policyA.policyName,
              } as ActivatePolicyParam;
              break;
            }
            default: {
              throw new Error(`Test Error: Invalid method ${method}`);
            }
          }

          const responseBuild: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(testAdminAccessToken, { type: "bearer" })
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

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(testAdminAccessToken, { type: "bearer" })
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

          // Wait to be mined
          const receipt = await waitToBeMined(
            ledgerApi,
            responseSend.body.result as string,
          );
          expect(receipt.status).toBe(1);
          sampleTransaction = responseSend.body.result as string;

          // Check if policy has been inserted/updated correctly
          let expectedResponseBody: unknown;
          let actualResponse: SupertestPoliciesResponse;

          switch (method) {
            case "insertPolicy": {
              const { policyName, description } = policy1;

              // Get number of existing policies
              const getPoliciesResponse: SupertestPoliciesResponse =
                await request(server).get("/policies");

              const policyId = `${getPoliciesResponse.body.total}`;

              // Expected response
              expectedResponseBody = {
                policyId: `${policyId}`,
                policyName,
                description,
                status: true,
              } as PolicyResponseObject;

              // Actual response
              actualResponse = await request(server).get(
                `/policies/${policyName}`,
              );

              break;
            }
            case "updatePolicy": {
              const { policyName, description } = policy2;

              // Expected response
              expectedResponseBody = {
                policyId: `${lastPolicyId}`,
                policyName,
                description,
                status: true,
              } as PolicyResponseObject;

              // Actual response
              actualResponse = await request(server).get(
                `/policies/${policyName}`,
              );

              break;
            }
            case "deactivatePolicy": {
              // Expected response
              expectedResponseBody = {
                ...policyA,
                status: false,
              } as PolicyResponseObject;

              // Actual response
              actualResponse = await request(server).get(
                `/policies/${policyA.policyName}`,
              );

              break;
            }
            case "activatePolicy": {
              // Expected response
              expectedResponseBody = policyA;

              // Actual response
              actualResponse = await request(server).get(
                `/policies/${policyA.policyName}`,
              );

              break;
            }
            default: {
              break;
            }
          }

          expect(actualResponse!.body).toStrictEqual(expectedResponseBody);
          expect(actualResponse!.status).toBe(200);
        });

        it("should return transaction data from blockscout", async () => {
          if (!blockscout.url || !sampleTransaction) return;

          expect.assertions(1);

          await new Promise((f) => {
            setTimeout(f, 5000);
          });

          // check if blockscout is working properly
          const blockscoutCheck = await request(blockscout.url)
            .get(`/tx/${sampleTransaction}/internal-transactions`)
            .set({ Authorization: blockscout.bearerToken });

          expect(blockscoutCheck.status).toBe(200);
        });
      });

      it("should accept a request without id", async () => {
        expect.assertions(2);

        const signer = adminTestWallet;

        let param: JsonRpcParams | null = null;

        switch (method) {
          case "insertPolicy": {
            const { policyName, description } = policy1;
            param = {
              from: signer.address,
              policyName,
              description,
            } as InsertPolicyParam;
            break;
          }
          case "updatePolicy": {
            const { policyName, description } = policy2;
            param = {
              from: signer.address,
              policyName,
              description,
            } as UpdatePolicyParam;
            break;
          }
          case "deactivatePolicy": {
            const { policyName } = policy1;
            param = {
              from: signer.address,
              policyName,
            } as DeactivatePolicyParam;
            break;
          }
          case "activatePolicy": {
            const { policyName } = policy1;
            param = {
              from: signer.address,
              policyName,
            } as ActivatePolicyParam;
            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        const responseBuild = await request(server)
          .post("/jsonrpc")
          .auth(testAdminAccessToken, { type: "bearer" })
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
              // policyName: policy1.policyName, <- missing policyName
              description: policy1.description,
            } as InsertPolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyName provided: policyName must be a string",
            );

            params.push({
              from: "bad address",
              policyName: policy2.policyName,
              description: policy2.description,
            } as InsertPolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.from provided: from must be an Ethereum address",
            );

            break;
          }
          case "updatePolicy": {
            params.push({
              from: signer.address,
              policyName: 40,
              description: policy1.description, // <- missing description
            } as unknown as UpdatePolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyName provided: policyName must be a string",
            );

            params.push({
              from: signer.address,
              policyName: policy2.policyName,
              description: 15, // Invalid description
            } as unknown as UpdatePolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.description provided: description must be a string",
            );

            params.push({
              from: signer.address,
              policyId: "test",
              description: policy2.description,
            } as UpdatePolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.policyId provided: policyId must be a number string",
            );

            params.push({
              from: "bad address",
              policyName: policy2.policyName,
              description: policy2.description,
            } as UpdatePolicyParam);

            expectedErrorMessages.push(
              "Invalid params.0.from provided: from must be an Ethereum address",
            );

            break;
          }
          case "deactivatePolicy": {
            params.push({
              from: signer.address,
              policyId: "test",
            } as DeactivatePolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyId provided: policyId must be a number string",
            );

            break;
          }
          case "activatePolicy": {
            params.push({
              from: signer.address,
              policyId: "test",
            } as ActivatePolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyId provided: policyId must be a number string",
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
              .auth(testAdminAccessToken, {
                type: "bearer",
              })
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

        const signer = adminTestWallet;

        let param1: JsonRpcParams;
        let param2: JsonRpcParams;

        switch (method) {
          case "insertPolicy": {
            const { policyName, description } = policy1;

            param1 = {
              from: signer.address,
              policyName,
              description,
            } as InsertPolicyParam;
            param2 = {
              from: signer.address,
              policyName: "another name",
              description,
            } as InsertPolicyParam;
            break;
          }
          case "updatePolicy": {
            const { description } = policy1;

            param1 = {
              from: signer.address,
              policyId: "1",
              description,
            } as UpdatePolicyParam;
            param2 = {
              from: signer.address,
              policyId: "1",
              policyName: "another name",
              description,
            } as UpdatePolicyParam;
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
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        const responseBuild1: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testAdminAccessToken, { type: "bearer" })
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
          .auth(testAdminAccessToken, { type: "bearer" })
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
          .auth(testAdminAccessToken, { type: "bearer" })
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
          .auth(testAdminAccessToken, { type: "bearer" })
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

  describe("/policies", () => {
    it("should return a collection of policies", async () => {
      expect.assertions(2);
      const response: SupertestPoliciesResponse =
        await request(server).get("/policies");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-policies-registry/v3/policies?page[after]=1&page[size]=10",
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-policies-registry/v3/policies?page[after]=1&page[size]=10",
            ),
            prev: expect.stringContaining(
              "/trusted-policies-registry/v3/policies?page[after]=1&page[size]=10",
            ),
            next: expect.stringContaining(
              "/trusted-policies-registry/v3/policies?page[after]=",
            ),
            last: expect.stringContaining(
              "/trusted-policies-registry/v3/policies?page[after]=",
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(2);

      // Get last policy
      const getPoliciesResponse: SupertestPoliciesResponse =
        await request(server).get("/policies");

      const policyId = `${getPoliciesResponse.body.total}`;
      const lastPageUrl = getPoliciesResponse.body.links!.last;
      const lastPage: SupertestPoliciesResponse = await request(server).get(
        lastPageUrl.slice(lastPageUrl.lastIndexOf("/policies")),
      );

      const response = await request(server).get(
        `/policies/${
          lastPage.body.items[lastPage.body.items.length - 1]!.policyName
        }`,
      );

      expect(response.body).toStrictEqual({
        policyId,
        policyName: expect.any(String),
        description: expect.any(String),
        status: expect.any(Boolean),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/69042");

      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy 69042 not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
