import {
  describe,
  beforeAll,
  afterEach,
  afterAll,
  it,
  expect,
} from "@jest/globals";
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
import { ec as EC } from "elliptic";
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
  remove0xPrefix,
} from "@ebsiint-api/shared";
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
  IssuerType,
  IssuerTypeNames,
} from "../../src/modules/issuers/issuers.interface";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import { requestSiopJwt } from "../utils/siopJwt";
import { createIssuer, IssuerObject } from "../utils/tir";
import {
  AddIssuerProxyParam,
  InsertIssuerParam,
  UnsignedTransaction,
  UpdateIssuerParam,
  UpdateIssuerProxyParam,
} from "../../src/modules/jsonrpc/dto";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";
import { describeLocalTestEnvOnly } from "../utils/describeLocalTestEnvOnly";

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
  let testVerifiableAttestationSchemaId: string;
  let testStatusListSchemaId: string;
  let ledgerApi: string;
  let trustedSchemasRegistryApiUrl: string;
  let sampleTransaction: string;

  let blockscout: {
    url: string;
    bearerToken: string;
  };
  const randomDid = EbsiWallet.createDid();

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
        }
      );

    return newIssuer1StatusList2021CredentialJwt;
  }

  let newIssuer1: IssuerObject;
  let newIssuer2: IssuerObject;
  let newIssuer3: IssuerObject;
  let newIssuer4: IssuerObject;

  let lastExistingIssuerDid: string;
  let beforeLastExistingIssuerDid: string;

  beforeAll(async () => {
    newIssuer1 = createIssuer(IssuerType.RootTAO);
    newIssuer2 = createIssuer(IssuerType.RootTAO);
    newIssuer3 = createIssuer(IssuerType.RootTAO);
    newIssuer4 = createIssuer(IssuerType.RootTAO);

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

    try {
      // Generate a valid Client JWT (SIOP) for the tests
      testUserAccessToken = await requestSiopJwt({
        clientKid: configService.get<string>("testUserKid"),
        clientPrivateKey: configService.get<string>("testUserPrivateKey"),
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

    try {
      testAdminAccessToken = await requestSiopJwt({
        clientKid: configService.get<string>("testAdminKid"),
        clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
        configService,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      throw e;
    }

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

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
    trustedSchemasRegistryApiUrl = configService.get<string>(
      "trustedSchemasRegistryApiUrl"
    );
    testVerifiableAttestationSchemaId = configService.get<string>(
      "testVerifiableAttestationSchemaId"
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
            "/trusted-issuers-registry/v4/issuers?page[after]=1&page[size]=10"
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v4/issuers?page[after]=1&page[size]=10"
            ),
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v4/issuers?page[after]=1&page[size]=10"
            ),
            next: expect.stringContaining(
              "/trusted-issuers-registry/v4/issuers?page[after]="
            ),
            last: expect.stringContaining(
              "/trusted-issuers-registry/v4/issuers?page[after]="
            ),
          }),
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
        `/issuers/${lastExistingIssuerDid}/attributes`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-issuers-registry/v4/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v4/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
            ),
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v4/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
            ),
            next: expect.stringContaining(
              `/trusted-issuers-registry/v4/issuers/${lastExistingIssuerDid}/attributes?page[after]=`
            ),
            last: expect.stringContaining(
              `/trusted-issuers-registry/v4/issuers/${lastExistingIssuerDid}/attributes?page[after]=`
            ),
          }),
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
          body: expect.any(String),
          hash: attributeId,
          issuerType: expect.any(String),
          rootTao: expect.any(String),
          tao: expect.any(String),
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
        ),
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
        server
      ).get(`/issuers/${lastExistingIssuerDid}/attributes`);

      attributeId = responseAttributes.body.items[0].id;
    });

    it("should return revisions", async () => {
      expect.assertions(2);

      const urlPath = `/trusted-issuers-registry/v4/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`;

      const response = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`
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
        ),
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
        server
      ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              href: expect.stringContaining(
                `/trusted-issuers-registry/v4/issuers/${testIssuerWithProxyDid}/proxies/0x`
              ),
              proxyId: expect.stringContaining("0x"),
            }),
          ]),
          total: expect.any(Number),
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
        headers: expect.any(Object),
        prefix: expect.any(String),
        testSuffix: expect.any(String),
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

    // All the tests that require a mock server are run only locally
    describeLocalTestEnvOnly()("with mocked issuer's endpoint", () => {
      let proxy: IssuerProxyResponseObject;

      beforeAll(async () => {
        // Get first proxy information
        const response: SupertestIssuerProxyResponse = await request(
          server
        ).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testUserWithProxyFirstProxyId}`
        );
        proxy = response.body;
      });

      afterEach(() => {
        nock.cleanAll();
      });

      // Remove the skip after TIR API v4 is deployed
      it.skip("should return a StatusList2021Credential JWT", async () => {
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
        // eslint-disable-next-line jest/no-standalone-expect
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
    // "updateIssuer",
    // "updateIssuer(test update attribute)",
  ])("/jsonrpc - method: %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it(`should return a new unsigned transaction`, async () => {
      expect.assertions(2);

      const { did, attribute, tao, taoAttributeId, issuerType } = createIssuer(
        IssuerType.RootTAO
      );
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
              attributeData: attribute.hex,
              taoDid: tao,
              taoAttributeId,
              issuerType,
              ...(prevAttributeHash && { prevAttributeHash }),
            } as InsertIssuerParam,
          ],
          id: 231,
        });

      expect(responseBuild.body).toStrictEqual({
        jsonrpc: "2.0",
        id: 231,
        result: {
          chainId: expect.any(String),
          data: expect.any(String),
          from: adminTestWallet.address,
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
            attributeData: newIssuer1.attribute.hex,
            issuerType: newIssuer1.issuerType,
            taoDid: newIssuer1.tao,
            taoAttributeId: newIssuer1.taoAttributeId,
          } as InsertIssuerParam;

          extraTestUrl = `/issuers/${did}`;

          extraTestExpectedResponse = {
            did,
            attributes: [
              {
                body: newIssuer1.attribute.utf8,
                hash: remove0xPrefix(newIssuer1.attribute.id),
                issuerType: IssuerTypeNames[newIssuer1.issuerType],
                tao: newIssuer1.tao,
                rootTao: newIssuer1.rootTao,
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
              attributeData: newIssuer3.attribute.hex,
              prevAttributeHash: newIssuer1.attribute.id,
              issuerType: newIssuer3.issuerType,
              taoDid: newIssuer3.tao,
              taoAttributeId: newIssuer3.taoAttributeId,
            } as UpdateIssuerParam;

            extraTestUrl = `/issuers/${did}`;

            extraTestExpectedResponse = {
              did,
              attributes: [
                {
                  body: newIssuer3.attribute.utf8,
                  hash: remove0xPrefix(newIssuer3.attribute.id),
                  issuerType: IssuerTypeNames[newIssuer3.issuerType],
                  tao: newIssuer3.tao,
                  rootTao: newIssuer3.rootTao,
                },
                {
                  body: newIssuer2.attribute.utf8,
                  hash: remove0xPrefix(newIssuer2.attribute.id),
                  issuerType: IssuerTypeNames[newIssuer2.issuerType],
                  tao: newIssuer2.tao,
                  rootTao: newIssuer2.rootTao,
                },
              ],
            };
          } else {
            // updateIssuer: add newIssuer2.attribute
            params = {
              from: adminTestWallet.address,
              did,
              attributeData: newIssuer2.attribute.hex,
              issuerType: newIssuer2.issuerType,
              taoDid: newIssuer2.tao,
              taoAttributeId: newIssuer2.taoAttributeId,
            } as UpdateIssuerParam;

            extraTestUrl = `/issuers/${did}`;

            extraTestExpectedResponse = {
              did,
              attributes: [
                {
                  body: newIssuer1.attribute.utf8,
                  hash: remove0xPrefix(newIssuer1.attribute.id),
                  issuerType: IssuerTypeNames[newIssuer1.issuerType],
                  tao: newIssuer1.tao,
                  rootTao: newIssuer1.rootTao,
                },
                {
                  body: newIssuer2.attribute.utf8,
                  hash: remove0xPrefix(newIssuer2.attribute.id),
                  issuerType: IssuerTypeNames[newIssuer2.issuerType],
                  tao: newIssuer2.tao,
                  rootTao: newIssuer2.rootTao,
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
            proxyData: newIssuer1.proxy.utf8,
          } as AddIssuerProxyParam;

          extraTestUrl = `/issuers/${did}/proxies`;

          extraTestExpectedResponse = {
            items: [
              {
                proxyId: newIssuer1.proxy.id,
                // eslint-disable-next-line jest/no-conditional-expect
                href: expect.stringContaining(
                  `/proxies/${newIssuer1.proxy.id}`
                ),
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
            proxyData: newIssuer2.proxy.utf8,
            proxyId: newIssuer1.proxy.id,
          } as UpdateIssuerProxyParam;

          extraTestUrl = `/issuers/${did}/proxies/${newIssuer1.proxy.id}`;
          extraTestExpectedResponse = newIssuer2.proxy.obj;
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
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
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
            attributeData: newIssuer4.attribute.hex,
            taoDid: newIssuer4.tao,
            issuerType: newIssuer4.issuerType,
            taoAttributeId: newIssuer4.taoAttributeId,
          } as InsertIssuerParam;
          break;
        }
        /* // TODO: updateIssuer
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
        */
        case "addIssuerProxy": {
          params = {
            from: userTestWallet.address,
            did: newIssuer1.did,
            proxyData: newIssuer1.proxy.utf8,
          } as AddIssuerProxyParam;
          break;
        }
        case "updateIssuerProxy": {
          params = {
            from: userTestWallet.address,
            did: newIssuer1.did,
            proxyData: newIssuer2.proxy.utf8,
            proxyId: newIssuer1.proxy.id,
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
        result: expect.any(String),
      });
      expect(responseSend.status).toBe(200);

      // wait to be mined
      const receipt = await waitToBeMined(
        ledgerApi,
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
          ),
        })
      );
    });

    it("should return transaction data from blockscout", async () => {
      if (!blockscout.url || !sampleTransaction) return;

      expect.assertions(1);

      await new Promise((f) => {
        setTimeout(f, 5000);
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
            blockNumber: expect.any(Number),
            gasUsed: expect.any(String),
            hash: sampleTransaction,
            value: expect.any(String),
          },
        },
      });
    });
  });

  describeLocalTestEnvOnly()("with mocked issuer's endpoint", () => {
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

          try {
            testIssuerWithProxyAccessToken = await requestSiopJwt({
              clientKid: configService.get<string>("testIssuerWithProxyKid"),
              clientPrivateKey: configService.get<string>(
                "testIssuerWithProxyPrivateKey"
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
            testIssuerWithProxyKid
          );
          const statusList2021CredentialJwt =
            await createStatusList2021CredentialJwt(
              issuer,
              newIssuer1.proxy.obj,
              authority
            );

          nock(newIssuer1.proxy.obj.prefix)
            .get(newIssuer1.proxy.obj.testSuffix)
            .reply(200, statusList2021CredentialJwt)
            .persist();

          nock(newIssuer2.proxy.obj.prefix)
            .get(newIssuer2.proxy.obj.testSuffix)
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
                proxyData: newIssuer1.proxy.utf8,
              } as AddIssuerProxyParam;

              extraTestUrl = `/issuers/${did}/proxies`;

              extraTestExpectedResponse = {
                // eslint-disable-next-line jest/no-conditional-expect
                items: expect.arrayContaining([
                  {
                    proxyId: newIssuer1.proxy.id,
                    // eslint-disable-next-line jest/no-conditional-expect
                    href: expect.stringContaining(
                      `/proxies/${newIssuer1.proxy.id}`
                    ),
                  },
                ]),
                // eslint-disable-next-line jest/no-conditional-expect
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
              } as UpdateIssuerProxyParam;

              extraTestUrl = `/issuers/${did}/proxies/${newIssuer1.proxy.id}`;
              extraTestExpectedResponse = newIssuer2.proxy.obj;
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
            result: expect.any(String),
          });
          expect(responseSend.status).toBe(200);

          // wait to be mined
          const receipt = await waitToBeMined(
            ledgerApi,
            responseSend.body.result as string
          );
          expect(receipt.status).toBe(1);
          sampleTransaction = responseSend.body.result as string;

          // Extra test
          const extraTestResponse = await request(server).get(extraTestUrl);

          expect(extraTestResponse.body).toStrictEqual(
            extraTestExpectedResponse
          );
          expect(extraTestResponse.status).toBe(200);
        });
      }
    );
  });
});
