import { ethers } from "ethers";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { FastifyInstance } from "fastify";
import { ApiConfig } from "../../src/config/configuration";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
  PolicyConditionStructOutput,
  PolicyLink,
  PolicyResponseObject,
} from "../../src/modules/policies/policies.interface";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { PaginatedList } from "../../src/shared/interfaces";
import {
  ActivatePolicyParam,
  AddPolicyConditionsParam,
  DeactivatePolicyParam,
  DeletePolicyConditionParam,
  InsertPolicyParam,
  UnsignedTransaction,
  UpdatePolicyParam,
} from "../../src/modules/jsonrpc/dto";
import { prefixWith0x } from "../../src/shared/utils";
import { createPolicy } from "../utils/data";
import { requestSiopJwt } from "../utils/siopJwt";
import { waitToBeMined } from "../utils/waitToBeMined";
import { LedgerService } from "../../src/shared/services/ledger.service";

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

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

jest.setTimeout(180000);

describe("Policies (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig>;
  let ledgerService: LedgerService;
  let adminTestWallet: ethers.Wallet;
  let testAdminAccessToken: string;
  let testUserAccessToken: string;

  const policy1 = createPolicy();
  const policy2 = createPolicy();
  const policy3 = createPolicy();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    // Generate a valid Client JWT (SIOP) for the tests
    const didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    testUserAccessToken = await requestSiopJwt({
      didRegistry,
      clientDid: configService.get<string>("testUserDid"),
      clientPrivateKey: configService.get<string>("testUserPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
    });

    testAdminAccessToken = await requestSiopJwt({
      didRegistry,
      clientDid: configService.get<string>("testAdminDid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
    });
  });

  describe("/jsonrpc", () => {
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
      expect.assertions(3);

      const invalidAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const response = await request(server)
        .post("/jsonrpc")
        .auth(invalidAccessToken, { type: "bearer" })
        .send();

      expect(response.body).toStrictEqual({
        detail: "Invalid JWT: invalid_jwt: JWT iss is required",
        status: 401,
        title: "Unauthorized",
        type: "about:blank",
      });
      expect(response.status).toBe(401);
      expect(
        (response.headers as { "content-type": string })["content-type"]
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
            "The method 'unknown-method' is invalid"
          ) as string,
        },
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the signer doesn't control the DID", async () => {
      expect.assertions(4);

      const signer = ethers.Wallet.createRandom();

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
          message: `The DID ${configService.get<string>(
            "testAdminDid"
          )} is not controlled by the address ${signer.address}`,
        },
        id: "45",
        jsonrpc: "2.0",
      });
      expect(responseSend.status).toBe(400);
    });

    it("should throw an error if the wallet doesn't have the role OPERATOR_ROLE 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929", async () => {
      expect.assertions(3);

      let param: JsonRpcParams = null;

      const signer = new ethers.Wallet(configService.get("testUserPrivateKey"));

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
        ledgerService,
        responseSend.body.result as string
      );

      // The transaction should have failed
      expect(receipt.status).toBe(0);
    });

    // Tests to be repeated for every method
    describe.each([
      "insertPolicy",
      "updatePolicy",
      "addPolicyConditions",
      "deletePolicyCondition",
      "deactivatePolicy",
      "activatePolicy",
    ])("/jsonrpc with method %s", (method: string) => {
      it("should return a valid unsigned transaction that we can sign and send to sendSignedTransaction", async () => {
        expect.assertions(7);

        let param: JsonRpcParams = null;

        // Get number of existing policies
        const response: SupertestPoliciesResponse = await request(server).get(
          "/policies"
        );
        // Update last policy
        const lastPolicyId = `${response.body.total - 1}`;

        // Use test account, as defined in hardhat.config.ts
        const signer = adminTestWallet;

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
              policyId: lastPolicyId,
              opType,
              policyName,
              registry,
            } as UpdatePolicyParam;
            break;
          }
          case "addPolicyConditions": {
            const { policyConditions } = policy3;
            param = {
              from: signer.address,
              policyId: lastPolicyId,
              policyConditions,
            } as AddPolicyConditionsParam;
            break;
          }
          case "deletePolicyCondition": {
            param = {
              from: signer.address,
              policyId: lastPolicyId,
              policyConditionId: "2",
            } as DeletePolicyConditionParam;
            break;
          }
          case "deactivatePolicy": {
            param = {
              from: signer.address,
              policyId: lastPolicyId,
            } as DeactivatePolicyParam;
            break;
          }
          case "activatePolicy": {
            param = {
              from: signer.address,
              policyId: lastPolicyId,
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
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // Wait to be mined
        const receipt = await waitToBeMined(
          ledgerService,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);

        // Check if policy has been inserted/updated correctly
        let expectedResponseBody: unknown;
        let actualResponse: SupertestPoliciesResponse;

        switch (method) {
          case "insertPolicy": {
            const { opType, policyConditions, policyName, registry } = policy1;

            // Get number of existing policies
            const getPoliciesResponse: SupertestPoliciesResponse =
              await request(server).get("/policies");

            const policyId = `${getPoliciesResponse.body.total - 1}`;

            // Expected response
            expectedResponseBody = {
              policyId: `${policyId}`,
              operationType: OPERATION_TYPES[opType],
              policyConditions: policyConditions.map((condition) => ({
                attributeName: condition.attributeName,
                attributeOperation:
                  ATTRIBUTE_OPERATIONS[condition.attributeOperation],
                name: condition.name,
                typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
                value: condition.expectedValue,
              })),
              policyName,
              registry,
              status: true,
            } as PolicyResponseObject;

            // Actual response
            actualResponse = await request(server).get(`/policies/${policyId}`);

            break;
          }
          case "updatePolicy": {
            const { policyConditions } = policy1;
            const { opType, policyName, registry } = policy2;

            // Expected response
            expectedResponseBody = {
              policyId: `${lastPolicyId}`,
              operationType: OPERATION_TYPES[opType],
              policyConditions: policyConditions.map((condition) => ({
                attributeName: condition.attributeName,
                attributeOperation:
                  ATTRIBUTE_OPERATIONS[condition.attributeOperation],
                name: condition.name,
                typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
                value: condition.expectedValue,
              })),
              policyName,
              registry,
              status: true,
            } as PolicyResponseObject;

            // Actual response
            actualResponse = await request(server).get(
              `/policies/${lastPolicyId}`
            );

            break;
          }
          case "addPolicyConditions": {
            const { policyConditions } = policy1;
            const { opType, policyName, registry } = policy2;
            const { policyConditions: newPolicyConditions } = policy3;

            // Expected response
            expectedResponseBody = {
              policyId: `${lastPolicyId}`,
              operationType: OPERATION_TYPES[opType],
              policyConditions: [
                ...policyConditions,
                ...newPolicyConditions,
              ].map((condition) => ({
                attributeName: condition.attributeName,
                attributeOperation:
                  ATTRIBUTE_OPERATIONS[condition.attributeOperation],
                name: condition.name,
                typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
                value: condition.expectedValue,
              })),
              policyName,
              registry,
              status: true,
            } as PolicyResponseObject;

            // Actual response
            actualResponse = await request(server).get(
              `/policies/${lastPolicyId}`
            );

            break;
          }
          case "deletePolicyCondition": {
            const { policyConditions } = policy1;
            const { opType, policyName, registry } = policy2;
            const { policyConditions: newPolicyConditions } = policy3;

            // Remove condition with conditionId = "2"
            // I.e. move last item to index = 2, then remove last item
            const conditions = [...policyConditions, ...newPolicyConditions];
            conditions.splice(2, 1, conditions[conditions.length - 1]);
            conditions.pop();

            // Expected response
            expectedResponseBody = {
              policyId: `${lastPolicyId}`,
              operationType: OPERATION_TYPES[opType],
              policyConditions: conditions.map((condition) => ({
                attributeName: condition.attributeName,
                attributeOperation:
                  ATTRIBUTE_OPERATIONS[condition.attributeOperation],
                name: condition.name,
                typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
                value: condition.expectedValue,
              })),
              policyName,
              registry,
              status: true,
            } as PolicyResponseObject;

            // Actual response
            actualResponse = await request(server).get(
              `/policies/${lastPolicyId}`
            );

            break;
          }
          case "deactivatePolicy": {
            const { policyConditions } = policy1;
            const { opType, policyName, registry } = policy2;
            const { policyConditions: newPolicyConditions } = policy3;

            // Remove condition with conditionId = "2"
            // I.e. move last item to index = 2, then remove last item
            const conditions = [...policyConditions, ...newPolicyConditions];
            conditions.splice(2, 1, conditions[conditions.length - 1]);
            conditions.pop();

            // Expected response
            expectedResponseBody = {
              policyId: `${lastPolicyId}`,
              operationType: OPERATION_TYPES[opType],
              policyConditions: conditions.map((condition) => ({
                attributeName: condition.attributeName,
                attributeOperation:
                  ATTRIBUTE_OPERATIONS[condition.attributeOperation],
                name: condition.name,
                typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
                value: condition.expectedValue,
              })),
              policyName,
              registry,
              status: false,
            } as PolicyResponseObject;

            // Actual response
            actualResponse = await request(server).get(
              `/policies/${lastPolicyId}`
            );

            break;
          }
          case "activatePolicy": {
            const { policyConditions } = policy1;
            const { opType, policyName, registry } = policy2;
            const { policyConditions: newPolicyConditions } = policy3;

            // Remove condition with conditionId = "2"
            // I.e. move last item to index = 2, then remove last item
            const conditions = [...policyConditions, ...newPolicyConditions];
            conditions.splice(2, 1, conditions[conditions.length - 1]);
            conditions.pop();

            // Expected response
            expectedResponseBody = {
              policyId: `${lastPolicyId}`,
              operationType: OPERATION_TYPES[opType],
              policyConditions: conditions.map((condition) => ({
                attributeName: condition.attributeName,
                attributeOperation:
                  ATTRIBUTE_OPERATIONS[condition.attributeOperation],
                name: condition.name,
                typeOfValue: ATTRIBUTE_TYPES[condition.typeOfValue],
                value: condition.expectedValue,
              })),
              policyName,
              registry,
              status: true,
            } as PolicyResponseObject;

            // Actual response
            actualResponse = await request(server).get(
              `/policies/${lastPolicyId}`
            );

            break;
          }
          default: {
            break;
          }
        }

        expect(actualResponse.body).toStrictEqual(expectedResponseBody);
        expect(actualResponse.status).toBe(200);
      });

      it("should accept a request without id", async () => {
        expect.assertions(2);

        const signer = adminTestWallet;

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
          case "addPolicyConditions": {
            const { policyConditions } = policy2;
            param = {
              from: signer.address,
              policyId: "1",
              policyConditions,
            } as AddPolicyConditionsParam;
            break;
          }
          case "deletePolicyCondition": {
            param = {
              from: signer.address,
              policyId: "1",
              policyConditionId: "2",
            } as DeletePolicyConditionParam;
            break;
          }
          case "deactivatePolicy": {
            param = {
              from: signer.address,
              policyId: "1",
            } as DeactivatePolicyParam;
            break;
          }
          case "activatePolicy": {
            param = {
              from: signer.address,
              policyId: "1",
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
          result: expect.objectContaining({}) as unknown,
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
          case "addPolicyConditions": {
            params.push({
              from: signer.address,
              policyId: "test",
              policyConditions: policy2.policyConditions.map(
                ({ expectedValue, ...condition }) => condition
              ),
            } as AddPolicyConditionsParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyId provided: policyId must be a number string"
            );

            params.push({
              from: signer.address,
              policyId: "1",
              // policyConditions: policy3.policyConditions, <- missing policyConditions
            } as AddPolicyConditionsParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyConditions provided: policyConditions must be an array"
            );

            params.push({
              from: signer.address,
              policyId: "1",
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
            } as AddPolicyConditionsParam);

            expectedErrorMessages.push(
              "Invalid params.0.policyConditions.5.typeOfValue provided: typeOfValue must be less or equal to 5"
            );
            break;
          }
          case "deletePolicyCondition": {
            params.push({
              from: signer.address,
              policyId: "test",
              policyConditionId: "1",
            } as DeletePolicyConditionParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyId provided: policyId must be a number string"
            );

            params.push({
              from: signer.address,
              policyId: "1",
              policyConditionId: "test",
            } as DeletePolicyConditionParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyConditionId provided: policyConditionId must be a number string"
            );

            break;
          }
          case "deactivatePolicy": {
            params.push({
              from: signer.address,
              policyId: "test",
            } as DeactivatePolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyId provided: policyId must be a number string"
            );

            break;
          }
          case "activatePolicy": {
            params.push({
              from: signer.address,
              policyId: "test",
            } as ActivatePolicyParam);

            expectedErrorMessages.push(
              "- Invalid params.0.policyId provided: policyId must be a number string"
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

        const signer = adminTestWallet;

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
          case "addPolicyConditions": {
            const { policyConditions } = policy2;

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
            JSON.stringify(transaction1)
          ) as unknown as UnsignedTransaction
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
              "does not match with the signedRawTransaction"
            ) as string,
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
              "does not match with unsignedTransaction.from"
            ) as string,
          },
        });
        expect(responseSend1.status).toBe(400);
      });
    });
  });

  describe("/policies", () => {
    it("should return a collection of policies", async () => {
      expect.assertions(2);
      const response: SupertestPoliciesResponse = await request(server).get(
        "/policies"
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-policies-registry/v1/policies?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-policies-registry/v1/policies?page[after]="
            ) as string,
          }) as PaginatedList<PolicyLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("GET /policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(2);

      // Get last policy
      const getPoliciesResponse: SupertestPoliciesResponse = await request(
        server
      ).get("/policies");

      const policyId = `${getPoliciesResponse.body.total - 1}`;

      const response = await request(server).get(`/policies/${policyId}`);

      expect(response.body).toStrictEqual<PolicyResponseObject>({
        policyId: `${policyId}`,
        policyName: expect.any(String) as string,
        registry: expect.any(String) as string,
        status: expect.any(Boolean) as boolean,
        operationType: expect.any(String) as typeof OPERATION_TYPES[number],
        policyConditions: expect.arrayContaining<PolicyConditionStructOutput>([
          expect.objectContaining<PolicyConditionStructOutput>({
            attributeName: expect.any(String) as string,
            attributeOperation: expect.any(
              String
            ) as typeof ATTRIBUTE_OPERATIONS[number],
            value: expect.any(String) as string,
            name: expect.any(String) as string,
            typeOfValue: expect.any(String) as typeof ATTRIBUTE_TYPES[number],
          }) as PolicyConditionStructOutput,
        ]) as PolicyConditionStructOutput[],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy ID is not valid", async () => {
      expect.assertions(2);

      const response = await request(server).get("/policies/invalid-policy-id");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["policyId must be a number string"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
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
