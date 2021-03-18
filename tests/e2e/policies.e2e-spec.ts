import crypto from "crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance } from "fastify";
import { AppModule } from "../../src/app.module";
import { ApiConfig } from "../../src/config/configuration";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { prefixWith0x } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import { generateMultihash } from "../../src/shared/utils/multihash.utils";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

describe("Policies (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;

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

    const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("adminTestPrivateKey"))
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each(["insertPolicy"])("/jsonrpc - method: %s", (method: string) => {
    it(`should return a new unsigned transaction`, async () => {
      expect.assertions(2);

      const { policyId, policyData } = createPolicy(new Date().toISOString());

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
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
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each(["insertPolicy"])(
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
          JSON.parse(JSON.stringify(unsignedTransaction))
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await adminTestWallet.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .send({
            jsonrpc: "2.0",
            method: "signedTransaction",
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
        const receipt = await waitToBeMined(responseSend.body.result as string);
        expect(receipt.status).toBe("0x1");

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
