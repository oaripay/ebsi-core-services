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
import { ethers } from "ethers";
import type { RawServerDefault } from "fastify";
import { fastifyAccepts } from "@fastify/accepts";
import { fastifyHelmet } from "@fastify/helmet";
import axios from "axios";
import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  waitToBeMined,
  getSigner,
  generatePrivateKey,
  getPublicKeyJwk,
  methodNotAllowed,
} from "@ebsiint-api/shared";
import { hexToBytes } from "did-jwt";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { getServer } from "../utils/getServer.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import {
  getAccessToken,
  getDidrInviteAccessToken,
} from "../utils/getAccessToken.js";
import type {
  AuthoriseDidSchema,
  CreateDocumentSchema,
  RemoveDocumentSchema,
  GrantAccessSchema,
  RevokeAccessSchema,
  UnsignedTransaction,
  WriteEventSchema,
} from "../../src/modules/jsonrpc/validators/index.js";
import { didToHex } from "../../src/shared/utils.js";
import { AccountType, Permission } from "../../src/shared/constants.js";

type JsonRpcParams =
  | AuthoriseDidSchema
  | CreateDocumentSchema
  | RemoveDocumentSchema
  | GrantAccessSchema
  | RevokeAccessSchema
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
    didInvite?: string;
  };
  wallet: ethers.Wallet;
  vcOnboard: string;
}

describeWriteOps()("Track and Trace - JSON-RPC (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let ledgerApi: string;
  let ebsiEnvConfig: EbsiEnvConfiguration;
  let authoriser: TestUser;
  let creator: TestUser;
  const did1 = EbsiWallet.createDid();
  const documentHash1 = `0x${randomBytes(32).toString("hex")}`;
  const documentHash2 = `0x${randomBytes(32).toString("hex")}`;

  const now = Math.floor(Date.now() / 1000);
  const in6months = now + 6 * 30 * 24 * 3600;

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

    const ebsiAuthority = configService
      .get<string>("domain")
      .replace(/^https?:\/\//, "");
    const trustedHostnames = configService.get("trustedHostnames", {
      infer: true,
    });
    ebsiEnvConfig = {
      network: configService.get("network", { infer: true }),
      hosts: [ebsiAuthority, ...trustedHostnames],
      services: {
        "did-registry": "v6",
        "trusted-issuers-registry": "v6",
        "trusted-policies-registry": "v4",
        "trusted-schemas-registry": "v4",
      },
    } satisfies EbsiEnvConfiguration;

    const kid = configService.get<string>("testAuthorisedLegalEntityKid");
    const did = kid.split("#")[0] as string;
    const authoriserPrivateKeyHex = configService.get<string>(
      "testAuthorisedLegalEntityPrivateKey",
    );
    const authoriserPrivateKey = hexToBytes(authoriserPrivateKeyHex);

    authoriser = {
      info: {
        did,
        kid,
        signer: getSigner(authoriserPrivateKey, "ES256K"),
        alg: "ES256K",
      },
      wallet: new ethers.Wallet(authoriserPrivateKeyHex),
      accessToken: {
        tntAuthorise: "",
        tntCreate: "",
        tntWrite: "",
      },
      vcOnboard: configService.get<string>(
        "testAuthorisedLegalEntityVcToOnboard",
      ),
    };

    // register new DID in the DID Registry
    const creatorDid = EbsiWallet.createDid();
    const creatorPrivateKey = generatePrivateKey("ES256K");
    const creatorPublicKeyJwk = await getPublicKeyJwk(
      creatorPrivateKey,
      "ES256K",
    );
    const creatorThumbprint = creatorPublicKeyJwk.kid;
    creator = {
      info: {
        did: creatorDid,
        kid: `${creatorDid}#${creatorThumbprint}`,
        signer: getSigner(creatorPrivateKey, "ES256K"),
        alg: "ES256K",
      },
      wallet: new ethers.Wallet(creatorPrivateKey),
      accessToken: {
        tntAuthorise: "",
        tntCreate: "",
        tntWrite: "",
        didInvite: "",
      },
      vcOnboard: "",
    };
    creator.accessToken.didInvite = await getDidrInviteAccessToken(
      creatorDid,
      configService.get<string>("testAuthApiES256PrivateKey"),
    );

    const params = {
      from: creator.wallet.address,
      did: creator.info.did,
      baseDocument: JSON.stringify({
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/jws-2020/v1",
        ],
      }),
      vMethodId: creatorThumbprint,
      publicKey: creator.wallet.publicKey,
      isSecp256k1: true,
      notBefore: now,
      notAfter: in6months,
    };

    const domain = configService.get<string>("domain");
    const responseBuild = await axios.post<
      JsonRpcResponseObject<UnsignedTransaction>
    >(
      `${domain}/did-registry/v6/jsonrpc`,
      {
        jsonrpc: "2.0",
        method: "insertDidDocument",
        params: [params],
        id: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${creator.accessToken.didInvite}`,
        },
      },
    );

    const unsignedTransaction = responseBuild.data.result;
    const uTx = formatEthersUnsignedTransaction(unsignedTransaction);
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await creator.wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend = await axios.post<JsonRpcResponseObject<string>>(
      `${domain}/did-registry/v6/jsonrpc`,
      {
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
      },
      {
        headers: {
          Authorization: `Bearer ${creator.accessToken.didInvite}`,
        },
      },
    );

    // wait to be mined
    await waitToBeMined(ledgerApi, responseSend.data.result);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Track and Trace", () => {
    describe.each([
      "authoriseDid",
      "createDocument",
      "createDocument(external timestamp)",
      "writeEvent",
      "writeEvent(external timestamp)",
      "removeDocument",
      "grantAccess",
      "revokeAccess",
    ] as const)("/jsonrpc - send transaction for %s", (m) => {
      const method = m.replace("(external timestamp)", "");

      let user: TestUser;

      beforeAll(async () => {
        // Wait 3 seconds for the results to become available in The Graph
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 3000);
        });

        if (method === "authoriseDid") {
          authoriser.accessToken.tntAuthorise = await getAccessToken(
            configService.get<string>("authorisationApiUrl"),
            authoriser.info,
            "openid tnt_authorise",
            ebsiEnvConfig,
            authoriser.vcOnboard,
          );
        } else if (method === "createDocument") {
          // request the tnt_create access token after "authoriseDid"
          // is submitted
          creator.accessToken.tntCreate = await getAccessToken(
            configService.get<string>("authorisationApiUrl"),
            creator.info,
            "openid tnt_create",
            ebsiEnvConfig,
            [],
          );
        } else if (method === "writeEvent") {
          // request the tnt_write access token after "createDocument"
          // is submitted
          creator.accessToken.tntWrite = await getAccessToken(
            configService.get<string>("authorisationApiUrl"),
            creator.info,
            "openid tnt_write",
            ebsiEnvConfig,
            [],
          );
        }

        user = method === "authoriseDid" ? authoriser : creator;
      });

      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams | null = null;
        let accessToken: string;

        switch (m) {
          case "authoriseDid": {
            params = {
              from: authoriser.wallet.address,
              senderDid: authoriser.info.did,
              authorisedDid: creator.info.did,
              whiteList: true,
            } satisfies AuthoriseDidSchema;
            accessToken = authoriser.accessToken.tntAuthorise;
            break;
          }
          case "createDocument": {
            params = {
              from: creator.wallet.address,
              documentHash: documentHash1,
              documentMetadata: "test metadata",
              didEbsiCreator: creator.info.did,
            } satisfies CreateDocumentSchema;
            accessToken = creator.accessToken.tntCreate;
            break;
          }
          case "createDocument(external timestamp)": {
            params = {
              from: creator.wallet.address,
              documentHash: documentHash2,
              documentMetadata: "test metadata",
              didEbsiCreator: creator.info.did,
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies CreateDocumentSchema;
            accessToken = creator.accessToken.tntCreate;
            break;
          }
          case "writeEvent": {
            params = {
              from: creator.wallet.address,
              eventParams: {
                documentHash: documentHash1,
                externalHash: `0x${randomBytes(32).toString("hex")}`,
                sender: await didToHex(creator.info.did),
                origin: "",
                metadata: "test event metadata",
              },
            } satisfies WriteEventSchema;
            accessToken = creator.accessToken.tntWrite;
            break;
          }
          case "writeEvent(external timestamp)": {
            params = {
              from: creator.wallet.address,
              eventParams: {
                documentHash: documentHash1,
                externalHash: `0x${randomBytes(32).toString("hex")}`,
                sender: await didToHex(creator.info.did),
                origin: "",
                metadata: "test event metadata",
              },
              timestamp: Math.floor(Date.now() / 1000),
              timestampProof: `0x${randomBytes(32).toString("hex")}`,
            } satisfies WriteEventSchema;
            accessToken = creator.accessToken.tntWrite;
            break;
          }
          case "removeDocument": {
            params = {
              from: creator.wallet.address,
              documentHash: documentHash1,
            } satisfies RemoveDocumentSchema;
            accessToken = creator.accessToken.tntWrite;
            break;
          }
          case "grantAccess": {
            params = {
              from: creator.wallet.address,
              documentHash: documentHash2,
              grantedByAccount: await didToHex(creator.info.did),
              subjectAccount: await didToHex(did1),
              grantedByAccType: AccountType.DID_EBSI,
              subjectAccType: AccountType.DID_EBSI,
              permission: Permission.DELEGATE,
            } satisfies GrantAccessSchema;
            accessToken = creator.accessToken.tntWrite;
            break;
          }
          case "revokeAccess": {
            params = {
              from: creator.wallet.address,
              documentHash: documentHash2,
              revokedByAccount: await didToHex(creator.info.did),
              subjectAccount: await didToHex(did1),
              permission: 0,
            } satisfies RevokeAccessSchema;
            accessToken = creator.accessToken.tntWrite;
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

        const unsignedTransaction = responseBuild.body
          .result as UnsignedTransaction;
        const uTx = formatEthersUnsignedTransaction(unsignedTransaction);
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
