import request from "supertest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import nock from "nock";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
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
import type { FastifyInstance } from "fastify";
import { useContainer } from "class-validator";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { exportJWK, generateKeyPair } from "jose";
import { ec as EC } from "elliptic";
import { bytes } from "multiformats";
import { base64url } from "multiformats/bases/base64";
import {
  createVerifiableCredentialJwt,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import { ApiConfig } from "../../src/config/configuration";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  AttributeObject,
  IdLink,
  DidLink,
  IssuerResponseObject,
  ProxyLink,
  IssuerProxyResponseObject,
} from "../../src/modules/issuers/issuers.interface";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { getAccessToken, waitToBeMined } from "../utils/waitToBeMined";
import { prefixWith0x, StatusList2021Credential } from "../../src/shared/utils";
import { PaginatedList } from "../../src/shared/interfaces";
import { requestSiopJwt } from "../utils/siopJwt";
import {
  AddIssuerProxyParam,
  InsertIssuerParam,
  UnsignedTransaction,
  UpdateIssuerParam,
  UpdateIssuerProxyParam,
} from "../../src/modules/jsonrpc/dto";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";
import { AsyncReturnType } from "../../src/shared/types/async-return-type";

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
  alg: "ES256" | "ES256K" | "EdDSA" = "ES256K"
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
  let app: INestApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig, true>;
  let userTestWallet: ethers.Wallet;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;
  let testAdminAccessToken: string;
  let testIssuerWithProxyKid: string;
  let testIssuerWithProxyDid: string;
  let testIssuerWithProxyPrivateKey: string;
  let testUserWithProxyFirstProxyId: string;
  let testStatusListSchemaId: string;
  let apiAccessToken: string;
  let ledgerApi: string;
  let trustedSchemasRegistryApiUrl: string;
  let sampleTransaction: string;

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
    ebsiAuthority: string
  ) {
    const newIssuer1StatusList2021Credential: StatusList2021Credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/vc/status-list/2021/v1",
      ],
      id: `${issuerProxy.prefix}${issuerProxy.testSuffix}`,
      type: ["VerifiableCredential", "StatusList2021Credential"],
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
        id: `${trustedSchemasRegistryApiUrl}/${testStatusListSchemaId}`,
        type: "FullJsonSchemaValidator2021",
      },
    };
    const newIssuer1StatusList2021CredentialJwt =
      await createVerifiableCredentialJwt(
        newIssuer1StatusList2021Credential,
        issuer,
        {
          ebsiAuthority,
          skipValidation: true,
        }
      );

    return newIssuer1StatusList2021CredentialJwt;
  }

  let newIssuer1: AsyncReturnType<typeof createIssuer>;
  let newIssuer2: AsyncReturnType<typeof createIssuer>;
  let newIssuer3: AsyncReturnType<typeof createIssuer>;
  let newIssuer4: AsyncReturnType<typeof createIssuer>;

  let lastExistingIssuerDid: string;
  let beforeLastExistingIssuerDid: string;

  beforeAll(async () => {
    newIssuer1 = await createIssuer();
    newIssuer2 = await createIssuer();
    newIssuer3 = await createIssuer();
    newIssuer4 = await createIssuer();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    userTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testUserPrivateKey"))
    );
    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    // Generate a valid Client JWT (SIOP) for the tests
    testUserAccessToken = await requestSiopJwt({
      clientKid: configService.get<string>("testUserKid"),
      clientPrivateKey: configService.get<string>("testUserPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      trustedAppsRegistryUrl: `${configService.get<string>("tarApiUrl")}`,
    });

    testAdminAccessToken = await requestSiopJwt({
      clientKid: configService.get<string>("testAdminKid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      trustedAppsRegistryUrl: `${configService.get<string>("tarApiUrl")}`,
    });

    blockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");

    // Get last 2 issuers DID
    let issuersResponse: SupertestIssuersResponse = await request(server).get(
      "/issuers"
    );

    // Go to last page (where there is at least 2 admins)
    const { total } = issuersResponse.body;
    issuersResponse = await request(server).get(
      `/issuers?page[after]=${Math.floor(total / 2)}&page[size]=2`
    );

    beforeLastExistingIssuerDid = issuersResponse.body.items[0].did;
    lastExistingIssuerDid = issuersResponse.body.items[1].did;

    // Get testUserWithProxy's first proxyId
    testIssuerWithProxyKid = configService.get<string>(
      "testIssuerWithProxyKid"
    );
    [testIssuerWithProxyDid] = testIssuerWithProxyKid.split("#");
    const issuerProxiesResponse: SupertestIssuerProxiesResponse = await request(
      server
    ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);
    testUserWithProxyFirstProxyId = issuerProxiesResponse.body.items[0].proxyId;
    testIssuerWithProxyPrivateKey = configService.get<string>(
      "testIssuerWithProxyPrivateKey"
    );

    apiAccessToken = await getAccessToken(configService);
    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
    trustedSchemasRegistryApiUrl = configService.get<string>(
      "trustedSchemasRegistryApiUrl"
    );
    testStatusListSchemaId = configService.get<string>(
      "testStatusListSchemaId"
    );
  });

  describe("/issuers", () => {
    it("should return a collection of issuers", async () => {
      expect.assertions(2);
      const response: SupertestIssuersResponse = await request(server).get(
        "/issuers"
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-issuers-registry/v3/issuers?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-issuers-registry/v3/issuers?page[after]="
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/issuers/{did}", () => {
    it("should return a specific issuer", async () => {
      expect.assertions(2);

      const response: SupertestIssuerResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}`
      );
      expect(response.body).toStrictEqual({
        did: lastExistingIssuerDid,
        attributes: expect.arrayContaining([]) as unknown[],
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
        `/issuers/${lastExistingIssuerDid}/attributes`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
            ) as string,
            next: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=`
            ) as string,
            last: expect.stringContaining(
              `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes?page[after]=`
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/issuers/not-a-did/attributes"
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
        "/issuers/did:ebsi:z1234/attributes"
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
        `/issuers/${randomDid}/attributes`
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
        server
      ).get(`/issuers/${lastExistingIssuerDid}/attributes`);

      attributeId = responseAttributes.body.items[0].id;
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}`
      );
      expect(response.body).toStrictEqual({
        did: lastExistingIssuerDid,
        attribute: {
          body: expect.any(String) as string,
          hash: attributeId,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${attributeId}`
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
        `/issuers/did:ebsi:z1234/attributes/${attributeId}`
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
        `/issuers/${randomDid}/attributes/${attributeId}`
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
        `/issuers/${lastExistingIssuerDid}/attributes/${wrongAttributeId}`
      );
      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${wrongAttributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      // consult an attribute from a different did
      const responseAttributes: SupertestAttributesResponse = await request(
        server
      ).get(`/issuers/${beforeLastExistingIssuerDid}/attributes`);
      expect(responseAttributes.status).toBe(200);

      const attributeId2 = responseAttributes.body.items[0].id;

      const response2: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId2}`
      );
      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId2} not found`
        ) as string,
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
        server
      ).get(`/issuers/${lastExistingIssuerDid}/attributes`);

      attributeId = responseAttributes.body.items[0].id;
    });

    it("should return revisions", async () => {
      expect.assertions(2);

      const urlPath = `/trusted-issuers-registry/v3/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`;

      const response = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(urlPath) as string,
        items: expect.arrayContaining([]) as AttributeObject[],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: {
          first: expect.stringContaining(urlPath) as string,
          prev: expect.stringContaining(urlPath) as string,
          next: expect.stringContaining(urlPath) as string,
          last: expect.stringContaining(urlPath) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/attributes/${attributeId}`
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
        `/issuers/did:ebsi:z1234/attributes/${attributeId}`
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
        `/issuers/${randomDid}/attributes/${attributeId}`
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
        `/issuers/${lastExistingIssuerDid}/attributes/${wrongAttributeId}`
      );
      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${wrongAttributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      // consult an attribute from a different did
      const responseAttributes: SupertestAttributesResponse = await request(
        server
      ).get(`/issuers/${beforeLastExistingIssuerDid}/attributes`);
      expect(responseAttributes.status).toBe(200);

      const attributeId2 = responseAttributes.body.items[0].id;

      const response2: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId2}`
      );
      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId2} not found`
        ) as string,
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
        server
      ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              href: expect.stringContaining(
                `/trusted-issuers-registry/v3/issuers/${testIssuerWithProxyDid}/proxies/0x`
              ) as string,
              proxyId: expect.stringContaining("0x") as string,
            }),
          ]) as string[],
          total: expect.any(Number) as number,
        })
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
        "/issuers/did:ebsi:z1234/proxies"
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
        `/issuers/${randomDid}/proxies`
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
        `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}`
      );

      expect(response.body).toStrictEqual({
        headers: expect.any(Object) as Record<
          string,
          string | boolean | number
        >,
        prefix: expect.any(String) as string,
        testSuffix: expect.any(String) as string,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/proxies/${testUserWithProxyFirstProxyId}`
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
        `/issuers/did:ebsi:z1234/proxies/${testUserWithProxyFirstProxyId}`
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
        `/issuers/${randomDid}/proxies/${testUserWithProxyFirstProxyId}`
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
        `/issuers/${testIssuerWithProxyDid}/proxies/${invalidProxyId}`
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
    let proxy: IssuerProxyResponseObject;

    beforeAll(async () => {
      // Get first proxy information
      const response: SupertestIssuerProxyResponse = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}`
      );
      proxy = response.body;
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it("should return a StatusList2021Credential JWT", async () => {
      expect.assertions(2);

      // Mock issuer's endpoint response
      const issuer = getEbsiIssuer(
        testIssuerWithProxyPrivateKey,
        testIssuerWithProxyDid,
        testIssuerWithProxyKid
      );
      const authority = configService
        .get<string>("domain")
        .replace(/^https?:\/\//, "");
      const statusList2021CredentialJwt =
        await createStatusList2021CredentialJwt(issuer, proxy, authority);

      nock(proxy.prefix)
        .get(path)
        .reply(200, statusList2021CredentialJwt)
        .persist();

      const response: SupertestStringResponse = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}${path}`
      );

      expect(response.text).toStrictEqual(statusList2021CredentialJwt);
      expect(response.status).toBe(200);
    });

    it("should return an error 500 when the Trusted Issuer's endpoint respond with a 500", async () => {
      expect.assertions(2);

      // Mock issuer's endpoint response
      nock(proxy.prefix).get(path).reply(500).persist();

      const response = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}${path}`
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
      nock(proxy.prefix).get(path).reply(200, "invalid jwt").persist();

      const response = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}${path}`
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

    it("should throw an error if the issuer DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/issuers/not-a-did/proxies/${testUserWithProxyFirstProxyId}${path}`
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
        `/issuers/did:ebsi:z1234/proxies/${testUserWithProxyFirstProxyId}${path}`
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
        `/issuers/${randomDid}/proxies/${testUserWithProxyFirstProxyId}${path}`
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
        `/issuers/${testIssuerWithProxyDid}/proxies/${invalidProxyId}${path}`
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

  describeWriteOps().each([
    "insertIssuer",
    "updateIssuer",
    "updateIssuer(test update attribute)",
  ])("/jsonrpc - method: %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it(`should return a new unsigned transaction`, async () => {
      expect.assertions(2);

      const { did, attribute } = await createIssuer();
      let prevAttributeHash = "";

      if (updateAttribute) {
        prevAttributeHash =
          "0x9045517cc555c75cd7085900a900e6693439086f9eddeee513271fba278964fe";
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testAdminAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [
            {
              from: adminTestWallet.address,
              did,
              attributeData: attribute.data,
              ...(prevAttributeHash && { prevAttributeHash }),
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

    it("should send a transaction", async () => {
      expect.assertions(5);

      const { did } = newIssuer1;
      let extraTestUrl = "";
      let extraTestExpectedResponse: unknown = {};
      let params = {};

      switch (method) {
        case "insertIssuer": {
          // create a new issuer and add newIssuer1.attribute
          params = {
            from: adminTestWallet.address,
            did,
            attributeData: newIssuer1.attribute.data,
          } as InsertIssuerParam;

          extraTestUrl = `/issuers/${did}`;

          extraTestExpectedResponse = {
            did,
            attributes: [
              {
                body: newIssuer1.attribute.body,
                hash: newIssuer1.attribute.hash,
              },
            ],
          };

          break;
        }
        case "updateIssuer": {
          if (updateAttribute) {
            // update newIssuer1.attribute: change it to newIssuer3.attribute
            params = {
              from: adminTestWallet.address,
              did,
              attributeData: newIssuer3.attribute.data,
              prevAttributeHash: newIssuer1.attribute.hash,
            } as UpdateIssuerParam;

            extraTestUrl = `/issuers/${did}`;

            extraTestExpectedResponse = {
              did,
              attributes: [
                {
                  body: newIssuer3.attribute.body,
                  hash: newIssuer3.attribute.hash,
                },
                {
                  body: newIssuer2.attribute.body,
                  hash: newIssuer2.attribute.hash,
                },
              ],
            };
          } else {
            // updateIssuer: add newIssuer2.attribute
            params = {
              from: adminTestWallet.address,
              did,
              attributeData: newIssuer2.attribute.data,
            } as UpdateIssuerParam;

            extraTestUrl = `/issuers/${did}`;

            extraTestExpectedResponse = {
              did,
              attributes: [
                {
                  body: newIssuer1.attribute.body,
                  hash: newIssuer1.attribute.hash,
                },
                {
                  body: newIssuer2.attribute.body,
                  hash: newIssuer2.attribute.hash,
                },
              ],
            };
          }
          break;
        }
        case "addIssuerProxy": {
          params = {
            from: adminTestWallet.address,
            did,
            proxyData: newIssuer1.proxy.proxyData,
          } as AddIssuerProxyParam;

          extraTestUrl = `/issuers/${did}/proxies`;

          extraTestExpectedResponse = {
            items: [
              {
                proxyId: newIssuer1.proxy.proxyId,
                // eslint-disable-next-line jest/no-conditional-expect
                href: expect.stringContaining(
                  `/proxies/${newIssuer1.proxy.proxyId}`
                ) as string,
              },
            ],
            total: 1,
          };

          break;
        }
        case "updateIssuerProxy": {
          params = {
            from: adminTestWallet.address,
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
        .auth(testAdminAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [params],
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
        .auth(testAdminAccessToken, { type: "bearer" })
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
        apiAccessToken,
        responseSend.body.result as string
      );
      expect(receipt.status).toBe(1);
      sampleTransaction = responseSend.body.result as string;

      // Extra test
      const extraTestResponse = await request(server).get(extraTestUrl);

      expect(extraTestResponse.body).toStrictEqual(extraTestExpectedResponse);
      expect(extraTestResponse.status).toBe(200);
    });

    it("should send the transaction but the SC should reject no authorized users", async () => {
      expect.assertions(3);

      let params: unknown;

      switch (method) {
        case "insertIssuer": {
          // create a new issuer and add newIssuer1.attribute
          params = {
            from: userTestWallet.address,
            did: EbsiWallet.createDid(),
            attributeData: newIssuer4.attribute.data,
          } as InsertIssuerParam;
          break;
        }
        case "updateIssuer": {
          if (updateAttribute) {
            // update newIssuer1.attribute: change it to newIssuer3.attribute
            const prevAttributeHash = newIssuer2.attribute.hash;
            params = {
              from: userTestWallet.address,
              did: configService.get<string>("testAdminKid").split("#")[0],
              attributeData: newIssuer4.attribute.data,
              ...(prevAttributeHash && { prevAttributeHash }),
            };
          } else {
            // updateIssuer: add newIssuer2.attribute
            params = {
              from: userTestWallet.address,
              did: configService.get<string>("testAdminKid").split("#")[0],
              attributeData: newIssuer4.attribute.data,
            };
          }
          break;
        }
        case "addIssuerProxy": {
          params = {
            from: userTestWallet.address,
            did: newIssuer1.did,
            proxyData: newIssuer1.proxy.proxyData,
          } as AddIssuerProxyParam;
          break;
        }
        case "updateIssuerProxy": {
          params = {
            from: userTestWallet.address,
            did: newIssuer1.did,
            proxyData: newIssuer2.proxy.proxyData,
            proxyId: newIssuer1.proxy.proxyId,
          } as UpdateIssuerProxyParam;
          break;
        }
        default: {
          throw new Error(`Invalid method ${method}`);
        }
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
        .send({
          jsonrpc: "2.0",
          method,
          params: [params],
          id: 231,
        });

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await userTestWallet.signTransaction(uTx);
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
        ledgerApi,
        apiAccessToken,
        responseSend.body.result as string
      );
      receipt.revertReason = Buffer.from(
        (receipt.revertReason ?? "").slice(2),
        "hex"
      )
        .toString()
        .replace(/[^a-zA-Z:' ]/g, "");
      expect(receipt).toStrictEqual(
        expect.objectContaining({
          status: 0,
          revertReason: expect.stringContaining(
            `doesn't have the attribute TIR:${method}`
          ) as string,
        })
      );
    });

    it("should return transaction data from blockscout", async () => {
      if (!blockscout.url || !sampleTransaction) return;

      expect.assertions(1);

      await new Promise((f) => {
        setTimeout(f, 1500);
      });

      // check if blockscout is working properly
      const blockscoutCheck: SupertestJsonRpcResponse = await request(
        blockscout.url
      )
        .post("")
        .set({ Authorization: blockscout.bearerToken })
        .send({
          query: `{transaction(hash: "${sampleTransaction}") { hash, blockNumber, value, gasUsed }}`,
          variables: null,
          operationName: null,
        });

      expect(blockscoutCheck.body).toStrictEqual({
        data: {
          transaction: {
            blockNumber: expect.any(Number) as number,
            gasUsed: expect.any(String) as string,
            hash: sampleTransaction,
            value: expect.any(String) as string,
          },
        },
      });
    });
  });

  describeWriteOps().each(["addIssuerProxy", "updateIssuerProxy"])(
    "/jsonrpc - method: %s",
    (method: string) => {
      let testIssuerWithProxyWallet: ethers.Wallet;
      let testIssuerWithProxyAccessToken: string;

      beforeAll(async () => {
        const authority = configService
          .get<string>("domain")
          .replace(/^https?:\/\//, "");

        testIssuerWithProxyWallet = new ethers.Wallet(
          prefixWith0x(configService.get("testIssuerWithProxyPrivateKey"))
        );

        testIssuerWithProxyAccessToken = await requestSiopJwt({
          clientKid: configService.get<string>("testIssuerWithProxyKid"),
          clientPrivateKey: configService.get<string>(
            "testIssuerWithProxyPrivateKey"
          ),
          authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
          trustedAppsRegistryUrl: `${configService.get<string>("tarApiUrl")}`,
        });

        // Mock Trusted Issuers' endpoint
        const issuer = getEbsiIssuer(
          testIssuerWithProxyPrivateKey,
          testIssuerWithProxyDid,
          testIssuerWithProxyKid
        );
        const statusList2021CredentialJwt =
          await createStatusList2021CredentialJwt(
            issuer,
            newIssuer1.proxy.rawProxyData,
            authority
          );

        nock(newIssuer1.proxy.rawProxyData.prefix)
          .get(newIssuer1.proxy.rawProxyData.testSuffix)
          .reply(200, statusList2021CredentialJwt)
          .persist();

        nock(newIssuer2.proxy.rawProxyData.prefix)
          .get(newIssuer2.proxy.rawProxyData.testSuffix)
          .reply(200, statusList2021CredentialJwt)
          .persist();
      });

      afterAll(() => {
        nock.cleanAll();
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
              // eslint-disable-next-line jest/no-conditional-expect
              items: expect.arrayContaining([
                {
                  proxyId: newIssuer1.proxy.proxyId,
                  // eslint-disable-next-line jest/no-conditional-expect
                  href: expect.stringContaining(
                    `/proxies/${newIssuer1.proxy.proxyId}`
                  ) as string,
                },
              ]) as { proxyId: string; href: string }[],
              // eslint-disable-next-line jest/no-conditional-expect
              total: expect.any(Number) as number,
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
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
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
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          apiAccessToken,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);
        sampleTransaction = responseSend.body.result as string;

        // Extra test
        const extraTestResponse = await request(server).get(extraTestUrl);

        expect(extraTestResponse.body).toStrictEqual(extraTestExpectedResponse);
        expect(extraTestResponse.status).toBe(200);
      });
    }
  );
});
