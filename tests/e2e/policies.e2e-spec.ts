import crypto from "crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { ApiConfig } from "../../src/config/configuration";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import {
  PolicyLink,
  PolicyResponseObject,
} from "../../src/modules/policies/policies.interface";
import { PaginatedList } from "../../src/shared/interfaces";
import { generateMultihash, prefixWith0x } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import { requestSiopJwt } from "../utils/siopJwt";
import { ContractService } from "../../src/shared/services/contract.service";
import { UnsignedTransaction } from "../../src/modules/jsonrpc/dto";

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
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;
  let contractService: ContractService;

  const createPolicy = (
    n: string | number
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
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);

    contractService = moduleFixture.get<ContractService>(ContractService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    // Generate a valid Client JWT (SIOP) for the tests
    const didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    testUserAccessToken = await requestSiopJwt({
      didRegistry,
      clientDid: configService.get<string>("testAdminDid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
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
            "/trusted-schemas-registry/v1/policies?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-schemas-registry/v1/policies?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-schemas-registry/v1/policies?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-schemas-registry/v1/policies?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-schemas-registry/v1/policies?page[after]="
            ) as string,
          }) as PaginatedList<PolicyLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/policies/{policyId}", () => {
    it("should return a specific policy", async () => {
      expect.assertions(3);

      const policiesResponse: SupertestPoliciesResponse = await request(
        server
      ).get("/policies");

      expect(policiesResponse.status).toBe(200);
      const { policyId }: PolicyLink =
        policiesResponse.body.items[policiesResponse.body.items.length - 1];

      const response: SupertestPolicyResponse = await request(server).get(
        `/policies/${encodeURIComponent(policyId)}`
      );

      expect(response.body).toStrictEqual({
        policyId,
        policy: expect.any(String) as string,
        hash: expect.any(String) as string,
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
      const policiesResponse: SupertestPoliciesResponse = await request(
        server
      ).get("/policies");

      expect(policiesResponse.status).toBe(200);
      const { policyId }: PolicyLink =
        policiesResponse.body.items[policiesResponse.body.items.length - 1];

      const response: SupertestRevisionsResponse = await request(server).get(
        `/policies/${encodeURIComponent(policyId)}/revisions`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-schemas-registry/v1/policies/${encodeURIComponent(
              policyId
            )}/revisions?page[after]=1&page[size]=10`
          ) as string,
          items: expect.arrayContaining([
            expect.objectContaining({
              policyId: expect.any(String) as string,
              policy: expect.any(String) as string,
              hash: expect.any(String) as string,
            }),
          ]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-schemas-registry/v1/policies/${encodeURIComponent(
                policyId
              )}/revisions?page[after]=1&page[size]=10`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-schemas-registry/v1/policies/${encodeURIComponent(
                policyId
              )}/revisions?page[after]=1&page[size]=10`
            ) as string,
            next: expect.stringContaining(
              `/trusted-schemas-registry/v1/policies/${encodeURIComponent(
                policyId
              )}/revisions?page[after]=`
            ) as string,
            last: expect.stringContaining(
              `/trusted-schemas-registry/v1/policies/${encodeURIComponent(
                policyId
              )}/revisions?page[after]=`
            ) as string,
          }) as PaginatedList<PolicyLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });

    it("should throw an error if the policy is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/policies/unknown-policy/revisions"
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

  describe.each(["insertPolicy", "updatePolicy"])(
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
            chainId: expect.any(String) as string,
            data: expect.any(String) as string,
            from: adminTestWallet.address,
            gasLimit: expect.any(String) as string,
            gasPrice: expect.any(String) as string,
            nonce: expect.any(String) as string,
            to: expect.any(String) as string,
            value: expect.any(String) as string,
          },
        });
        expect(responseBuild.status).toBe(200);
      });
    }
  );

  describe.each(["insertPolicy", "updatePolicy"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
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
            break;
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
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await adminTestWallet.signTransaction(uTx);
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
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          contractService,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);

        // get policy
        const policyResponse = await request(server).get(
          `/policies/${policyId}`
        );

        const bufferPolicyData = Buffer.from(policyData.slice(2), "hex");
        const expectedHash = generateMultihash(
          ethers.utils.sha256(bufferPolicyData)
        );

        expect(policyResponse.body).toStrictEqual({
          policyId,
          policy: bufferPolicyData.toString("base64"),
          hash: expectedHash,
        });
        expect(policyResponse.status).toBe(200);
      });
    }
  );
});
