import { describe, beforeAll, it, expect, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { TransactionRequest } from "@ethersproject/abstract-provider";
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import { useContainer } from "class-validator";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { waitToBeMined, encode } from "@ebsiint-api/shared";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import { getAccessToken } from "../utils/getAccessToken.js";
import type {
  AuthoriseDidSchema,
  CreateDocumentSchema,
  RemoveDocumentSchema,
  UnsignedTransaction,
  WriteEventSchema,
} from "../../src/modules/jsonrpc/validators/index.js";
import { didToHex } from "../../src/shared/utils.js";

type JsonRpcParams =
  | AuthoriseDidSchema
  | CreateDocumentSchema
  | RemoveDocumentSchema
  | WriteEventSchema;

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface TestUser {
  info: EbsiIssuer;
  accessToken: {
    tntAuthorise: string;
    tntCreate: string;
    tntWrite: string;
  };
  wallet: ethers.Wallet;
  vcOnboard: string;
}

describeWriteOps()("Track and Trace - JSON-RPC (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerApi: string;
  let user: TestUser;
  const documentHash1 = `0x${randomBytes(32).toString("hex")}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    const kid = configService.get<string>("testUserKid");
    const did = kid.split("#")[0] as string;
    const privateKeyHex = configService.get<string>("testUserPrivateKey");
    const privateKeyJwk = encode.privateKey.fromHexToJWK(privateKeyHex);
    const { d, ...publicKeyJwk } = privateKeyJwk;
    user = {
      info: { did, kid, privateKeyJwk, publicKeyJwk, alg: "ES256K" },
      wallet: new ethers.Wallet(privateKeyHex),
      accessToken: {
        tntAuthorise: "",
        tntCreate: "",
        tntWrite: "",
      },
      vcOnboard: configService.get<string>("testUserVcOnboard"),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Track and Trace", () => {
    beforeAll(async () => {
      user.accessToken.tntAuthorise = await getAccessToken(
        configService.get<string>("authorisationApiUrl"),
        user.info,
        "openid tnt_authorise",
        undefined,
        user.vcOnboard,
      );

      user.accessToken.tntCreate = await getAccessToken(
        configService.get<string>("authorisationApiUrl"),
        user.info,
        "openid tnt_create",
        undefined,
        [],
      );

      user.accessToken.tntWrite = await getAccessToken(
        configService.get<string>("authorisationApiUrl"),
        user.info,
        "openid tnt_write",
        undefined,
        [],
      );
    });

    describe.each([
      "authoriseDid",
      "createDocument",
      "createDocument(external timestamp)",
      "writeEvent",
      "writeEvent(external timestamp)",
      "removeDocument",
    ] as const)("/jsonrpc - send transaction for %s", (m) => {
      const method = m.replace("(external timestamp)", "");

      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams | null = null;
        let accessToken: string;

        switch (m) {
          case "authoriseDid": {
            params = {
              from: user.wallet.address,
              didEbsi: user.info.did,
              whiteList: true,
            } satisfies AuthoriseDidSchema;
            accessToken = user.accessToken.tntAuthorise;
            break;
          }
          case "createDocument": {
            params = {
              from: user.wallet.address,
              documentHash: documentHash1,
              documentMetadata: "test metadata",
              didEbsiCreator: user.info.did,
            } satisfies CreateDocumentSchema;
            accessToken = user.accessToken.tntCreate;
            break;
          }
          case "createDocument(external timestamp)": {
            params = {
              from: user.wallet.address,
              documentHash: `0x${randomBytes(32).toString("hex")}`,
              documentMetadata: "test metadata",
              didEbsiCreator: user.info.did,
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies CreateDocumentSchema;
            accessToken = user.accessToken.tntCreate;
            break;
          }
          case "writeEvent": {
            params = {
              from: user.wallet.address,
              eventParams: {
                documentHash: documentHash1,
                externalHash: `0x${randomBytes(32).toString("hex")}`,
                sender: await didToHex(user.info.did),
                origin: "",
                metadata: "test event metadata",
              },
            } satisfies WriteEventSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          case "writeEvent(external timestamp)": {
            params = {
              from: user.wallet.address,
              eventParams: {
                documentHash: documentHash1,
                externalHash: `0x${randomBytes(32).toString("hex")}`,
                sender: await didToHex(user.info.did),
                origin: "",
                metadata: "test event metadata",
              },
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies WriteEventSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          case "removeDocument": {
            params = {
              from: user.wallet.address,
              documentHash: documentHash1,
            } satisfies RemoveDocumentSchema;
            accessToken = user.accessToken.tntWrite;
            break;
          }
          default: {
            // TS will return an error if we forget to cover a case
            const exhaustiveCheck: never = m;
            throw new Error(
              `Test Error: Invalid method ${exhaustiveCheck as string}`,
            );
          }
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(accessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [params],
            id: 1,
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 1,
          result: {
            chainId: expect.any(String),
            data: expect.any(String),
            from: user.wallet.address,
            gasLimit: expect.any(String),
            gasPrice: expect.any(String),
            nonce: expect.any(String),
            to: expect.any(String),
            value: expect.any(String),
          },
        });
        expect(responseBuild.status).toBe(200);

        const unsignedTransaction = responseBuild.body.result;
        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
        ) as TransactionRequest;
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await user.wallet.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(accessToken, { type: "bearer" })
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
          ledgerApi,
          responseSend.body.result as string,
        );
        expect(receipt.status).toBe(1);
      });
    });
  });
});
