import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
  EbsiVerifiableAttestation,
} from "@cef-ebsi/verifiable-credential";
import type {
  PaginatedList,
  StatusList2021Credential,
} from "@ebsiint-api/shared";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { RawServerDefault } from "fastify";

import { fromUrl } from "@cef-ebsi/ebsi-uri";
import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  getPublicKeyJwk,
  getSigner,
  prefixWith0x,
  remove0xPrefix,
  waitToBeMined,
} from "@ebsiint-api/shared";
import { ConfigService } from "@nestjs/config";
import { useContainer } from "class-validator";
import { hexToBytes } from "did-jwt";
import { ethers } from "ethers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.ts";
import type {
  DidLink,
  IdLink,
  IssuerProxyResponseObject,
} from "../../src/modules/issuers/issuers.interface.ts";
import type {
  AddIssuerProxyParam,
  InsertIssuerParam,
  SetAttributeDataParam,
  SetAttributeMetadataParam,
  UnsignedTransaction,
  UpdateIssuerParam,
  UpdateIssuerProxyParam,
} from "../../src/modules/jsonrpc/dto/index.ts";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.ts";
import type { IssuerObject } from "../utils/tir.ts";

import { AppModule } from "../../src/app.module.ts";
import {
  IssuerType,
  IssuerTypeNames,
} from "../../src/modules/issuers/issuers.constants.ts";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.ts";
import { getNestFastifyApplication } from "../utils/app.ts";
import { describeLocalTestEnvOnly } from "../utils/describeLocalTestEnvOnly.ts";
import { describeWriteOps } from "../utils/describeWriteOps.ts";
import {
  getDidrWriteAccessToken,
  getTirInviteAccessToken,
  getTirWriteAccessToken,
} from "../utils/getAccessToken.ts";
import { getServer } from "../utils/getServer.ts";
import { createIssuer } from "../utils/tir.ts";

interface SupertestAttributesResponse {
  body: {
    items: IdLink[];
  };
  status: number;
}

interface SupertestIssuersResponse {
  body: PaginatedList<DidLink>;
  status: number;
}

interface SupertestJsonRpcResponse {
  body: JsonRpcResponseObject;
  status: number;
}

interface TestIssuer {
  info: EbsiIssuer;
  token: string;
  wallet: ethers.BaseWallet;
}

async function getEbsiIssuer(privateKeyHex: string, did: string, kid?: string) {
  const privateKey = hexToBytes(privateKeyHex);
  const publicKeyJwk = await getPublicKeyJwk(privateKey, "ES256K");
  const issuer: EbsiIssuer = {
    alg: "ES256K",
    did,
    kid: kid ?? `${did}#${publicKeyJwk.kid}`,
    signer: getSigner(privateKey, "ES256K"),
  };
  return issuer;
}

describeWriteOps().each(["EBSI URI", "URL"] as const)(
  "TIR API v4 - JSON-RPC (e2e, using %s as resource locator)",
  (uriType) => {
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
      bearerToken: string | undefined;
      url: string | undefined;
    };
    let adminIssuer: TestIssuer;
    let testIssuerWithProxy: TestIssuer;
    let ebsiEnvConfig: EbsiEnvConfiguration;

    async function createStatusList2021CredentialJwt(
      issuer: EbsiIssuer,
      issuerProxy: IssuerProxyResponseObject,
      config: EbsiEnvConfiguration,
    ) {
      const verifiableAttestationSchemaUrl = `${trustedSchemasRegistryApiUrl}/schemas/${testVerifiableAttestationSchemaId}`;
      const statusListSchemaUrl = `${trustedSchemasRegistryApiUrl}/schemas/${testStatusListSchemaId}`;
      const newIssuer1StatusList2021Credential: StatusList2021Credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/vc/status-list/2021/v1",
        ],
        credentialSchema: [
          {
            id:
              uriType === "URL"
                ? verifiableAttestationSchemaUrl
                : fromUrl(verifiableAttestationSchemaUrl, ebsiEnvConfig),
            type: "FullJsonSchemaValidator2021",
          },
          {
            id:
              uriType === "URL"
                ? statusListSchemaUrl
                : fromUrl(statusListSchemaUrl, ebsiEnvConfig),
            type: "FullJsonSchemaValidator2021",
          },
        ],
        credentialSubject: {
          encodedList:
            "H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA",
          // Note: the VC lib requires that credentialSubject.id is a valid EBSI DID. We can't use a URL here!
          // id: `${issuer.proxy.rawProxyData.prefix}${issuer.proxy.rawProxyData.testSuffix}#list`,
          id: issuer.did,
          statusPurpose: "revocation",
          type: "StatusList2021",
        },
        id: `${issuerProxy.prefix}${issuerProxy.testSuffix}`,
        issuanceDate: "2021-04-05T14:27:40Z",
        issued: "2021-04-05T14:27:40Z",
        issuer: issuer.did,
        type: [
          "VerifiableCredential",
          "VerifiableAttestation",
          "StatusList2021Credential",
        ],
        validFrom: "2021-04-05T14:27:40Z",
      };
      const newIssuer1StatusList2021CredentialJwt =
        await createVerifiableCredentialJwt(
          newIssuer1StatusList2021Credential,
          issuer,
          config,
          {
            skipValidation: true,
          },
        );

      return newIssuer1StatusList2021CredentialJwt;
    }

    let newIssuer1: IssuerObject;
    let newIssuer2: IssuerObject;
    let newIssuer3: IssuerObject;
    let newIssuer4: IssuerObject;

    beforeAll(async () => {
      newIssuer1 = createIssuer(IssuerType.RootTAO);
      newIssuer2 = createIssuer(IssuerType.RootTAO);
      newIssuer3 = createIssuer(IssuerType.RootTAO);
      newIssuer4 = createIssuer(IssuerType.RootTAO);

      app = await getNestFastifyApplication({
        imports: [AppModule],
      });

      if (process.env.TEST_ENV !== "remote") {
        await app.init();
        const fastifyInstance = app.getHttpAdapter().getInstance();
        await fastifyInstance.ready();
        useContainer(app.select(AppModule), { fallbackOnErrors: true });
      }

      configService = app.get<ConfigService<ApiConfig, true>>(ConfigService);

      server = getServer(app, configService);

      blockscout = configService.get("blockscout", { infer: true });
      ledgerApi = `${configService.get("ledgerApiUrl", { infer: true })}/blockchains/besu`;
      ebsiEnvConfig = configService.get("ebsiEnvConfig", { infer: true });
      trustedSchemasRegistryApiUrl = configService.get(
        "trustedSchemasRegistryApiUrl",
        { infer: true },
      );
      authorisationApiUrl = configService.get("authorisationApiUrl", {
        infer: true,
      });
      testVerifiableAttestationSchemaId = configService.get(
        "testVerifiableAttestationSchemaId",
        { infer: true },
      );
      testStatusListSchemaId = configService.get("testStatusListSchemaId", {
        infer: true,
      });

      // Get last 2 issuers DID
      let issuersResponse: SupertestIssuersResponse =
        await request(server).get("/issuers");

      // Go to last page (where there is at least 2 admins)
      const { total } = issuersResponse.body;
      issuersResponse = await request(server).get(
        `/issuers?page[after]=${Math.floor(total / 2)}&page[size]=2`,
      );

      // Get testIssuerWithProxy's first proxyId
      const testIssuerWithProxyKid = configService.get(
        "testIssuerWithProxyKid",
        { infer: true },
      );
      const testIssuerWithProxyDid = testIssuerWithProxyKid.split("#")[0]!;

      const testIssuerWithProxyPrivateKey = configService.get(
        "testIssuerWithProxyPrivateKey",
        { infer: true },
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
            ebsiEnvConfig,
          ),
          wallet: testIssuerWithProxyWallet,
        };
      } catch (error) {
        console.error(error);
        throw error;
      }

      // Import "admin" issuer (TI with policies to call the SC methods)
      const adminKid = configService.get("testAdminKid", { infer: true });
      const adminDid = adminKid.split("#")[0]!;
      const adminPrivateKeyHex = configService.get("testAdminPrivateKey", {
        infer: true,
      });
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
            ebsiEnvConfig,
          ),
          wallet: adminWallet,
        };
      } catch (error) {
        console.error(error);
        throw error;
      }
    });

    afterAll(async () => {
      await app.close();
    });

    describe.each([
      { method: "insertIssuer" },
      { method: "updateIssuer" },
      { method: "updateIssuer", updateAttribute: true },
      { method: "setAttributeMetadata" },
      { method: "setAttributeData", useNewIssuer: true },
    ])(
      "/jsonrpc - %o",
      ({ method, updateAttribute = false, useNewIssuer = false }) => {
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
              ebsiEnvConfig,
            );

            const didRegistryApiUrl = configService.get("didRegistryApiUrl", {
              infer: true,
            });
            const now = Math.floor(Date.now() / 1000);
            const in6months = now + 6 * 30 * 24 * 3600;
            let responseBuild: SupertestJsonRpcResponse = await request(
              didRegistryApiUrl,
            )
              .post("/jsonrpc")
              .auth(didWriteAccessToken, { type: "bearer" })
              .send({
                id: 231,
                jsonrpc: "2.0",
                method: "insertDidDocument",
                params: [
                  {
                    baseDocument: JSON.stringify({
                      "@context": [
                        "https://www.w3.org/ns/did/v1",
                        "https://w3id.org/security/suites/jws-2020/v1", // Required
                      ],
                    }),
                    did: newIssuerInfo.did,
                    from: adminIssuer.wallet.address,
                    isSecp256k1: true,
                    notAfter: in6months,
                    notBefore: now,
                    publicKey: newIssuerWallet.signingKey.publicKey,
                    vMethodId: newIssuerInfo.kid.split("#")[1],
                  },
                ],
              });

            let unsignedTransaction = responseBuild.body.result;
            let uTx = formatEthersUnsignedTransaction(
              unsignedTransaction as UnsignedTransaction,
            );

            let sgnTx = await adminIssuer.wallet.signTransaction(uTx);
            let parsedTx = ethers.Transaction.from(sgnTx).signature;

            if (!parsedTx) {
              throw new Error("Signature not found");
            }

            let responseSend: SupertestJsonRpcResponse = await request(
              didRegistryApiUrl,
            )
              .post("/jsonrpc")
              .auth(didWriteAccessToken, { type: "bearer" })
              .send({
                id: "45",
                jsonrpc: "2.0",
                method: "sendSignedTransaction",
                params: [
                  {
                    protocol: "eth",
                    r: parsedTx.r,
                    s: parsedTx.s,
                    signedRawTransaction: sgnTx,
                    unsignedTransaction,
                    v: `0x${Number(parsedTx.v).toString(16)}`,
                  },
                ],
              });

            // Wait to be mined
            await waitToBeMined(ledgerApi, responseSend.body.result as string);

            // Admin issuer inserts the new TI
            responseBuild = await request(server)
              .post("/jsonrpc")
              .auth(adminIssuer.token, { type: "bearer" })
              .send({
                id: 231,
                jsonrpc: "2.0",
                method: "setAttributeMetadata",
                params: [
                  {
                    attributeId: `0x${randomBytes(32).toString("hex")}`,
                    did: newIssuerDid,
                    from: adminIssuer.wallet.address,
                    issuerType: IssuerType.RootTAO,
                    taoAttributeId: `0x${"0".repeat(64)}`,
                    taoDid: newIssuerDid,
                  } as SetAttributeMetadataParam,
                ],
              });

            unsignedTransaction = responseBuild.body.result;
            uTx = formatEthersUnsignedTransaction(
              unsignedTransaction as UnsignedTransaction,
            );

            sgnTx = await adminIssuer.wallet.signTransaction(uTx);
            parsedTx = ethers.Transaction.from(sgnTx).signature;

            if (!parsedTx) {
              throw new Error("Signature not found");
            }

            responseSend = await request(server)
              .post("/jsonrpc")
              .auth(adminIssuer.token, { type: "bearer" })
              .send({
                id: "45",
                jsonrpc: "2.0",
                method: "sendSignedTransaction",
                params: [
                  {
                    protocol: "eth",
                    r: parsedTx.r,
                    s: parsedTx.s,
                    signedRawTransaction: sgnTx,
                    unsignedTransaction,
                    v: `0x${Number(parsedTx.v).toString(16)}`,
                  },
                ],
              });

            // Wait to be mined
            await waitToBeMined(ledgerApi, responseSend.body.result as string);

            // Admin Issuer issues a "VerifiableAccreditationToAccredit" to the new issuer
            const issuanceDate = new Date(Date.now() - 5000); // issue 5 seconds ago
            const expirationDate = new Date(
              issuanceDate.getTime() + 2 * 60 * 60 * 1000,
            );
            const verifiableAttestationSchemaUrl = `${trustedSchemasRegistryApiUrl}/schemas/${testVerifiableAttestationSchemaId}`;
            const termsOfUseUrl = configService.get("testAdminAccreditation", {
              infer: true,
            });
            const vcPayload: EbsiVerifiableAttestation = {
              "@context": ["https://www.w3.org/2018/credentials/v1"],
              credentialSchema: {
                id:
                  uriType === "URL"
                    ? verifiableAttestationSchemaUrl
                    : fromUrl(verifiableAttestationSchemaUrl, ebsiEnvConfig),
                type: "FullJsonSchemaValidator2021",
              },
              credentialSubject: { id: newIssuerDid },
              expirationDate: `${expirationDate.toISOString().slice(0, -5)}Z`,
              id: `urn:uuid:${randomUUID()}`,
              issuanceDate: `${issuanceDate.toISOString().slice(0, -5)}Z`,
              issued: `${issuanceDate.toISOString().slice(0, -5)}Z`,
              issuer: adminIssuer.info.did,
              termsOfUse: {
                id:
                  uriType === "URL"
                    ? termsOfUseUrl
                    : fromUrl(termsOfUseUrl, ebsiEnvConfig),
                type: "IssuanceCertificate",
              },
              type: [
                "VerifiableCredential",
                "VerifiableAttestation",
                "VerifiableAccreditationToAccredit",
              ],
              validFrom: `${issuanceDate.toISOString().slice(0, -5)}Z`,
            };
            const vcJwt = await createVerifiableCredentialJwt(
              vcPayload,
              adminIssuer.info,
              ebsiEnvConfig,
              {
                skipValidation: true,
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
                  ebsiEnvConfig,
                ),
                wallet: newIssuerWallet,
              };
            } catch (error) {
              console.error(error);
              throw error;
            }
          }

          // Choose TX sender
          sender = useNewIssuer ? newIssuer : adminIssuer;

          if (
            method === "setAttributeMetadata" ||
            method === "setAttributeData"
          ) {
            // Get sender's first attribute ID
            const attributesResponse: SupertestAttributesResponse =
              await request(server).get(
                `/issuers/${sender.info.did}/attributes`,
              );
            senderFirstAttributeId = attributesResponse.body.items[0]!.id;
          }
        });

        it("should return a new unsigned transaction", async () => {
          expect.assertions(2);

          let params = {};

          switch (method) {
            case "insertIssuer":
            case "updateIssuer": {
              const { attribute, did, issuerType, tao, taoAttributeId } =
                createIssuer(IssuerType.RootTAO);
              let prevAttributeHash = "";

              if (updateAttribute) {
                prevAttributeHash =
                  "0x9045517cc555c75cd7085900a900e6693439086f9eddeee513271fba278964fe";
              }
              params = {
                attributeData: attribute.hex,
                did,
                from: sender.wallet.address,
                issuerType,
                taoAttributeId,
                taoDid: tao,
                ...(prevAttributeHash && { prevAttributeHash }),
              } as InsertIssuerParam;
              break;
            }
            case "setAttributeData": {
              const { attribute } = createIssuer(IssuerType.RootTAO);

              params = {
                attributeData: attribute.hex,
                attributeId: attribute.id,
                did: newIssuer.info.did,
                from: sender.wallet.address,
              } as SetAttributeDataParam;
              break;
            }
            case "setAttributeMetadata": {
              const { attribute, did, issuerType, tao, taoAttributeId } =
                createIssuer(IssuerType.RootTAO);

              params = {
                attributeId: attribute.id,
                did,
                from: sender.wallet.address,
                issuerType,
                taoAttributeId,
                taoDid: tao,
              } as SetAttributeMetadataParam;
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
              id: 231,
              jsonrpc: "2.0",
              method,
              params: [params],
            });

          expect(responseBuild.body).toStrictEqual({
            id: 231,
            jsonrpc: "2.0",
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

          const { did } = newIssuer1;
          let extraTestUrl = "";
          let extraTestExpectedResponse: unknown = {};
          let params = {};

          switch (method) {
            case "insertIssuer": {
              // create a new issuer and add newIssuer1.attribute
              params = {
                attributeData: newIssuer1.attribute.hex,
                did,
                from: sender.wallet.address,
                issuerType: newIssuer1.issuerType,
                taoAttributeId: newIssuer1.taoAttributeId,
                taoDid: newIssuer1.tao,
              } as InsertIssuerParam;

              extraTestUrl = `/issuers/${did}`;

              extraTestExpectedResponse = {
                attributes: [
                  {
                    body: newIssuer1.attribute.utf8,
                    hash: remove0xPrefix(newIssuer1.attribute.id),
                    issuerType: IssuerTypeNames[newIssuer1.issuerType],
                    rootTao: newIssuer1.rootTao,
                    tao: newIssuer1.tao,
                  },
                ],
                did,
              };

              break;
            }
            case "setAttributeData": {
              const newAttributeData = `test - ${new Date().toISOString()}`;
              const newAttributeDataBuffer = Buffer.from(newAttributeData);
              const newAttributeId = ethers.sha256(newAttributeDataBuffer);

              params = {
                attributeData: `0x${newAttributeDataBuffer.toString("hex")}`,
                attributeId: prefixWith0x(senderFirstAttributeId),
                did: sender.info.did,
                from: sender.wallet.address,
              } as SetAttributeDataParam;

              extraTestUrl = `/issuers/${sender.info.did}`;

              extraTestExpectedResponse = {
                attributes: expect.arrayContaining([
                  {
                    body: newAttributeData,
                    hash: remove0xPrefix(newAttributeId),
                    issuerType: "RootTAO",
                    rootTao: sender.info.did,
                    tao: sender.info.did,
                  },
                ]),
                did: sender.info.did,
              };

              break;
            }
            case "setAttributeMetadata": {
              params = {
                attributeId: prefixWith0x(senderFirstAttributeId),
                did: sender.info.did,
                from: sender.wallet.address,
                issuerType: 1, // RootTAO
                taoAttributeId: newIssuer1.taoAttributeId,
                taoDid: newIssuer1.tao,
              } as SetAttributeMetadataParam;

              extraTestUrl = `/issuers/${sender.info.did}`;

              extraTestExpectedResponse = {
                attributes: expect.arrayContaining([
                  {
                    body: expect.any(String),
                    hash: expect.any(String),
                    issuerType: "RootTAO",
                    rootTao: sender.info.did,
                    tao: sender.info.did,
                  },
                ]),
                did: sender.info.did,
              };

              break;
            }
            case "updateIssuer": {
              if (updateAttribute) {
                // update newIssuer1.attribute: change it to newIssuer3.attribute
                params = {
                  attributeData: newIssuer3.attribute.hex,
                  did,
                  from: sender.wallet.address,
                  issuerType: newIssuer3.issuerType,
                  prevAttributeHash: newIssuer1.attribute.id,
                  taoAttributeId: newIssuer3.taoAttributeId,
                  taoDid: newIssuer3.tao,
                } as UpdateIssuerParam;

                extraTestUrl = `/issuers/${did}`;

                extraTestExpectedResponse = {
                  attributes: [
                    {
                      body: newIssuer3.attribute.utf8,
                      hash: remove0xPrefix(newIssuer3.attribute.id),
                      issuerType: IssuerTypeNames[newIssuer3.issuerType],
                      rootTao: newIssuer1.rootTao,
                      tao: newIssuer1.tao,
                    },
                    {
                      body: newIssuer2.attribute.utf8,
                      hash: remove0xPrefix(newIssuer2.attribute.id),
                      issuerType: IssuerTypeNames[newIssuer2.issuerType],
                      rootTao: newIssuer1.rootTao,
                      tao: newIssuer1.tao,
                    },
                  ],
                  did,
                };
              } else {
                // updateIssuer: add newIssuer2.attribute
                params = {
                  attributeData: newIssuer2.attribute.hex,
                  did,
                  from: sender.wallet.address,
                  issuerType: newIssuer2.issuerType,
                  taoAttributeId: newIssuer2.taoAttributeId,
                  taoDid: newIssuer2.tao,
                } as UpdateIssuerParam;

                extraTestUrl = `/issuers/${did}`;

                extraTestExpectedResponse = {
                  attributes: [
                    {
                      body: newIssuer1.attribute.utf8,
                      hash: remove0xPrefix(newIssuer1.attribute.id),
                      issuerType: IssuerTypeNames[newIssuer1.issuerType],
                      rootTao: newIssuer1.rootTao,
                      tao: newIssuer1.tao,
                    },
                    {
                      body: newIssuer2.attribute.utf8,
                      hash: remove0xPrefix(newIssuer2.attribute.id),
                      issuerType: IssuerTypeNames[newIssuer2.issuerType],
                      rootTao: newIssuer1.rootTao,
                      tao: newIssuer1.tao,
                    },
                  ],
                  did,
                };
              }
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
              id: 231,
              jsonrpc: "2.0",
              method,
              params: [params],
            });

          expect(responseBuild.body).toStrictEqual({
            id: 231,
            jsonrpc: "2.0",
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
            unsignedTransaction as UnsignedTransaction,
          );

          const sgnTx = await sender.wallet.signTransaction(uTx);
          const signature = ethers.Transaction.from(sgnTx).signature;
          if (!signature) {
            throw new Error("Signature not found");
          }
          const { r, s, v } = signature;

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(sender.token, { type: "bearer" })
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
          expect(receipt.revertReason).toBeUndefined();
          expect(receipt.status).toBe("0x1");
          sampleTransaction = responseSend.body.result as string;

          // Extra test
          const extraTestResponse = await request(server).get(extraTestUrl);

          expect(extraTestResponse.body).toStrictEqual(
            extraTestExpectedResponse,
          );
          expect(extraTestResponse.status).toBe(200);
        });

        it("should send the transaction but the SC should reject no authorized users", async () => {
          expect.assertions(4);

          let params: unknown;
          sender = testIssuerWithProxy;

          switch (method) {
            case "insertIssuer": {
              // create a new issuer and add newIssuer1.attribute
              params = {
                attributeData: newIssuer4.attribute.hex,
                did: EbsiWallet.createDid(),
                from: sender.wallet.address,
                issuerType: newIssuer4.issuerType,
                taoAttributeId: newIssuer4.taoAttributeId,
                taoDid: newIssuer4.tao,
              } as InsertIssuerParam;
              break;
            }
            case "setAttributeData": {
              params = {
                attributeData: newIssuer4.attribute.hex,
                attributeId: prefixWith0x(senderFirstAttributeId),
                did: newIssuer.info.did,
                from: sender.wallet.address,
              } as SetAttributeDataParam;
              break;
            }
            case "setAttributeMetadata": {
              params = {
                attributeId: newIssuer4.attribute.id,
                did: EbsiWallet.createDid(),
                from: sender.wallet.address,
                issuerType: newIssuer4.issuerType,
                taoAttributeId: newIssuer4.taoAttributeId,
                taoDid: newIssuer4.tao,
              } as SetAttributeMetadataParam;
              break;
            }
            case "updateIssuer": {
              if (updateAttribute) {
                // update newIssuer1.attribute: change it to newIssuer3.attribute
                const prevAttributeHash = newIssuer1.attribute.id;
                params = {
                  attributeData: newIssuer4.attribute.hex,
                  did: newIssuer1.did,
                  from: sender.wallet.address,
                  ...(prevAttributeHash && { prevAttributeHash }),
                  issuerType: newIssuer1.issuerType,
                  taoAttributeId: newIssuer1.taoAttributeId,
                  taoDid: newIssuer1.tao,
                };
              } else {
                // updateIssuer: add newIssuer4.attribute
                params = {
                  attributeData: newIssuer4.attribute.hex,
                  did: adminIssuer.info.did,
                  from: sender.wallet.address,
                  issuerType: newIssuer4.issuerType,
                  taoAttributeId: newIssuer4.taoAttributeId,
                  taoDid: newIssuer4.tao,
                };
              }
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
              id: 231,
              jsonrpc: "2.0",
              method,
              params: [params],
            });

          expect(responseBuild.body).toStrictEqual({
            id: 231,
            jsonrpc: "2.0",
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
            unsignedTransaction as UnsignedTransaction,
          );

          const sgnTx = await sender.wallet.signTransaction(uTx);
          const signature = ethers.Transaction.from(sgnTx).signature;
          if (!signature) {
            throw new Error("Signature not found");
          }
          const { r, s, v } = signature;

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(sender.token, { type: "bearer" })
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
              revertReason: expect.stringContaining(expectedRevertReason),
              status: "0x0",
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
            .set({
              ...(blockscout.bearerToken && {
                Authorization: blockscout.bearerToken,
              }),
            });

          expect(blockscoutCheck.status).toBe(200);
        });
      },
    );

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

            testIssuerWithProxyWallet = new ethers.Wallet(
              prefixWith0x(
                configService.get("testIssuerWithProxyPrivateKey", {
                  infer: true,
                }),
              ),
            );

            // Mock Trusted Issuers' endpoint
            const statusList2021CredentialJwt =
              await createStatusList2021CredentialJwt(
                testIssuerWithProxy.info,
                newIssuer1.proxy.obj,
                ebsiEnvConfig,
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
                  did,
                  from: testIssuerWithProxyWallet.address,
                  proxyData: newIssuer1.proxy.utf8,
                } as AddIssuerProxyParam;

                extraTestUrl = `/issuers/${did}/proxies`;

                extraTestExpectedResponse = {
                  items: expect.arrayContaining([
                    {
                      href: expect.stringContaining(
                        `/proxies/${newIssuer1.proxy.id}`,
                      ),

                      proxyId: newIssuer1.proxy.id,
                    },
                  ]),

                  total: expect.any(Number),
                };

                break;
              }
              case "updateIssuerProxy": {
                params = {
                  did,
                  from: testIssuerWithProxyWallet.address,
                  proxyData: newIssuer2.proxy.utf8,
                  proxyId: newIssuer1.proxy.id,
                } as UpdateIssuerProxyParam;

                extraTestUrl = `/issuers/${did}/proxies/${newIssuer1.proxy.id}`;
                extraTestExpectedResponse = newIssuer2.proxy.obj;
                break;
              }
              default: {
                throw new Error("Invalid method");
              }
            }

            const responseBuild: SupertestJsonRpcResponse = await request(
              server,
            )
              .post("/jsonrpc")
              .auth(testIssuerWithProxy.token, { type: "bearer" })
              .send({
                id: 231,
                jsonrpc: "2.0",
                method,
                params: [params],
              });

            const unsignedTransaction = responseBuild.body.result;

            const uTx = formatEthersUnsignedTransaction(
              unsignedTransaction as UnsignedTransaction,
            );

            const sgnTx = await testIssuerWithProxyWallet.signTransaction(uTx);
            const signature = ethers.Transaction.from(sgnTx).signature;
            if (!signature) {
              throw new Error("Signature not found");
            }
            const { r, s, v } = signature;

            const responseSend: SupertestJsonRpcResponse = await request(server)
              .post("/jsonrpc")
              .auth(testIssuerWithProxy.token, { type: "bearer" })
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
  },
);
