import { describe, beforeAll, afterAll, it, expect } from "vitest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import {
  PaginatedList,
  prefixWith0x,
  generateMultihash,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import { AppModule } from "../../src/app.module.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import {
  PolicyResponseObject,
  PolicyLink,
} from "../../src/modules/policies/policies.interface.js";
import { requestSiopJwt } from "../utils/siopJwt.js";
import { UnsignedTransaction } from "../../src/modules/jsonrpc/dto/index.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { getServer } from "../utils/getServer.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface SupertestPoliciesResponse {
  status: number;
  body: PaginatedList<PolicyLink>;
}

interface SupertestPolicyResponse {
  status: number;
  body: PolicyResponseObject;
}

interface SupertestRevisionsResponse {
  status: number;
  body: PaginatedList<PolicyResponseObject>;
}

describe("Policies (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;
  let besuRpcNode: string;
  let configService: ConfigService<ApiConfig, true>;

  const createPolicy = (
    n: string | number,
  ): { policyId: string; policyData: string } => {
    const policyId = `policy-test-${n}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const policyData = `0x${data.toString("hex")}`;

    return { policyId, policyData };
  };

  const newPolicy = createPolicy(new Date().toISOString());
  const { policyData: policy2 } = createPolicy(new Date().toISOString());

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

    server = getServer(app, configService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey")),
    );

    try {
      // Generate a valid Client JWT (SIOP) for the tests
      testUserAccessToken = await requestSiopJwt({
        clientDid: configService.get<string>("testAdminDid"),
        clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    besuRpcNode = configService.get("besuRpcNode");
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/policies", () => {
    it("should return a collection of policies", async () => {
      expect.assertions(2);
      const response: SupertestPoliciesResponse =
        await request(server).get("/policies");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-apps-registry/v3/policies?page[after]=1&page[size]=10",
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-apps-registry/v3/policies?page[after]=1&page[size]=10",
            ),
            prev: expect.stringContaining(
              "/trusted-apps-registry/v3/policies?page[after]=1&page[size]=10",
            ),
            next: expect.stringContaining(
              "/trusted-apps-registry/v3/policies?page[after]=",
            ),
            last: expect.stringContaining(
              "/trusted-apps-registry/v3/policies?page[after]=",
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(3);

      const policiesResponse: SupertestPoliciesResponse =
        await request(server).get("/policies");

      expect(policiesResponse.status).toBe(200);
      const { policyId }: PolicyLink =
        policiesResponse.body.items[policiesResponse.body.items.length - 1];

      const response: SupertestPolicyResponse = await request(server).get(
        `/policies/${encodeURIComponent(policyId)}`,
      );

      expect(response.body).toStrictEqual({
        policyId,
        policy: expect.any(String),
        hash: expect.any(String),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);
      const response = await request(server).get("/policies/unknown-policy");
      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy unknown-policy not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/policies/{policyId}/revisions", () => {
    it("should return a paginated list of revisions", async () => {
      expect.assertions(3);
      const policiesResponse: SupertestPoliciesResponse =
        await request(server).get("/policies");

      expect(policiesResponse.status).toBe(200);
      const { policyId }: PolicyLink =
        policiesResponse.body.items[policiesResponse.body.items.length - 1];

      const response: SupertestRevisionsResponse = await request(server).get(
        `/policies/${encodeURIComponent(policyId)}/revisions`,
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-apps-registry/v3/policies/${encodeURIComponent(
              policyId,
            )}/revisions?page[after]=1&page[size]=10`,
          ),
          items: expect.arrayContaining([
            expect.objectContaining({
              policyId: expect.any(String),
              policy: expect.any(String),
              hash: expect.any(String),
            }),
          ]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-apps-registry/v3/policies/${encodeURIComponent(
                policyId,
              )}/revisions?page[after]=1&page[size]=10`,
            ),
            prev: expect.stringContaining(
              `/trusted-apps-registry/v3/policies/${encodeURIComponent(
                policyId,
              )}/revisions?page[after]=1&page[size]=10`,
            ),
            next: expect.stringContaining(
              `/trusted-apps-registry/v3/policies/${encodeURIComponent(
                policyId,
              )}/revisions?page[after]=`,
            ),
            last: expect.stringContaining(
              `/trusted-apps-registry/v3/policies/${encodeURIComponent(
                policyId,
              )}/revisions?page[after]=`,
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/policies/unknown-policy/revisions",
      );

      expect(response.body).toStrictEqual({
        title: "Policy Not Found",
        status: 404,
        detail: "Policy unknown-policy not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describeWriteOps().each(["insertPolicy", "updatePolicy"])(
    "/jsonrpc - method: %s",
    (method: string) => {
      it(`should return a new unsigned transaction`, async () => {
        expect.assertions(2);

        const { policyId, policyData } = createPolicy(new Date().toISOString());

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUserAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [
              {
                from: adminTestWallet.address,
                policyId,
                policyData,
              },
            ],
            id: 231,
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          result: {
            chainId: expect.any(String),
            data: expect.any(String),
            from: adminTestWallet.address,
            gasLimit: expect.any(String),
            gasPrice: expect.any(String),
            nonce: expect.any(String),
            to: expect.any(String),
            value: expect.any(String),
          },
        });
        expect(responseBuild.status).toBe(200);
      });
    },
  );

  describeWriteOps().each(["insertPolicy", "updatePolicy"] as const)(
    "/jsonrpc - send transaction for %s",
    (method: "insertPolicy" | "updatePolicy") => {
      it("should insert a new policy", async () => {
        expect.assertions(5);

        const { policyId } = newPolicy;
        let policyData: string;

        switch (method) {
          case "insertPolicy": {
            policyData = newPolicy.policyData;
            break;
          }
          case "updatePolicy": {
            policyData = policy2;
            break;
          }
          default:
            throw new Error("Unsupported method");
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUserAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [
              {
                from: adminTestWallet.address,
                policyId,
                policyData,
              },
            ],
            id: 231,
          });

        const unsignedTransaction = responseBuild.body.result;
        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as unknown as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await adminTestWallet.signTransaction(
          uTx as TransactionRequest,
        );
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

        expect(responseSend.body).toStrictEqual({
          jsonrpc: "2.0",
          id: "45",
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          besuRpcNode,
          responseSend.body.result as string,
        );
        expect(receipt.status).toBe(1);

        // get policy
        const policyResponse = await request(server).get(
          `/policies/${policyId}`,
        );

        const bufferPolicyData = Buffer.from(policyData.slice(2), "hex");
        const expectedHash = generateMultihash(
          ethers.utils.sha256(bufferPolicyData),
        );

        expect(policyResponse.body).toStrictEqual({
          policyId,
          policy: bufferPolicyData.toString("base64"),
          hash: expectedHash,
        });
        expect(policyResponse.status).toBe(200);
      });
    },
  );
});
