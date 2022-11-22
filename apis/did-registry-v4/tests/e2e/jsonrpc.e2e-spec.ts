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
import { TransactionRequest } from "@ethersproject/abstract-provider";
import { ethers } from "ethers";
import { calculateJwkThumbprint, JWK } from "jose";
import type { FastifyInstance } from "fastify";
import { useContainer } from "class-validator";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { ApiConfig } from "../../src/config/configuration";
import { getServer } from "../utils/getServer";
import {
  UnsignedTransaction,
  InsertDidDocumentParam,
  UpdateBaseDocumentParam,
  AddControllerParam,
  RevokeControllerParam,
  AddVerificationMethodParam,
  AddVerificationRelationshipParam,
  RevokeVerificationMethodParam,
  ExpireVerificationMethodParam,
  RollVerificationMethodParam,
} from "../../src/modules/jsonrpc/dto";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { createUser, UserDetails } from "../utils/data";
import { requestNewUserSiopJwt } from "../utils/siopJwt";
import { describeWriteOps } from "../utils/describeWriteOps";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";

type JsonRpcParams =
  | InsertDidDocumentParam
  | UpdateBaseDocumentParam
  | AddControllerParam
  | RevokeControllerParam
  | AddVerificationMethodParam
  | AddVerificationRelationshipParam
  | RevokeVerificationMethodParam
  | ExpireVerificationMethodParam;

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

describe("DID Registry - JSON RPC - e2e", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerApi: string;
  let user1: {
    details: UserDetails;
    token: string;
  };
  let publicKeyJwk2: JWK;
  let thumbprint2: string;
  let publicKeyJwk3: JWK;
  let thumbprint3: string;
  let lastDid: string;
  const now = Math.floor(Date.now() / 1000);
  const in6months = now + 6 * 30 * 24 * 3600;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    user1 = {
      details: await createUser(),
      token: "",
    };

    user1.token = await requestNewUserSiopJwt({
      clientKid: user1.details.kid,
      clientPrivateKey: user1.details.wallet.privateKey,
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      authorisationCredentialSchema: configService.get<string>(
        "authorisationCredentialSchema"
      ),
      usersOnboardingApiPrivateKey: configService.get<string>(
        "usersOnboardingApiPrivateKey"
      ),
      usersOnboardingApiDid: configService.get<string>("usersOnboardingApiDid"),
      trustedAppsRegistryUrl: configService.get<string>(
        "trustedAppsRegistryApiUrl"
      ),
      ebsiAuthority: configService
        .get<string>("domain")
        .replace(/^https?:\/\//, ""),
    });

    publicKeyJwk2 = {
      kty: "OKP",
      crv: "Ed25519",
      x: "dEb1y-9idZ2zR3AUTIJ_z-no_dVMHRf9qiD5GQg1zbI",
    };
    thumbprint2 = await calculateJwkThumbprint(publicKeyJwk2);

    publicKeyJwk3 = {
      kty: "EC",
      crv: "P-256",
      x: "yj8gZinbHEvQduwJ-hSAVtA7o1KKCaR8sQ4ISXquPrk",
      y: "1ejY6g2ha6Kyo2ctAkMVXv5IwVOwYVafLMU8SkF2-vw",
    };
    thumbprint3 = await calculateJwkThumbprint(publicKeyJwk3);

    // Get last identifier
    const getAllIdentifiers = await request(server).get("/identifiers");
    const { total } = getAllIdentifiers.body as {
      total: number;
    };
    const getIdentifiersLastPage = await request(server).get(
      `/identifiers?page[after]=${Math.ceil(total / 10)}&page[size]=10`
    );
    const { items: identifiers } = getIdentifiersLastPage.body as {
      items: {
        did: string;
        href: string;
      }[];
    };
    lastDid = identifiers[identifiers.length - 1].did;
  });

  describeWriteOps().each([
    "insertDidDocument",
    "updateBaseDocument",
    "addController",
    "revokeController",
    "addVerificationMethod",
    "addVerificationRelationship",
    "expireVerificationMethod",
    "revokeVerificationMethod",
    "rollVerificationMethod",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let params: JsonRpcParams | null = null;

      switch (method) {
        case "insertDidDocument": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            baseDocument: `{"@context":["https://www.w3.org/ns/did/v1"]}`,
            vMethodId: user1.details.thumbprint,
            publicKey: user1.details.wallet.publicKey,
            isSecp256k1: true,
            notBefore: now,
            notAfter: in6months,
          } as InsertDidDocumentParam;
          break;
        }

        case "updateBaseDocument": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            baseDocument: `{"@context":${JSON.stringify(
              user1.details.didDocument["@context"]
            )}}`,
          } as UpdateBaseDocumentParam;
          break;
        }

        case "addController": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            controller: lastDid,
          } as AddControllerParam;
          break;
        }

        case "revokeController": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            controller: lastDid,
          } as RevokeControllerParam;
          break;
        }

        case "addVerificationMethod": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            vMethodId: thumbprint2,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk2)).toString(
              "hex"
            )}`,
            isSecp256k1: false,
          } as AddVerificationMethodParam;
          break;
        }

        case "addVerificationRelationship": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            name: "assertionMethod",
            vMethodId: user1.details.thumbprint,
            notBefore: now,
            notAfter: in6months,
          } as AddVerificationRelationshipParam;
          break;
        }

        case "expireVerificationMethod": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            vMethodId: thumbprint2,
            notAfter: now + 600,
          } as ExpireVerificationMethodParam;
          break;
        }

        case "revokeVerificationMethod": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            vMethodId: thumbprint2,
            notAfter: now - 60,
          } as RevokeVerificationMethodParam;
          break;
        }

        case "rollVerificationMethod": {
          params = {
            from: user1.details.wallet.address,
            did: user1.details.did,
            vMethodId: thumbprint3,
            publicKey: `0x${Buffer.from(JSON.stringify(publicKeyJwk3)).toString(
              "hex"
            )}`,
            isSecp256k1: false,
            notBefore: now,
            notAfter: in6months,
            oldVMethodId: thumbprint2,
            duration: 3600,
          } as RollVerificationMethodParam;
          break;
        }

        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(user1.token, { type: "bearer" })
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
          chainId: expect.any(String) as string,
          data: expect.any(String) as string,
          from: user1.details.wallet.address,
          gasLimit: expect.any(String) as string,
          gasPrice: expect.any(String) as string,
          nonce: expect.any(String) as string,
          to: expect.any(String) as string,
          value: expect.any(String) as string,
        },
      });
      expect(responseBuild.status).toBe(200);

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
      ) as TransactionRequest;
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await user1.details.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(user1.token, { type: "bearer" })
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
        ledgerApi,
        user1.token,
        responseSend.body.result as string
      );
      expect(receipt.status).toBe(1);
    });
  });
});
