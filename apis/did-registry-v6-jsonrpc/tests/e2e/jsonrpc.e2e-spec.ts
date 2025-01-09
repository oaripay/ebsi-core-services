import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type { RawServerDefault } from "fastify";
import type { JWK } from "jose";

import { methodNotAllowed, waitToBeMined } from "@ebsiint-api/shared";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { useContainer } from "class-validator";
import { ethers } from "ethers";
import { calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import type { AddControllerSchema } from "../../src/modules/jsonrpc/validators/RequestAddControllerSchema.js";
import type { AddServiceSchema } from "../../src/modules/jsonrpc/validators/RequestAddServiceSchema.js";
import type { AddVerificationMethodSchema } from "../../src/modules/jsonrpc/validators/RequestAddVerificationMethodSchema.js";
import type { AddVerificationRelationshipSchema } from "../../src/modules/jsonrpc/validators/RequestAddVerificationRelationshipSchema.js";
import type { ExpireVerificationMethodSchema } from "../../src/modules/jsonrpc/validators/RequestExpireVerificationMethodSchema.js";
import type { InsertDidDocumentSchema } from "../../src/modules/jsonrpc/validators/RequestInsertDidDocumentSchema.js";
import type { RevokeControllerSchema } from "../../src/modules/jsonrpc/validators/RequestRevokeControllerSchema.js";
import type { RevokeServiceSchema } from "../../src/modules/jsonrpc/validators/RequestRevokeServiceSchema.js";
import type { RevokeVerificationMethodSchema } from "../../src/modules/jsonrpc/validators/RequestRevokeVerificationMethodSchema.js";
import type { RollVerificationMethodSchema } from "../../src/modules/jsonrpc/validators/RequestRollVerificationMethodSchema.js";
import type { UnsignedTransaction } from "../../src/modules/jsonrpc/validators/RequestSendSignedTransactionSchema.js";
import type { UpdateBaseDocumentSchema } from "../../src/modules/jsonrpc/validators/RequestUpdateBaseDocumentSchema.js";

import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import { createUser } from "../utils/data.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import {
  getDidrInviteAccessToken,
  getDidrWriteAccessToken,
} from "../utils/getAccessToken.js";
import { getServer } from "../utils/getServer.js";

type JsonRpcParams =
  | AddControllerSchema
  | AddServiceSchema
  | AddVerificationMethodSchema
  | AddVerificationRelationshipSchema
  | ExpireVerificationMethodSchema
  | InsertDidDocumentSchema
  | RevokeControllerSchema
  | RevokeServiceSchema
  | RevokeVerificationMethodSchema
  | RollVerificationMethodSchema
  | UpdateBaseDocumentSchema;

interface SupertestJsonRpcResponse {
  body: JsonRpcResponseObject;
  status: number;
}

interface TestUser {
  info: EbsiIssuer;
  thumbprint: string;
  token: string;
  wallet: ethers.BaseWallet;
}

describeWriteOps()("DID Registry API v6 - JSON-RPC (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerApi: string;
  const now = Math.floor(Date.now() / 1000);
  const in6months = now + 6 * 30 * 24 * 3600;
  let user: TestUser;
  let testUserDid: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    // https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#security-headers
    await app.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          "frame-ancestors": ["'none'"],
        },
      },
      xFrameOptions: {
        action: "deny",
      },
    });

    // Parse "Accept" request header
    await app.register(fastifyAccepts);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = getServer(app, configService);

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    testUserDid = configService.get("testUserDid");
    if (!testUserDid) throw new Error("TEST_USER_DID is not defined");
  });

  afterAll(async () => {
    await app.close();
  });

  describe("registering a new DID document", () => {
    beforeAll(async () => {
      // Create new user
      const userDetails = await createUser();

      const authApiV5ES256PrivateKey = configService.get<string>(
        "testAuthApiV5ES256PrivateKey",
      );

      const userAccessToken = await getDidrInviteAccessToken(
        userDetails.did,
        authApiV5ES256PrivateKey,
      );

      user = {
        info: userDetails,
        thumbprint: userDetails.thumbprint,
        token: userAccessToken,
        wallet: userDetails.wallet,
      };
    });

    describe("/ - send transaction for insertDidDocument", () => {
      it("should work", async () => {
        expect.assertions(5);

        const params = {
          baseDocument: JSON.stringify({
            "@context": [
              "https://www.w3.org/ns/did/v1",
              "https://w3id.org/security/suites/jws-2020/v1", // Required
            ],
          }),
          did: user.info.did,
          from: user.wallet.address,
          isSecp256k1: true,
          notAfter: in6months,
          notBefore: now,
          publicKey: user.wallet.signingKey.publicKey,
          vMethodId: user.thumbprint,
        } satisfies InsertDidDocumentSchema;

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("")
          .auth(user.token, { type: "bearer" })
          .send({
            id: 1,
            jsonrpc: "2.0",
            method: "insertDidDocument",
            params: [params],
          });

        expect(responseBuild.body).toStrictEqual({
          id: 1,
          jsonrpc: "2.0",
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
          // eslint-disable-next-line unicorn/prefer-structured-clone
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
        );

        const sgnTx = await user.wallet.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("")
          .auth(user.token, { type: "bearer" })
          .send({
            id: "45",
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                r,
                s,
                signedRawTransaction: sgnTx,
                unsignedTransaction,
                v: `0x${v.toString(16)}`,
              },
            ],
          });

        expect(responseSend.body).toStrictEqual({
          id: "45",
          jsonrpc: "2.0",
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          responseSend.body.result as string,
        );
        expect(receipt.status).toBe("0x1");

        // some seconds to update the subgraph
        await new Promise((resolve) => {
          setTimeout(resolve, 6000);
        });
      });
    });
  });

  describe("updating the new DID document", () => {
    let publicKeyJwk2: JWK;
    let thumbprint2: string;
    let publicKeyJwk3: JWK;
    let thumbprint3: string;

    beforeAll(async () => {
      try {
        const domain = configService.get("domain", { infer: true });
        const ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
        const trustedHostnames = configService.get("trustedHostnames", {
          infer: true,
        });
        const didrWriteToken = await getDidrWriteAccessToken(
          configService.get<string>("authorisationApiUrl"),
          user.info,
          {
            hosts: [ebsiAuthority, ...trustedHostnames],
            network: configService.get("network", { infer: true }),
            services: {
              "did-registry": "v6",
              "trusted-issuers-registry": "v5",
              "trusted-policies-registry": "v3",
              "trusted-schemas-registry": "v3",
            },
          },
        );
        user.token = didrWriteToken;
      } catch (error) {
        console.error(error);
        throw error;
      }

      const keyPair2 = await generateKeyPair("EdDSA", { crv: "Ed25519" });
      publicKeyJwk2 = await exportJWK(keyPair2.publicKey);
      thumbprint2 = await calculateJwkThumbprint(publicKeyJwk2);

      const keyPair3 = await generateKeyPair("ES256");
      publicKeyJwk3 = await exportJWK(keyPair3.publicKey);
      thumbprint3 = await calculateJwkThumbprint(publicKeyJwk3);
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
      "addService",
      "revokeService",
    ] as const)("/ - send transaction for %s", (method) => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams;

        switch (method) {
          case "addController": {
            // it is already a controller
            params = {
              controller: testUserDid,
              did: user.info.did,
              from: user.wallet.address,
            } satisfies AddControllerSchema;
            break;
          }
          case "addService": {
            params = {
              did: user.info.did,
              from: user.wallet.address,
              service: JSON.stringify({
                id: "1",
                serviceEndpoint: {
                  byId: "/vc/{id}",
                  byType: "/type/{type}",
                  registries: [
                    "https://registry.example.com/{credentialSubject.id}",
                    "https://identity.foundation/vcs/{credentialSubject.id}",
                  ],
                },
                type: "CredentialRegistry",
              }),
            } satisfies AddServiceSchema;
            break;
          }
          case "addVerificationMethod": {
            params = {
              did: user.info.did,
              from: user.wallet.address,
              isSecp256k1: false,
              publicKey: `0x${Buffer.from(
                JSON.stringify(publicKeyJwk2),
              ).toString("hex")}`,
              vMethodId: thumbprint2,
            } satisfies AddVerificationMethodSchema;
            break;
          }
          case "addVerificationRelationship": {
            params = {
              did: user.info.did,
              from: user.wallet.address,
              name: "assertionMethod",
              notAfter: in6months,
              notBefore: now,
              vMethodId: thumbprint2,
            } satisfies AddVerificationRelationshipSchema;
            break;
          }
          case "expireVerificationMethod": {
            params = {
              did: user.info.did,
              from: user.wallet.address,
              notAfter: now + 600,
              vMethodId: thumbprint2,
            } satisfies ExpireVerificationMethodSchema;
            break;
          }
          case "revokeController": {
            params = {
              controller: testUserDid,
              did: user.info.did,
              from: user.wallet.address,
            } satisfies RevokeControllerSchema;
            break;
          }
          case "revokeService": {
            params = {
              did: user.info.did,
              from: user.wallet.address,
              serviceId: "1",
            } satisfies RevokeServiceSchema;
            break;
          }
          case "revokeVerificationMethod": {
            params = {
              did: user.info.did,
              from: user.wallet.address,
              notAfter: now - 60,
              vMethodId: thumbprint2,
            } satisfies RevokeVerificationMethodSchema;
            break;
          }
          case "rollVerificationMethod": {
            params = {
              args: {
                did: user.info.did,
                duration: 3600,
                isSecp256k1: false,
                notAfter: in6months,
                notBefore: now,
                oldVMethodId: thumbprint2,
                publicKey: `0x${Buffer.from(
                  JSON.stringify(publicKeyJwk3),
                ).toString("hex")}`,
                vMethodId: thumbprint3,
              },
              from: user.wallet.address,
            } satisfies RollVerificationMethodSchema;
            break;
          }
          case "updateBaseDocument": {
            params = {
              baseDocument: JSON.stringify({
                "@context": [
                  "https://www.w3.org/ns/did/v1",
                  "https://w3id.org/security/suites/jws-2020/v1",
                ],
                testKey: randomUUID(),
              }),
              did: user.info.did,
              from: user.wallet.address,
            } satisfies UpdateBaseDocumentSchema;
            break;
          }
          default: {
            throw new Error("Test Error: Invalid method");
          }
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("")
          .auth(user.token, { type: "bearer" })
          .send({
            id: 1,
            jsonrpc: "2.0",
            method,
            params: [params],
          });

        expect(responseBuild.body).toStrictEqual({
          id: 1,
          jsonrpc: "2.0",
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
          // eslint-disable-next-line unicorn/prefer-structured-clone
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
        );

        const sgnTx = await user.wallet.signTransaction(uTx);
        const signature = ethers.Transaction.from(sgnTx).signature;
        if (!signature) {
          throw new Error("Signature not found");
        }
        const { r, s, v } = signature;

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("")
          .auth(user.token, { type: "bearer" })
          .send({
            id: "45",
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                r,
                s,
                signedRawTransaction: sgnTx,
                unsignedTransaction,
                v: `0x${v.toString(16)}`,
              },
            ],
          });

        expect(responseSend.body).toStrictEqual({
          id: "45",
          jsonrpc: "2.0",
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          responseSend.body.result as string,
        );
        expect(receipt.status).toBe("0x1");
      });
    });
  });
});
