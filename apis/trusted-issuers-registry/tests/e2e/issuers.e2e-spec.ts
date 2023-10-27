import { describe, beforeAll, afterEach, afterAll, it, expect } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
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
import { exportJWK, generateKeyPair } from "jose";
import elliptic from "elliptic";
import { bytes } from "multiformats";
import { base64url } from "multiformats/bases/base64";
import {
  createVerifiableCredentialJwt,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import {
  prefixWith0x,
  StatusList2021Credential,
  PaginatedList,
  waitToBeMined,
} from "@ebsiint-api/shared";
import type { ApiConfig } from "../../src/config/configuration.js";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import {
  AttributeObject,
  IdLink,
  DidLink,
  IssuerResponseObject,
  ProxyLink,
  IssuerProxyResponseObject,
} from "../../src/modules/issuers/issuers.interface.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import { requestSiopJwt } from "../utils/siopJwt.js";
import {
  AddIssuerProxyParam,
  UnsignedTransaction,
  UpdateIssuerProxyParam,
} from "../../src/modules/jsonrpc/dto/index.js";
import { describeWriteOps } from "../utils/describeWriteOps.js";
import { getServer } from "../utils/getServer.js";
import { describeLocalTestEnvOnly } from "../utils/describeLocalTestEnvOnly.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface SupertestIssuersResponse {
  status: number;
  body: PaginatedList<DidLink>;
}

interface SupertestIssuerProxiesResponse {
  status: number;
  body: PaginatedList<ProxyLink>;
}

interface SupertestIssuerResponse {
  status: number;
  body: IssuerResponseObject;
}

interface SupertestAttributesResponse {
  status: number;
  body: {
    items: IdLink[];
  };
}

interface SupertestAttributeResponse {
  status: number;
  body: AttributeObject;
}

interface SupertestIssuerProxyResponse {
  status: number;
  body: IssuerProxyResponseObject;
}

interface SupertestStringResponse {
  status: number;
  text: string;
}

interface AttributeObjectWithData extends AttributeObject {
  data: string;
}

async function createIssuerData(
  did: string,
  alg: "ES256" | "ES256K" | "EdDSA" = "ES256K",
) {
  const keyPair = await generateKeyPair(alg);
  const privateKeyJwk = await exportJWK(keyPair.privateKey);
  const publicKeyJwk = await exportJWK(keyPair.publicKey);

  const issuer: EbsiIssuer = {
    did,
    kid: `${did}#keys-1`,
    publicKeyJwk,
    privateKeyJwk,
    alg,
  };

  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: issuer.did,
    verificationMethod: [
      {
        id: issuer.kid,
        type: "JsonWebKey2020",
        controller: issuer.did,
        publicKeyJwk,
      },
    ],
    authentication: [issuer.kid],
    assertionMethod: [issuer.kid],
    keyAgreement: [issuer.kid],
    capabilityInvocation: [issuer.kid],
    capabilityDelegation: [`${issuer.did}#some-key-that-does-not-exist`],
  };

  return {
    issuer,
    didDocument,
    publicKeyJwk,
    keyPair,
  };
}

function getEbsiIssuer(privateKey: string, did: string, kid: string) {
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
    kid,
    alg: "ES256K",
    publicKeyJwk: issuerPublicKeyJwk,
    privateKeyJwk: issuerPrivateKeyJwk,
  };
  return issuer;
}

describe("Issuers (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let testIssuerWithProxyKid: string;
  let testIssuerWithProxyDid: string;
  let testIssuerWithProxyPrivateKey: string;
  let testUserWithProxyFirstProxyId: string;
  let testStatusListSchemaId: string;
  let ledgerApi: string;
  let trustedSchemasRegistryApiUrl: string;
  let sampleTransaction: string;
  let trustedHostnames: string[];

  let blockscout: {
    url: string;
    bearerToken: string;
  };
  const randomDid = EbsiWallet.createDid();

  async function createIssuer() {
    const did = EbsiWallet.createDid("LEGAL_ENTITY");
    const issuerData = await createIssuerData(did);

    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.sha256(data).slice(2);
    const attribute: AttributeObjectWithData = {
      body: dataBase64,
      hash: dataHash,
      data: `0x${data.toString("hex")}`,
    };

    const rawProxyData = {
      prefix: "https://example.net",
      headers: {
        Authorization: `Bearer ${crypto.randomBytes(16).toString("hex")}`,
      },
      testSuffix: `/${did}/cred/1`,
    };

    const proxyData = JSON.stringify(rawProxyData);
    const proxyId = ethers.utils.sha256(Buffer.from(proxyData));
    const proxy = {
      rawProxyData,
      proxyData,
      proxyId,
    };

    return { did, attribute, proxy, issuerData };
  }

  async function createStatusList2021CredentialJwt(
    issuer: EbsiIssuer,
    issuerProxy: IssuerProxyResponseObject,
    domain: string,
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
      credentialSchema: {
        id: `${trustedSchemasRegistryApiUrl}/schemas/${testStatusListSchemaId}`,
        type: "FullJsonSchemaValidator2021",
      },
    };

    const ebsiAuthority = domain.replace(/^https?:\/\//, "");
    const ebsiEnvConfig = {
      didRegistry: `${configService.get<string>(
        "didRegistryApiUrl",
      )}/identifiers`,
      trustedIssuersRegistry: `${configService.get<string>(
        "domain",
      )}${configService.get<string>("apiUrlPrefix")}/issuers`,
      trustedPoliciesRegistry: `${configService.get<string>(
        "trustedPoliciesRegistryApiUrl",
      )}/users`,
    };

    const newIssuer1StatusList2021CredentialJwt =
      await createVerifiableCredentialJwt(
        newIssuer1StatusList2021Credential,
        issuer,
        {
          ebsiAuthority,
          ebsiEnvConfig,
          skipValidation: true,
          trustedHostnames,
        },
      );

    return newIssuer1StatusList2021CredentialJwt;
  }

  let newIssuer1: Awaited<ReturnType<typeof createIssuer>>;
  let newIssuer2: Awaited<ReturnType<typeof createIssuer>>;

  let lastExistingIssuerDid: string;
  let beforeLastExistingIssuerDid: string;

  const mockServer = setupServer();

  beforeAll(async () => {
    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: "bypass",
    });

    newIssuer1 = await createIssuer();
    newIssuer2 = await createIssuer();

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

    // Get last 2 issuers DID
    let issuersResponse: SupertestIssuersResponse =
      await request(server).get("/issuers");

    // Go to last page (where there is at least 2 admins)
    const { total } = issuersResponse.body;
    issuersResponse = await request(server).get(
      `/issuers?page[after]=${Math.floor(total / 2)}&page[size]=2`,
    );

    beforeLastExistingIssuerDid = issuersResponse.body.items[0].did;
    lastExistingIssuerDid = issuersResponse.body.items[1].did;

    // Get testUserWithProxy's first proxyId
    testIssuerWithProxyKid = configService.get<string>(
      "testIssuerWithProxyKid",
    );
    [testIssuerWithProxyDid] = testIssuerWithProxyKid.split("#");
    const issuerProxiesResponse: SupertestIssuerProxiesResponse = await request(
      server,
    ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);
    testUserWithProxyFirstProxyId = issuerProxiesResponse.body.items[0].proxyId;
    testIssuerWithProxyPrivateKey = configService.get<string>(
      "testIssuerWithProxyPrivateKey",
    );

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
    trustedSchemasRegistryApiUrl = configService.get<string>(
      "trustedSchemasRegistryApiUrl",
    );
    testStatusListSchemaId = configService.get<string>(
      "testStatusListSchemaId",
    );
  });

  afterAll(() => {
    mockServer.close();
  });

  describe("/issuers", () => {
    it("should return a collection of issuers", async () => {
      expect.assertions(2);
      const response: SupertestIssuersResponse =
        await request(server).get("/issuers");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-issuers-registry/v3/issuers?page[after]=1&page[size]=10",
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]=1&page[size]=10",
            ),
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]=1&page[size]=10",
            ),
            next: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]=",
            ),
            last: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]=",
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/issuers/{did}", () => {
    it("should return a specific issuer", async () => {
      expect.assertions(2);

      const response: SupertestIssuerResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}`,
      );
      expect(response.body).toStrictEqual({
        did: lastExistingIssuerDid,
        attributes: expect.arrayContaining([]),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/not-a-did");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/did:ebsi:z1234");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(`/issuers/${randomDid}`);

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/issuers/{did}/attributes", () => {
    it("should return the attributes from a specific issuer", async () => {
      expect.assertions(2);

      const response: SupertestAttributesResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes`,
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`,
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`,
            ),
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`,
            ),
            next: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=`,
            ),
            last: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=`,
            ),
          }),
        }),
      );
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/not-a-did/attributes",
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/did:ebsi:z1234/attributes",
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/attributes`,
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/issuers/{did}/attributes/{attributeId}", () => {
    let attributeId: string;

    beforeAll(async () => {
      const responseAttributes: SupertestAttributesResponse = await request(
        server,
      ).get(`/issuers/${lastExistingIssuerDid}/attributes`);

      attributeId = responseAttributes.body.items[0].id;
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}`,
      );
      expect(response.body).toStrictEqual({
        did: lastExistingIssuerDid,
        attribute: {
          body: expect.any(String),
          hash: attributeId,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${attributeId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/attributes/${attributeId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/attributes/${attributeId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when attribute is not found", async () => {
      expect.assertions(5);

      // consult a random attribute
      const wrongAttributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${wrongAttributeId}`,
      );
      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${wrongAttributeId} not found`,
        ),
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      // consult an attribute from a different did
      const responseAttributes: SupertestAttributesResponse = await request(
        server,
      ).get(`/issuers/${beforeLastExistingIssuerDid}/attributes`);
      expect(responseAttributes.status).toBe(200);

      const attributeId2 = responseAttributes.body.items[0].id;

      const response2: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId2}`,
      );
      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(`Attribute ${attributeId2} not found`),
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  describe("/issuers/{did}/attributes/{attributeId}/revisions", () => {
    let attributeId: string;

    beforeAll(async () => {
      const responseAttributes: SupertestAttributesResponse = await request(
        server,
      ).get(`/issuers/${lastExistingIssuerDid}/attributes`);

      attributeId = responseAttributes.body.items[0].id;
    });

    it("should return revisions", async () => {
      expect.assertions(2);

      const urlPath = `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`;

      const response = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`,
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(urlPath),
        items: expect.arrayContaining([]),
        total: expect.any(Number),
        pageSize: expect.any(Number),
        links: {
          first: expect.stringContaining(urlPath),
          prev: expect.stringContaining(urlPath),
          next: expect.stringContaining(urlPath),
          last: expect.stringContaining(urlPath),
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${attributeId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/attributes/${attributeId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/attributes/${attributeId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when attribute is not found", async () => {
      expect.assertions(5);

      // consult a random attribute
      const wrongAttributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${wrongAttributeId}`,
      );
      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${wrongAttributeId} not found`,
        ),
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      // consult an attribute from a different did
      const responseAttributes: SupertestAttributesResponse = await request(
        server,
      ).get(`/issuers/${beforeLastExistingIssuerDid}/attributes`);
      expect(responseAttributes.status).toBe(200);

      const attributeId2 = responseAttributes.body.items[0].id;

      const response2: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId2}`,
      );
      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(`Attribute ${attributeId2} not found`),
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);
    });
  });

  describe("/issuers/{did}/proxies", () => {
    it("should return the proxies from a specific issuer", async () => {
      expect.assertions(2);

      const response: SupertestIssuerProxiesResponse = await request(
        server,
      ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              href: expect.stringContaining(
                `/trusted-issuers-registry/v3/issuers/${testIssuerWithProxyDid}/proxies/0x`,
              ),
              proxyId: expect.stringContaining("0x"),
            }),
          ]),
          total: expect.any(Number),
        }),
      );
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get("/issuers/not-a-did/proxies");

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/did:ebsi:z1234/proxies",
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/proxies`,
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/issuers/{did}/proxies/{proxyId}", () => {
    it("should return the proxy from a specific issuer", async () => {
      expect.assertions(2);

      const response: SupertestIssuerProxyResponse = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}`,
      );

      expect(response.body).toStrictEqual({
        headers: expect.any(Object),
        prefix: expect.any(String),
        testSuffix: expect.any(String),
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/proxies/${testUserWithProxyFirstProxyId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/proxies/${testUserWithProxyFirstProxyId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/proxies/${testUserWithProxyFirstProxyId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the proxy is not found", async () => {
      expect.assertions(2);

      const invalidProxyId = crypto.randomBytes(16).toString("hex");

      const response = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${invalidProxyId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Proxy Not Found",
        status: 404,
        detail: `Proxy ${invalidProxyId} of issuer ${testIssuerWithProxyDid} can't be found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/issuers/{did}/proxies/{proxyId}/{path}", () => {
    const path = "/creds/1";

    // All the tests that require a mock server are run only locally
    describeLocalTestEnvOnly()("with mocked issuer's endpoint", () => {
      let proxy: IssuerProxyResponseObject;

      beforeAll(async () => {
        // Get first proxy information
        const response: SupertestIssuerProxyResponse = await request(
          server,
        ).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}`,
        );
        proxy = response.body;
      });

      afterEach(() => {
        mockServer.resetHandlers();
      });

      it("should return a StatusList2021Credential JWT", async () => {
        expect.assertions(2);

        // Mock issuer's endpoint response
        const issuer = getEbsiIssuer(
          testIssuerWithProxyPrivateKey,
          testIssuerWithProxyDid,
          testIssuerWithProxyKid,
        );
        const domain = configService.get<string>("domain");

        const statusList2021CredentialJwt =
          await createStatusList2021CredentialJwt(issuer, proxy, domain);

        mockServer.use(
          http.get(`${proxy.prefix}${path}`, () =>
            HttpResponse.json(statusList2021CredentialJwt),
          ),
        );

        const response: SupertestStringResponse = await request(server).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}${path}`,
        );

        expect(response.text).toStrictEqual(statusList2021CredentialJwt);
        expect(response.status).toBe(200);
      });

      it("should return an error 500 when the Trusted Issuer's endpoint respond with a 500", async () => {
        expect.assertions(2);

        // Mock issuer's endpoint response
        mockServer.use(
          http.get(
            `${proxy.prefix}${path}`,
            () => new HttpResponse(null, { status: 500 }),
          ),
        );

        const response = await request(server).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}${path}`,
        );

        expect(response.body).toStrictEqual({
          detail: "The Status List Credential can't be retrieved",
          status: 500,
          title: "Unreachable Status List Credential",
          type: "about:blank",
        });
        expect(response.status).toBe(500);
      });

      it("should return an error 500 when the Trusted Issuer's endpoint respond with an invalid StatusList2021Credential", async () => {
        expect.assertions(2);

        // Mock issuer's endpoint response
        mockServer.use(
          http.get(`${proxy.prefix}${path}`, () =>
            HttpResponse.text("invalid jwt"),
          ),
        );

        const response = await request(server).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}${path}`,
        );

        expect(response.body).toStrictEqual({
          detail:
            "The Status List Credential returned by the Issuer's proxy is invalid",
          status: 500,
          title: "Invalid Status List Credential",
          type: "about:blank",
        });
        expect(response.status).toBe(500);
      });
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/proxies/${testUserWithProxyFirstProxyId}${path}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/did:ebsi:z1234/proxies/${testUserWithProxyFirstProxyId}${path}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID v1"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/${randomDid}/proxies/${testUserWithProxyFirstProxyId}${path}`,
      );

      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: `Issuer ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the proxy is not found", async () => {
      expect.assertions(2);

      const invalidProxyId = crypto.randomBytes(16).toString("hex");

      const response = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${invalidProxyId}${path}`,
      );

      expect(response.body).toStrictEqual({
        title: "Proxy Not Found",
        status: 404,
        detail: `Proxy ${invalidProxyId} of issuer ${testIssuerWithProxyDid} can't be found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describeLocalTestEnvOnly()("with mocked issuer's endpoint", () => {
    describeWriteOps().each(["addIssuerProxy", "updateIssuerProxy"])(
      "/jsonrpc - method: %s",
      (method: string) => {
        let testIssuerWithProxyWallet: ethers.Wallet;
        let testIssuerWithProxyAccessToken: string;

        beforeAll(async () => {
          testIssuerWithProxyWallet = new ethers.Wallet(
            prefixWith0x(configService.get("testIssuerWithProxyPrivateKey")),
          );

          try {
            testIssuerWithProxyAccessToken = await requestSiopJwt({
              clientKid: configService.get<string>("testIssuerWithProxyKid"),
              clientPrivateKey: configService.get<string>(
                "testIssuerWithProxyPrivateKey",
              ),
              configService,
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            throw e;
          }

          // Mock Trusted Issuers' endpoint
          const issuer = getEbsiIssuer(
            testIssuerWithProxyPrivateKey,
            testIssuerWithProxyDid,
            testIssuerWithProxyKid,
          );
          const domain = configService.get<string>("domain");
          const statusList2021CredentialJwt =
            await createStatusList2021CredentialJwt(
              issuer,
              newIssuer1.proxy.rawProxyData,
              domain,
            );

          mockServer.use(
            http.get(
              `${newIssuer1.proxy.rawProxyData.prefix}${newIssuer1.proxy.rawProxyData.testSuffix}`,
              () => HttpResponse.json(statusList2021CredentialJwt),
            ),
            http.get(
              `${newIssuer2.proxy.rawProxyData.prefix}${newIssuer2.proxy.rawProxyData.testSuffix}`,
              () => HttpResponse.json(statusList2021CredentialJwt),
            ),
          );
        });

        afterAll(() => {
          mockServer.resetHandlers();
        });

        it("should add / update the proxy", async () => {
          expect.assertions(5);

          const did = testIssuerWithProxyDid;
          let extraTestUrl = "";
          let extraTestExpectedResponse: unknown = {};
          let params = {};

          switch (method) {
            case "addIssuerProxy": {
              params = {
                from: testIssuerWithProxyWallet.address,
                did,
                proxyData: newIssuer1.proxy.proxyData,
              } as AddIssuerProxyParam;

              extraTestUrl = `/issuers/${did}/proxies`;

              extraTestExpectedResponse = {
                items: expect.arrayContaining([
                  {
                    proxyId: newIssuer1.proxy.proxyId,
                    href: expect.stringContaining(
                      `/proxies/${newIssuer1.proxy.proxyId}`,
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
                proxyData: newIssuer2.proxy.proxyData,
                proxyId: newIssuer1.proxy.proxyId,
              } as UpdateIssuerProxyParam;

              extraTestUrl = `/issuers/${did}/proxies/${newIssuer1.proxy.proxyId}`;
              extraTestExpectedResponse = newIssuer2.proxy.rawProxyData;
              break;
            }
            default: {
              throw new Error(`Invalid method ${method}`);
            }
          }

          const responseBuild: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(testIssuerWithProxyAccessToken, { type: "bearer" })
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
            ) as unknown as UnsignedTransaction,
          );
          uTx.chainId = Number(uTx.chainId);
          const sgnTx = await testIssuerWithProxyWallet.signTransaction(uTx);
          const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

          const responseSend: SupertestJsonRpcResponse = await request(server)
            .post("/jsonrpc")
            .auth(testIssuerWithProxyAccessToken, { type: "bearer" })
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

    describeWriteOps()("test blockscout", () => {
      it("should return transaction data from blockscout", async () => {
        if (!blockscout.url || !sampleTransaction) return;

        expect.assertions(1);

        await new Promise((f) => {
          setTimeout(f, 5000);
        });

        // check if blockscout is working properly
        const blockscoutCheck = await request(blockscout.url)
          .get(`/tx/${sampleTransaction}/internal-transactions`)
          .set({ Authorization: blockscout.bearerToken });

        expect(blockscoutCheck.status).toBe(200);
      });
    });
  });
});
