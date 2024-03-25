import { randomBytes, randomUUID } from "node:crypto";
import { describe, beforeAll, afterAll, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { ethers } from "ethers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";
import { useContainer } from "class-validator";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import elliptic from "elliptic";
import { bytes } from "multiformats";
import { base64url } from "multiformats/bases/base64";
import { calculateJwkThumbprint } from "jose";
import {
  createVerifiableCredentialJwt,
  type EbsiIssuer,
  type EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import {
  prefixWith0x,
  remove0xPrefix,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type {
  StatusList2021Credential,
  PaginatedList,
} from "@ebsiint-api/shared";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type {
  IdLink,
  DidLink,
  IssuerProxyResponseObject,
} from "../../src/modules/issuers/issuers.interface.js";
import { IssuerType } from "../../src/modules/issuers/issuers.constants.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import { createIssuer } from "../utils/tir.js";
import type { IssuerObject } from "../utils/tir.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { getServer } from "../utils/getServer.js";
import { describeLocalTestEnvOnly } from "../utils/describeLocalTestEnvOnly.js";
import {
  getDidrWriteAccessToken,
  getTirInviteAccessToken,
  getTirWriteAccessToken,
} from "../utils/getAccessToken.js";
import type { SetAttributeMetadataSchema } from "../../src/modules/jsonrpc/validators/RequestSetAttributeMetadataSchema.js";
import type { SetAttributeDataSchema } from "../../src/modules/jsonrpc/validators/RequestSetAttributeDataSchema.js";
import type { AddIssuerProxySchema } from "../../src/modules/jsonrpc/validators/RequestAddIssuerProxySchema.js";
import type { UpdateIssuerProxySchema } from "../../src/modules/jsonrpc/validators/RequestUpdateIssuerProxySchema.js";
import type { UnsignedTransaction } from "../../src/modules/jsonrpc/validators/RequestSendSignedTransactionSchema.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface SupertestIssuersResponse {
  status: number;
  body: PaginatedList<DidLink>;
}

interface SupertestAttributesResponse {
  status: number;
  body: {
    items: IdLink[];
  };
}

interface TestIssuer {
  info: EbsiIssuer;
  token: string;
  wallet: ethers.Wallet;
}

async function getEbsiIssuer(privateKey: string, did: string, kid?: string) {
  const hexIssuerPrivateKey = privateKey.replace("0x", "");
  const EC = elliptic.ec;
  const ec = new EC("secp256k1");
  const pubPoint = ec.keyFromPrivate(hexIssuerPrivateKey, "hex").getPublic();
  const issuerPublicKeyJwk = {
    kty: "EC",
    crv: "secp256k1",
    x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
  };
  const issuerPrivateKeyJwk = {
    ...issuerPublicKeyJwk,
    d: base64url.baseEncode(bytes.fromHex(hexIssuerPrivateKey)),
  };

  const issuer: EbsiIssuer = {
    did,
    kid: kid || `${did}#${await calculateJwkThumbprint(issuerPublicKeyJwk)}`,
    alg: "ES256K",
    publicKeyJwk: issuerPublicKeyJwk,
    privateKeyJwk: issuerPrivateKeyJwk,
  };
  return issuer;
}

describeWriteOps()("TIR API v5 - JSON-RPC (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let testVerifiableAttestationSchemaId: string;
  let testStatusListSchemaId: string;
  let ledgerApi: string;
  let trustedSchemasRegistryApiUrl: string;
  let authorisationApiUrl: string;
  let sampleTransaction: string;
  let blockscout: {
    url: string;
    bearerToken: string;
  };
  let trustedHostnames: string[];
  let adminIssuer: TestIssuer;
  let testIssuerWithProxy: TestIssuer;

  async function createStatusList2021CredentialJwt(
    issuer: EbsiIssuer,
    issuerProxy: IssuerProxyResponseObject,
    ebsiAuthority: string,
  ) {
    const newIssuer1StatusList2021Credential: StatusList2021Credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/vc/status-list/2021/v1",
      ],
      id: `${issuerProxy.prefix}${issuerProxy.testSuffix}`,
      type: [
        "VerifiableCredential",
        "VerifiableAttestation",
        "StatusList2021Credential",
      ],
      issuer: issuer.did,
      issued: "2021-04-05T14:27:40Z",
      issuanceDate: "2021-04-05T14:27:40Z",
      validFrom: "2021-04-05T14:27:40Z",
      credentialSubject: {
        // Note: the VC lib requires that credentialSubject.id is a valid EBSI DID. We can't use a URL here!
        // id: `${issuer.proxy.rawProxyData.prefix}${issuer.proxy.rawProxyData.testSuffix}#list`,
        id: issuer.did,
        type: "StatusList2021",
        statusPurpose: "revocation",
        encodedList:
          "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
      },
      credentialSchema: [
        {
          id: `${trustedSchemasRegistryApiUrl}/schemas/${testVerifiableAttestationSchemaId}`,
          type: "FullJsonSchemaValidator2021",
        },
        {
          id: `${trustedSchemasRegistryApiUrl}/schemas/${testStatusListSchemaId}`,
          type: "FullJsonSchemaValidator2021",
        },
      ],
    };
    const newIssuer1StatusList2021CredentialJwt =
      await createVerifiableCredentialJwt(
        newIssuer1StatusList2021Credential,
        issuer,
        {
          ebsiAuthority,
          skipValidation: true,
          trustedHostnames,
        },
      );

    return newIssuer1StatusList2021CredentialJwt;
  }

  let newIssuer1: IssuerObject;
  let newIssuer2: IssuerObject;
  let newIssuer3: IssuerObject;

  beforeAll(async () => {
    newIssuer1 = createIssuer(IssuerType.RootTAO);
    newIssuer2 = createIssuer(IssuerType.RootTAO);
    newIssuer3 = createIssuer(IssuerType.RootTAO);

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
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);

    blockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");
    trustedHostnames = configService.get<string[]>("trustedHostnames");
    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
    trustedSchemasRegistryApiUrl = configService.get<string>(
      "trustedSchemasRegistryApiUrl",
    );
    authorisationApiUrl = configService.get<string>("authorisationApiUrl");
    testVerifiableAttestationSchemaId = configService.get<string>(
      "testVerifiableAttestationSchemaId",
    );
    testStatusListSchemaId = configService.get<string>(
      "testStatusListSchemaId",
    );

    // Get last 2 issuers DID
    let issuersResponse: SupertestIssuersResponse =
      await request(server).get("/issuers");

    // Go to last page (where there is at least 2 admins)
    const { total } = issuersResponse.body;
    issuersResponse = await request(server).get(
      `/issuers?page[after]=${Math.floor(total / 2)}&page[size]=2`,
    );

    // Get testIssuerWithProxy's first proxyId
    const testIssuerWithProxyKid = configService.get<string>(
      "testIssuerWithProxyKid",
    );
    const testIssuerWithProxyDid = testIssuerWithProxyKid.split("#")[0]!;

    const testIssuerWithProxyPrivateKey = configService.get<string>(
      "testIssuerWithProxyPrivateKey",
    );

    const testIssuerWithProxyWallet = new ethers.Wallet(
      prefixWith0x(testIssuerWithProxyPrivateKey),
    );

    const testIssuerWithProxyInfo = await getEbsiIssuer(
      testIssuerWithProxyPrivateKey,
      testIssuerWithProxyDid,
      testIssuerWithProxyKid,
    );

    try {
      testIssuerWithProxy = {
        info: testIssuerWithProxyInfo,
        token: await getTirWriteAccessToken(
          authorisationApiUrl,
          testIssuerWithProxyInfo,
          trustedHostnames,
        ),
        wallet: testIssuerWithProxyWallet,
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    // Import "admin" issuer (TI with policies to call the SC methods)
    const adminKid = configService.get<string>("testAdminKid");
    const adminDid = adminKid.split("#")[0]!;
    const adminPrivateKeyHex = configService.get<string>("testAdminPrivateKey");
    const adminWallet = new ethers.Wallet(prefixWith0x(adminPrivateKeyHex));
    const adminIssuerInfo = await getEbsiIssuer(
      adminPrivateKeyHex,
      adminDid,
      adminKid,
    );

    try {
      adminIssuer = {
        info: adminIssuerInfo,
        token: await getTirWriteAccessToken(
          authorisationApiUrl,
          adminIssuerInfo,
          trustedHostnames,
        ),
        wallet: adminWallet,
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe.each([
    { method: "setAttributeMetadata" },
    { method: "setAttributeData", useNewIssuer: true },
  ])("/jsonrpc - %o", ({ method, useNewIssuer = false }) => {
    let sender: TestIssuer;
    let senderFirstAttributeId: string;
    let newIssuer: TestIssuer;

    beforeEach(async () => {
      if (useNewIssuer) {
        // Dynamically create pristine issuer
        const newIssuerWallet = ethers.Wallet.createRandom();
        const newIssuerPrivateKey = newIssuerWallet.privateKey;
        const newIssuerDid = EbsiWallet.createDid();
        const newIssuerInfo = await getEbsiIssuer(
          newIssuerPrivateKey,
          newIssuerDid,
        );

        // Admin issuer inserts the new TI's DID document
        const didWriteAccessToken = await getDidrWriteAccessToken(
          authorisationApiUrl,
          adminIssuer.info,
          trustedHostnames,
        );
        const didRegistryApiUrl =
          configService.get<string>("didRegistryApiUrl");
        const now = Math.floor(Date.now() / 1000);
        const in6months = now + 6 * 30 * 24 * 3600;
        let responseBuild: SupertestJsonRpcResponse = await request(
          didRegistryApiUrl,
        )
          .post("/jsonrpc")
          .auth(didWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "insertDidDocument",
            params: [
              {
                from: adminIssuer.wallet.address,
                did: newIssuerInfo.did,
                baseDocument: JSON.stringify({
                  "@context": [
                    "https://www.w3.org/ns/did/v1",
                    "https://w3id.org/security/suites/jws-2020/v1", // Required
                  ],
                }),
                vMethodId: newIssuerInfo.kid.split("#")[1],
                publicKey: newIssuerWallet.publicKey,
                isSecp256k1: true,
                notBefore: now,
                notAfter: in6months,
              },
            ],
            id: 231,
          });

        let unsignedTransaction = responseBuild.body.result;
        let uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        let sgnTx = await adminIssuer.wallet.signTransaction(uTx);
        let parsedTx = ethers.utils.parseTransaction(sgnTx);
        let responseSend: SupertestJsonRpcResponse = await request(
          didRegistryApiUrl,
        )
          .post("/jsonrpc")
          .auth(didWriteAccessToken, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                unsignedTransaction,
                r: parsedTx.r,
                s: parsedTx.s,
                v: `0x${Number(parsedTx.v).toString(16)}`,
                signedRawTransaction: sgnTx,
              },
            ],
            id: "45",
          });

        // Wait to be mined
        await waitToBeMined(ledgerApi, responseSend.body.result as string);

        // Admin issuer inserts the new TI
        responseBuild = await request(server)
          .post("/jsonrpc")
          .auth(adminIssuer.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "setAttributeMetadata",
            params: [
              {
                from: adminIssuer.wallet.address,
                did: newIssuerDid,
                revisionId: `0x${randomBytes(32).toString("hex")}`,
                issuerType: IssuerType.RootTAO,
                taoDid: newIssuerDid,
                attributeIdTao: `0x${"0".repeat(64)}`,
              } satisfies SetAttributeMetadataSchema,
            ],
            id: 231,
          });

        unsignedTransaction = responseBuild.body.result;
        uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        sgnTx = await adminIssuer.wallet.signTransaction(uTx);
        parsedTx = ethers.utils.parseTransaction(sgnTx);
        responseSend = await request(server)
          .post("/jsonrpc")
          .auth(adminIssuer.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                unsignedTransaction,
                r: parsedTx.r,
                s: parsedTx.s,
                v: `0x${Number(parsedTx.v).toString(16)}`,
                signedRawTransaction: sgnTx,
              },
            ],
            id: "45",
          });

        // Wait to be mined
        await waitToBeMined(ledgerApi, responseSend.body.result as string);

        // Admin Issuer issues a "VerifiableAccreditationToAccredit" to the new issuer
        const issuanceDate = new Date();
        const expirationDate = new Date(
          issuanceDate.getTime() + 2 * 60 * 60 * 1000,
        );
        const vcPayload: EbsiVerifiableAttestation = {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          id: `urn:uuid:${randomUUID()}`,
          type: [
            "VerifiableCredential",
            "VerifiableAttestation",
            "VerifiableAccreditationToAccredit",
          ],
          issuer: adminIssuer.info.did,
          issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
          expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
          credentialSubject: { id: newIssuerDid },
          credentialSchema: {
            id: `${trustedSchemasRegistryApiUrl}/schemas/${testVerifiableAttestationSchemaId}`,
            type: "FullJsonSchemaValidator2021",
          },
          termsOfUse: {
            id: configService.get<string>("testAdminAccreditation"),
            type: "IssuanceCertificate",
          },
        };
        const vcJwt = await createVerifiableCredentialJwt(
          vcPayload,
          adminIssuer.info,
          {
            ebsiAuthority: configService
              .get<string>("domain")
              .replace(/^https?:\/\//, ""), // remove http protocol scheme
            skipValidation: true,
            trustedHostnames,
          },
        );

        // Get access token for new issuer
        try {
          newIssuer = {
            info: newIssuerInfo,
            token: await getTirInviteAccessToken(
              authorisationApiUrl,
              newIssuerInfo,
              vcJwt,
              trustedHostnames,
            ),
            wallet: newIssuerWallet,
          };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          throw e;
        }
      }

      // Choose TX sender
      sender = useNewIssuer ? newIssuer : adminIssuer;

      if (method === "setAttributeMetadata" || method === "setAttributeData") {
        // Get sender's first attribute ID
        const attributesResponse: SupertestAttributesResponse = await request(
          server,
        ).get(`/issuers/${sender.info.did}/attributes`);
        senderFirstAttributeId = attributesResponse.body.items[0]!.id;
      }
    });

    it("should return a new unsigned transaction", async () => {
      expect.assertions(2);

      let params = {};

      switch (method) {
        case "setAttributeMetadata": {
          const { did, attribute, tao, attributeIdTao, issuerType } =
            createIssuer(IssuerType.RootTAO);

          params = {
            from: sender.wallet.address,
            did,
            revisionId: attribute.id,
            taoDid: tao,
            attributeIdTao,
            issuerType,
          } satisfies SetAttributeMetadataSchema;
          break;
        }
        case "setAttributeData": {
          const { attribute } = createIssuer(IssuerType.RootTAO);

          params = {
            from: sender.wallet.address,
            did: newIssuer.info.did,
            attributeId: attribute.id,
            attributeData: attribute.hex,
          } satisfies SetAttributeDataSchema;
          break;
        }
        default: {
          throw new Error("Invalid method");
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(sender.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [params],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String),
          data: expect.any(String),
          from: sender.wallet.address,
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });
      expect(responseBuild.status).toBe(200);
    });

    it("should send a transaction", async () => {
      expect.assertions(7);

      let extraTestUrl = "";
      let extraTestExpectedResponse: unknown = {};
      let params = {};

      switch (method) {
        case "setAttributeMetadata": {
          params = {
            from: sender.wallet.address,
            did: sender.info.did,
            revisionId: prefixWith0x(senderFirstAttributeId),
            issuerType: 1, // RootTAO
            taoDid: newIssuer1.tao,
            attributeIdTao: newIssuer1.attributeIdTao,
          } satisfies SetAttributeMetadataSchema;

          extraTestUrl = `/issuers/${sender.info.did}`;

          extraTestExpectedResponse = {
            did: sender.info.did,
            attributes: expect.arrayContaining([
              {
                body: expect.any(String),
                hash: expect.any(String),
                issuerType: "RootTAO",
                tao: sender.info.did,
                rootTao: sender.info.did,
              },
            ]),
          };

          break;
        }
        case "setAttributeData": {
          const newAttributeData = `test - ${new Date().toISOString()}`;
          const newAttributeDataBuffer = Buffer.from(newAttributeData);
          const newAttributeId = ethers.utils.sha256(newAttributeDataBuffer);

          params = {
            from: sender.wallet.address,
            did: sender.info.did,
            attributeId: prefixWith0x(senderFirstAttributeId),
            attributeData: `0x${newAttributeDataBuffer.toString("hex")}`,
          } satisfies SetAttributeDataSchema;

          extraTestUrl = `/issuers/${sender.info.did}`;

          extraTestExpectedResponse = {
            did: sender.info.did,
            attributes: expect.arrayContaining([
              {
                body: newAttributeData,
                hash: remove0xPrefix(newAttributeId),
                issuerType: "RootTAO",
                tao: sender.info.did,
                rootTao: sender.info.did,
              },
            ]),
          };

          break;
        }
        default: {
          throw new Error("Invalid method");
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(sender.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [params],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String),
          data: expect.any(String),
          from: expect.any(String),
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await sender.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(sender.token, { type: "bearer" })
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
      expect(receipt.revertReason).toBeUndefined();
      expect(receipt.status).toBe(1);
      sampleTransaction = responseSend.body.result as string;

      // Extra test
      const extraTestResponse = await request(server).get(extraTestUrl);

      expect(extraTestResponse.body).toStrictEqual(extraTestExpectedResponse);
      expect(extraTestResponse.status).toBe(200);
    });

    it("should send the transaction but the SC should reject no authorized users", async () => {
      expect.assertions(4);

      let params: unknown;
      sender = testIssuerWithProxy;

      switch (method) {
        case "setAttributeMetadata": {
          params = {
            from: sender.wallet.address,
            did: EbsiWallet.createDid(),
            revisionId: newIssuer3.attribute.id,
            taoDid: newIssuer3.tao,
            issuerType: newIssuer3.issuerType,
            attributeIdTao: newIssuer3.attributeIdTao,
          } satisfies SetAttributeMetadataSchema;
          break;
        }
        case "setAttributeData": {
          params = {
            from: sender.wallet.address,
            did: newIssuer.info.did,
            attributeId: prefixWith0x(senderFirstAttributeId),
            attributeData: newIssuer3.attribute.hex,
          } satisfies SetAttributeDataSchema;
          break;
        }
        default: {
          throw new Error("Invalid method");
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(sender.token, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [params],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String),
          data: expect.any(String),
          from: expect.any(String),
          gasLimit: expect.any(String),
          gasPrice: expect.any(String),
          nonce: expect.any(String),
          to: expect.any(String),
          value: expect.any(String),
        },
      });

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction)) as UnsignedTransaction,
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await sender.wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(sender.token, { type: "bearer" })
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

      const expectedRevertReason =
        method === "setAttributeData"
          ? "Not the issuer itself"
          : `doesn't have the attribute TIR:${method}`;

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
        responseSend.body.result as string,
      );

      expect(receipt).toStrictEqual(
        expect.objectContaining({
          status: 0,
          revertReason: expect.stringContaining(expectedRevertReason),
        }),
      );
    });

    it("should return transaction data from blockscout", async () => {
      if (!blockscout.url || !sampleTransaction) return;

      expect.assertions(1);

      await new Promise((f) => {
        setTimeout(f, 5000);
      });

      // check if blockscout is working properly
      const blockscoutCheck = await request(blockscout.url)
        .get(`/tx/${sampleTransaction}`)
        .set({ Authorization: blockscout.bearerToken });

      expect(blockscoutCheck.status).toBe(200);
    });
  });

  describeLocalTestEnvOnly()("with mocked issuer's endpoint", () => {
    describe.each(["addIssuerProxy", "updateIssuerProxy"] as const)(
      "/jsonrpc - method: %s",
      (method) => {
        const mockServer = setupServer();
        let testIssuerWithProxyWallet: ethers.Wallet;

        beforeAll(async () => {
          // Intercept network requests
          mockServer.listen({
            onUnhandledRequest: "bypass",
          });

          const authority = configService
            .get<string>("domain")
            .replace(/^https?:\/\//, "");

          testIssuerWithProxyWallet = new ethers.Wallet(
            prefixWith0x(configService.get("testIssuerWithProxyPrivateKey")),
          );

          // Mock Trusted Issuers' endpoint
          const statusList2021CredentialJwt =
            await createStatusList2021CredentialJwt(
              testIssuerWithProxy.info,
              newIssuer1.proxy.obj,
              authority,
            );

          mockServer.use(
            http.get(
              `${newIssuer1.proxy.obj.prefix}${newIssuer1.proxy.obj.testSuffix}`,
              () => HttpResponse.json(statusList2021CredentialJwt),
            ),
          );
        });

        afterAll(() => {
          mockServer.close();
        });

        it("should add / update the proxy", async () => {
          expect.assertions(5);

          const { did } = testIssuerWithProxy.info;
          let extraTestUrl = "";
          let extraTestExpectedResponse: unknown = {};
          let params = {};

          switch (method) {
            case "addIssuerProxy": {
              params = {
                from: testIssuerWithProxyWallet.address,
                did,
                proxyData: newIssuer1.proxy.utf8,
              } satisfies AddIssuerProxySchema;

              extraTestUrl = `/issuers/${did}/proxies`;

              extraTestExpectedResponse = {
                items: expect.arrayContaining([
                  {
                    proxyId: newIssuer1.proxy.id,
                    href: expect.stringContaining(
                      `/proxies/${newIssuer1.proxy.id}`,
                    ),
                  },
                ]),
                total: expect.any(Number),
              };

              break;
            }
            case "updateIssuerProxy": {
              params = {
                from: testIssuerWithProxyWallet.address,
                did,
                proxyData: newIssuer2.proxy.utf8,
                proxyId: newIssuer1.proxy.id,
              } satisfies UpdateIssuerProxySchema;

              extraTestUrl = `/issuers/${did}/proxies/${newIssuer1.proxy.id}`;
              extraTestExpectedResponse = newIssuer2.proxy.obj;
              break;
            }
            default: {
              throw new Error("Invalid method");
            }
          }

          const responseBuild: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(testIssuerWithProxy.token, { type: "bearer" })
            .send({
              jsonrpc: "2.0",
              method,
              params: [params],
              id: 231,
            });

          const unsignedTransaction = responseBuild.body.result;
          const uTx = formatEthersUnsignedTransaction(
            JSON.parse(
              JSON.stringify(unsignedTransaction),
            ) as UnsignedTransaction,
          );
          uTx.chainId = Number(uTx.chainId);
          const sgnTx = await testIssuerWithProxyWallet.signTransaction(uTx);
          const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(testIssuerWithProxy.token, { type: "bearer" })
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
          sampleTransaction = responseSend.body.result as string;

          // Extra test
          const extraTestResponse = await request(server).get(extraTestUrl);

          expect(extraTestResponse.body).toStrictEqual(
            extraTestExpectedResponse,
          );
          expect(extraTestResponse.status).toBe(200);
        });
      },
    );
  });
});
