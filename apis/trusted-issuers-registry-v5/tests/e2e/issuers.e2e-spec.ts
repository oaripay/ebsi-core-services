import type {
  EbsiEnvConfiguration,
  EbsiIssuer,
} from "@cef-ebsi/verifiable-credential";
import type { RawServerDefault } from "fastify";

import { fromUrl } from "@cef-ebsi/ebsi-uri";
import { createVerifiableCredentialJwt } from "@cef-ebsi/verifiable-credential";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import {
  getSigner,
  methodNotAllowed,
  type PaginatedList,
  type StatusList2021Credential,
} from "@ebsiint-api/shared";
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
import { hexToBytes } from "did-jwt";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import crypto from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { ApiConfig } from "../../src/config/configuration.js";
import type {
  AttributeObject,
  DidLink,
  IdLink,
  IssuerProxyResponseObject,
  IssuerResponseObject,
  ProxyLink,
} from "../../src/modules/issuers/issuers.interface.js";

import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import { describeLocalTestEnvOnly } from "../utils/describeLocalTestEnvOnly.js";
import { getServer } from "../utils/getServer.js";

interface SupertestAttributeResponse {
  body: AttributeObject;
  status: number;
}

interface SupertestAttributesResponse {
  body: {
    items: IdLink[];
  };
  status: number;
}

interface SupertestIssuerProxiesResponse {
  body: PaginatedList<ProxyLink>;
  status: number;
}

interface SupertestIssuerProxyResponse {
  body: IssuerProxyResponseObject;
  status: number;
}

interface SupertestIssuerResponse {
  body: IssuerResponseObject;
  status: number;
}

interface SupertestIssuersResponse {
  body: PaginatedList<DidLink>;
  status: number;
}

interface SupertestStringResponse {
  status: number;
  text: string;
}

/**
 * Escape DID in URLs mocked by MSW
 * @see https://github.com/mswjs/msw/discussions/739#discussioncomment-2524732
 */
function escapeDid(url: string) {
  return url.replace("did:ebsi:", String.raw`did\:ebsi\:`);
}

function getEbsiIssuer(privateKeyHex: string, did: string, kid: string) {
  const privateKey = hexToBytes(privateKeyHex);
  const issuer: EbsiIssuer = {
    alg: "ES256",
    did,
    kid,
    signer: getSigner(privateKey, "ES256"),
  };
  return issuer;
}

describe("TIR API v5 - Issuers (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let configService: ConfigService<ApiConfig, true>;
  let testIssuerWithProxyKid: string;
  let testIssuerWithProxyDid: string;
  let testIssuerWithProxyPrivateKey: string;
  let testIssuerWithProxyFirstProxyId: string;
  let testVerifiableAttestationSchemaId: string;
  let testStatusListSchemaId: string;
  let trustedSchemasRegistryApiUrl: string;
  const randomDid = EbsiWallet.createDid();

  async function createStatusList2021CredentialJwt(
    issuer: EbsiIssuer,
    issuerProxy: IssuerProxyResponseObject,
    ebsiEnvConfig: EbsiEnvConfiguration,
    uriType: "EBSI URI" | "URL",
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
              : fromUrl(verifiableAttestationSchemaUrl),
          type: "FullJsonSchemaValidator2021",
        },
        {
          id:
            uriType === "URL"
              ? statusListSchemaUrl
              : fromUrl(statusListSchemaUrl),
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
        {
          ...ebsiEnvConfig,
          skipValidation: true,
        },
      );

    return newIssuer1StatusList2021CredentialJwt;
  }

  let lastExistingIssuerDid: string;
  let beforeLastExistingIssuerDid: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
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
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    const fastifyInstance = app.getHttpAdapter().getInstance();
    fastifyInstance.addHook("onRequest", methodNotAllowed);

    await app.init();
    await fastifyInstance.ready();

    server = getServer(app, configService);

    // Get last 2 issuers DID
    let issuersResponse: SupertestIssuersResponse =
      await request(server).get("/issuers");

    // Go to last page (where there is at least 2 admins)
    const { total } = issuersResponse.body;
    issuersResponse = await request(server).get(
      `/issuers?page[after]=${Math.floor(total / 2)}&page[size]=2`,
    );

    beforeLastExistingIssuerDid = issuersResponse.body.items[0]!.did;
    lastExistingIssuerDid = issuersResponse.body.items[1]!.did;

    // Get testIssuerWithProxy's first proxyId
    testIssuerWithProxyKid = configService.get<string>(
      "testIssuerWithProxyKid",
    );
    testIssuerWithProxyDid = testIssuerWithProxyKid.split("#")[0]!;
    const issuerProxiesResponse: SupertestIssuerProxiesResponse = await request(
      server,
    ).get(`/issuers/${testIssuerWithProxyDid}/proxies`);
    testIssuerWithProxyFirstProxyId =
      issuerProxiesResponse.body.items[0]!.proxyId;
    testIssuerWithProxyPrivateKey = configService.get<string>(
      "testIssuerWithProxyPrivateKey",
    );

    trustedSchemasRegistryApiUrl = configService.get<string>(
      "trustedSchemasRegistryApiUrl",
    );
    testVerifiableAttestationSchemaId = configService.get<string>(
      "testVerifiableAttestationSchemaId",
    );
    testStatusListSchemaId = configService.get<string>(
      "testStatusListSchemaId",
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/issuers", () => {
    it("should return a collection of issuers", async () => {
      expect.assertions(2);
      const response: SupertestIssuersResponse =
        await request(server).get("/issuers");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          items: expect.arrayContaining([]),
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]=1&page[size]=10",
            ),
            last: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]=",
            ),
            next: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]=",
            ),
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v5/issuers?page[after]=1&page[size]=10",
            ),
          }),
          pageSize: expect.any(Number),
          self: expect.stringContaining(
            "/trusted-issuers-registry/v5/issuers?page[after]=1&page[size]=10",
          ),
          total: expect.any(Number),
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
        attributes: expect.arrayContaining([]),
        did: lastExistingIssuerDid,
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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
          items: expect.arrayContaining([]),
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`,
            ),
            last: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=`,
            ),
            next: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=`,
            ),
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`,
            ),
          }),
          pageSize: expect.any(Number),
          self: expect.stringContaining(
            `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes?page[after]=1&page[size]=10`,
          ),
          total: expect.any(Number),
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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

      attributeId = responseAttributes.body.items[0]!.id;
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}`,
      );
      expect(response.body).toStrictEqual({
        attribute: {
          body: expect.any(String),
          hash: attributeId,
          issuerType: expect.any(String),
          rootTao: expect.any(String),
          tao: expect.any(String),
        },
        did: lastExistingIssuerDid,
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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

      const attributeId2 = responseAttributes.body.items[0]!.id;

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

      attributeId = responseAttributes.body.items[0]!.id;
    });

    it("should return revisions", async () => {
      expect.assertions(2);

      const urlPath = `/trusted-issuers-registry/v5/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`;

      const response = await request(server).get(
        `/issuers/${lastExistingIssuerDid}/attributes/${attributeId}/revisions`,
      );
      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([]),
        links: {
          first: expect.stringContaining(urlPath),
          last: expect.stringContaining(urlPath),
          next: expect.stringContaining(urlPath),
          prev: expect.stringContaining(urlPath),
        },
        pageSize: expect.any(Number),
        self: expect.stringContaining(urlPath),
        total: expect.any(Number),
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
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

      const attributeId2 = responseAttributes.body.items[0]!.id;

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
                `/trusted-issuers-registry/v5/issuers/${testIssuerWithProxyDid}/proxies/0x`,
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
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/issuers/{did}/proxies/{proxyId}", () => {
    it("should return the proxy from a specific issuer", async () => {
      expect.assertions(2);

      const response: SupertestIssuerProxyResponse = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}`,
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
        `/issuers/not-a-did/proxies/${testIssuerWithProxyFirstProxyId}`,
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
        `/issuers/did:ebsi:z1234/proxies/${testIssuerWithProxyFirstProxyId}`,
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
        `/issuers/${randomDid}/proxies/${testIssuerWithProxyFirstProxyId}`,
      );

      expect(response.body).toStrictEqual({
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the proxy is not found", async () => {
      expect.assertions(2);

      const invalidProxyId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${invalidProxyId}`,
      );

      expect(response.body).toStrictEqual({
        detail: `Proxy ${invalidProxyId} of issuer ${testIssuerWithProxyDid} can't be found`,
        status: 404,
        title: "Proxy Not Found",
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
      const mockServer = setupServer();

      beforeAll(async () => {
        // Intercept network requests
        mockServer.listen({
          onUnhandledRequest: "bypass",
        });

        // Get first proxy information
        const response: SupertestIssuerProxyResponse = await request(
          server,
        ).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}`,
        );
        proxy = response.body;
      });

      afterEach(() => {
        mockServer.resetHandlers();
      });

      afterAll(() => {
        mockServer.close();
      });

      it.each(["URL", "EBSI URI"] as const)(
        "should return a StatusList2021Credential JWT (using %s as resource locator)",
        async (uriType) => {
          expect.assertions(2);

          // Mock issuer's endpoint response
          const authority = configService
            .get<string>("domain")
            .replace(/^https?:\/\//, "");

          const testIssuerWithProxy = getEbsiIssuer(
            testIssuerWithProxyPrivateKey,
            testIssuerWithProxyDid,
            testIssuerWithProxyKid,
          );

          const trustedHostnames = configService.get("trustedHostnames", {
            infer: true,
          });
          const statusList2021CredentialJwt =
            await createStatusList2021CredentialJwt(
              testIssuerWithProxy,
              proxy,
              {
                hosts: [authority, ...trustedHostnames],
                network: configService.get("network", { infer: true }),
                services: {
                  "did-registry": "v5",
                  "trusted-issuers-registry": "v5",
                  "trusted-policies-registry": "v3",
                  "trusted-schemas-registry": "v3",
                },
              },
              uriType,
            );

          mockServer.use(
            http.get(escapeDid(`${proxy.prefix}${path}`), () =>
              HttpResponse.json(statusList2021CredentialJwt),
            ),
          );

          const response: SupertestStringResponse = await request(server).get(
            `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`,
          );

          expect(response.text).toStrictEqual(statusList2021CredentialJwt);
          expect(response.status).toBe(200);
        },
      );

      it("should return an error 500 when the Trusted Issuer's endpoint respond with a 500", async () => {
        expect.assertions(2);

        // Mock issuer's endpoint response
        mockServer.use(
          http.get(
            escapeDid(`${proxy.prefix}${path}`),
            () => new HttpResponse(undefined, { status: 500 }),
          ),
        );

        const response = await request(server).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`,
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
          http.get(escapeDid(`${proxy.prefix}${path}`), () =>
            HttpResponse.text("invalid jwt"),
          ),
        );

        const response = await request(server).get(
          `/issuers/${testIssuerWithProxyDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`,
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
        `/issuers/not-a-did/proxies/${testIssuerWithProxyFirstProxyId}${path}`,
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
        `/issuers/did:ebsi:z1234/proxies/${testIssuerWithProxyFirstProxyId}${path}`,
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
        `/issuers/${randomDid}/proxies/${testIssuerWithProxyFirstProxyId}${path}`,
      );

      expect(response.body).toStrictEqual({
        detail: `Issuer ${randomDid} not found`,
        status: 404,
        title: "Issuer Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the proxy is not found", async () => {
      expect.assertions(2);

      const invalidProxyId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/issuers/${testIssuerWithProxyDid}/proxies/${invalidProxyId}${path}`,
      );

      expect(response.body).toStrictEqual({
        detail: `Proxy ${invalidProxyId} of issuer ${testIssuerWithProxyDid} can't be found`,
        status: 404,
        title: "Proxy Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
