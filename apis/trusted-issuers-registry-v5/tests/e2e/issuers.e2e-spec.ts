import { describe, beforeAll, afterEach, it, expect } from "@jest/globals";
import request from "supertest";
import crypto from "node:crypto";
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
import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import type {
  StatusList2021Credential,
  PaginatedList,
} from "@ebsiint-api/shared";
import { ApiConfig } from "../../src/config/configuration";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import type {
  AttributeObject,
  IdLink,
  DidLink,
  IssuerResponseObject,
  ProxyLink,
  IssuerProxyResponseObject,
} from "../../src/modules/issuers/issuers.interface";
import { getServer } from "../utils/getServer";
import { describeLocalTestEnvOnly } from "../utils/describeLocalTestEnvOnly";

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
  let testIssuerWithProxy: EbsiIssuer;
  let testIssuerWithProxyKid: string;
  let testIssuerWithProxyDid: string;
  let testIssuerWithProxyPrivateKey: string;
  let testIssuerWithProxyFirstProxyId: string;
  let testVerifiableAttestationSchemaId: string;
  let testStatusListSchemaId: string;
  let trustedSchemasRegistryApiUrl: string;
  let trustedHostnames: string[];
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
        }
      );

    return newIssuer1StatusList2021CredentialJwt;
  }

  let lastExistingIssuerDid: string;
  let beforeLastExistingIssuerDid: string;

  beforeAll(async () => {
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

    trustedHostnames = configService.get<string[]>("trustedHostnames");

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

    // Get testIssuerWithProxy's first proxyId
    testIssuerWithProxyKid = configService.get<string>(
      "testIssuerWithProxyKid"
    );
    [testIssuerWithProxyDid] = testIssuerWithProxyKid.split("#");
    const issuerProxiesResponse: SupertestIssuerProxiesResponse = await request(
      server
    ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);
    testIssuerWithProxyFirstProxyId =
      issuerProxiesResponse.body.items[0].proxyId;
    testIssuerWithProxyPrivateKey = configService.get<string>(
      "testIssuerWithProxyPrivateKey"
    );

    testIssuerWithProxy = getEbsiIssuer(
      testIssuerWithProxyPrivateKey,
      testIssuerWithProxyDid,
      testIssuerWithProxyKid
    );

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
            "/trusted-issuers-registry/v5/issuers?page[after]=1&page[size]=10"
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]=1&page[size]=10"
            ),
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]=1&page[size]=10"
            ),
            next: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]="
            ),
            last: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]="
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
            `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
          ),
          items: expect.arrayContaining([]),
          total: expect.any(Number),
          pageSize: expect.any(Number),
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
            ),
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`
            ),
            next: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=`
            ),
            last: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=`
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

      const urlPath = `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`;

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
                `/trusted-issuers-registry/v5/issuers/${testIssuerWithProxyDid}/proxies/0x`
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
        `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}`
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
        `/issuers/not-a-did/proxies/${testIssuerWithProxyFirstProxyId}`
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
        `/issuers/did:ebsi:z1234/proxies/${testIssuerWithProxyFirstProxyId}`
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
        `/issuers/${randomDid}/proxies/${testIssuerWithProxyFirstProxyId}`
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
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}`
        );
        proxy = response.body;
      });

      afterEach(() => {
        nock.cleanAll();
      });

      it("should return a StatusList2021Credential JWT", async () => {
        expect.assertions(2);

        // Mock issuer's endpoint response
        const authority = configService
          .get<string>("domain")
          .replace(/^https?:\/\//, "");

        const statusList2021CredentialJwt =
          await createStatusList2021CredentialJwt(
            testIssuerWithProxy,
            proxy,
            authority
          );

        nock(proxy.prefix)
          .get(path)
          .reply(200, statusList2021CredentialJwt)
          .persist();

        const response: SupertestStringResponse = await request(server).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`
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
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`
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
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`
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
        `/issuers/not-a-did/proxies/${testIssuerWithProxyFirstProxyId}${path}`
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
        `/issuers/did:ebsi:z1234/proxies/${testIssuerWithProxyFirstProxyId}${path}`
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
        `/issuers/${randomDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`
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
});
