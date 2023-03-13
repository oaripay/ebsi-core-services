import { randomUUID } from "node:crypto";
import { describe, beforeAll, it, expect } from "@jest/globals";
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
import { calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";
import type { JWK } from "jose";
import type { FastifyInstance } from "fastify";
import { useContainer } from "class-validator";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { JsonWebKey } from "did-resolver";
import { encode, prefixWith0x } from "@ebsiint-api/shared";
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
import { describeWriteOps } from "../utils/describeWriteOps";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import {
  getDidrInviteAccessToken,
  getDidrWriteAccessToken,
} from "../utils/getAccessToken";
import { createUser } from "../utils/data";

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

type TestUser = {
  info: EbsiIssuer;
  token: string;
  wallet: ethers.Wallet;
  thumbprint: string;
};

describe("DID Registry - JSON RPC - e2e", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerApi: string;
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
  });

  describeWriteOps()(
    'Tests with a new user ("didr_invite" access token)',
    () => {
      let newUser: TestUser;

      beforeAll(async () => {
        // Create new user
        const newUserDetails = await createUser();

        const authApiV3ES256PrivateKey = configService.get<string>(
          "testAuthApiV3ES256PrivateKey"
        );

        const newUserAccessToken = await getDidrInviteAccessToken(
          newUserDetails.did,
          authApiV3ES256PrivateKey
        );

        newUser = {
          info: {
            ...newUserDetails,
            alg: "ES256",
          },
          token: newUserAccessToken,
          wallet: newUserDetails.wallet,
          thumbprint: newUserDetails.thumbprint,
        };
      });

      describe("/jsonrpc - send transaction for insertDidDocument", () => {
        it("should work", async () => {
          expect.assertions(5);

          const params = {
            from: newUser.wallet.address,
            did: newUser.info.did,
            baseDocument: JSON.stringify({
              "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/jws-2020/v1", // Required
              ],
            }),
            vMethodId: newUser.thumbprint,
            publicKey: newUser.wallet.publicKey,
            isSecp256k1: true,
            notBefore: now,
            notAfter: in6months,
          } as InsertDidDocumentParam;

          const responseBuild: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(newUser.token, { type: "bearer" })
            .send({
              jsonrpc: "2.0",
              method: "insertDidDocument",
              params: [params],
              id: 1,
            });

          expect(responseBuild.body).toStrictEqual({
            jsonrpc: "2.0",
            id: 1,
            result: {
              chainId: expect.any(String),
              data: expect.any(String),
              from: newUser.wallet.address,
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
              JSON.stringify(unsignedTransaction)
            ) as UnsignedTransaction
          ) as TransactionRequest;
          uTx.chainId = Number(uTx.chainId);
          const sgnTx = await newUser.wallet.signTransaction(uTx);
          const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(newUser.token, { type: "bearer" })
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
            responseSend.body.result as string
          );
          expect(receipt.status).toBe(1);
        });
      });
    }
  );

  describeWriteOps()(
    'Tests with an existing user ("didr_write" access token)',
    () => {
      let existingUser: TestUser;
      let publicKeyJwk2: JWK;
      let thumbprint2: string;
      let publicKeyJwk3: JWK;
      let thumbprint3: string;
      let lastDid: string;

      beforeAll(async () => {
        // Import existing user
        const existingUserKid = configService.get<string>(
          "testExistingUserKid"
        );
        const existingUserDid = existingUserKid.split("#")[0];
        const existingUserPrivateKeyHex = configService.get<string>(
          "testExistingUserPrivateKey"
        );
        const existingUserWallet = new ethers.Wallet(
          prefixWith0x(existingUserPrivateKeyHex)
        );
        const existingUserPrivateKeyJwk = encode.privateKey.fromHexToJWK(
          existingUserPrivateKeyHex
        ) as unknown as JsonWebKey;
        const { d, ...existingUserPublicKeyJwk } = existingUserPrivateKeyJwk;
        const existingUserInfo: EbsiIssuer = {
          did: existingUserDid,
          kid: existingUserKid,
          privateKeyJwk: existingUserPrivateKeyJwk,
          publicKeyJwk: existingUserPublicKeyJwk,
          alg: "ES256K",
        };
        const existingUserThumbprint = await calculateJwkThumbprint(
          existingUserPublicKeyJwk
        );

        try {
          existingUser = {
            info: existingUserInfo,
            token: await getDidrWriteAccessToken(
              configService.get<string>("authorisationApiV3Url"),
              existingUserInfo
            ),
            wallet: existingUserWallet,
            thumbprint: existingUserThumbprint,
          };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          throw e;
        }

        publicKeyJwk2 = await exportJWK(
          (
            await generateKeyPair("EdDSA", { crv: "Ed25519" })
          ).publicKey
        );
        thumbprint2 = await calculateJwkThumbprint(publicKeyJwk2);

        publicKeyJwk3 = await exportJWK(
          (
            await generateKeyPair("ES256")
          ).publicKey
        );
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

      describe.each([
        "updateBaseDocument",
        "addController",
        "revokeController",
        "addVerificationMethod",
        "addVerificationRelationship",
        "expireVerificationMethod",
        "revokeVerificationMethod",
        "rollVerificationMethod",
      ] as const)("/jsonrpc - send transaction for %s", (method) => {
        it("should work", async () => {
          expect.assertions(5);

          let params: JsonRpcParams | null = null;

          switch (method) {
            case "updateBaseDocument": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                baseDocument: JSON.stringify({
                  "@context": [
                    "https://www.w3.org/ns/did/v1",
                    "https://w3id.org/security/suites/jws-2020/v1",
                  ],
                  testKey: randomUUID(),
                }),
              } as UpdateBaseDocumentParam;
              break;
            }
            case "addController": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                controller: lastDid,
              } as AddControllerParam;
              break;
            }
            case "revokeController": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                controller: lastDid,
              } as RevokeControllerParam;
              break;
            }
            case "addVerificationMethod": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                vMethodId: thumbprint2,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk2)
                ).toString("hex")}`,
                isSecp256k1: false,
              } as AddVerificationMethodParam;
              break;
            }
            case "addVerificationRelationship": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                name: "assertionMethod",
                vMethodId: thumbprint2,
                notBefore: now,
                notAfter: in6months,
              } as AddVerificationRelationshipParam;
              break;
            }
            case "expireVerificationMethod": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                vMethodId: thumbprint2,
                notAfter: now + 600,
              } as ExpireVerificationMethodParam;
              break;
            }
            case "revokeVerificationMethod": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                vMethodId: thumbprint2,
                notAfter: now - 60,
              } as RevokeVerificationMethodParam;
              break;
            }
            case "rollVerificationMethod": {
              params = {
                from: existingUser.wallet.address,
                did: existingUser.info.did,
                vMethodId: thumbprint3,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3)
                ).toString("hex")}`,
                isSecp256k1: false,
                notBefore: now,
                notAfter: in6months,
                oldVMethodId: thumbprint2,
                duration: 3600,
              } as RollVerificationMethodParam;
              break;
            }
            default: {
              throw new Error("Test Error: Invalid method");
            }
          }

          const responseBuild: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(existingUser.token, { type: "bearer" })
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
              from: existingUser.wallet.address,
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
              JSON.stringify(unsignedTransaction)
            ) as UnsignedTransaction
          ) as TransactionRequest;
          uTx.chainId = Number(uTx.chainId);
          const sgnTx = await existingUser.wallet.signTransaction(uTx);
          const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(existingUser.token, { type: "bearer" })
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
            responseSend.body.result as string
          );
          expect(receipt.status).toBe(1);
        });
      });
    }
  );
});
