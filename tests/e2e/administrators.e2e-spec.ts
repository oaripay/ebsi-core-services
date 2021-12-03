import request from "supertest";
import crypto from "crypto";
import { ethers } from "ethers";
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
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { ApiConfig } from "../../src/config/configuration";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import {
  AttributeObject,
  IdLink,
  DidLink,
  AdministratorResponseObject,
} from "../../src/modules/administrators/administrators.interface";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import { prefixWith0x } from "../../src/shared/utils";
import { PaginatedList } from "../../src/shared/interfaces";
import { requestSiopJwt } from "../utils/siopJwt";
import { LedgerService } from "../../src/shared/services/ledger.service";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface SupertestAdministratorsResponse {
  status: number;
  body: PaginatedList<DidLink>;
}

interface SupertestAdministratorResponse {
  status: number;
  body: AdministratorResponseObject;
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

interface AttributeObjectWithData extends AttributeObject {
  data: string;
}

describe("Administrators (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let configService: ConfigService<ApiConfig>;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;
  let ledgerService: LedgerService;
  const randomDid = EbsiWallet.createDid();

  const createAdministrator = () => {
    const did = EbsiWallet.createDid();
    const json = {
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 4e8).toISOString(),
    };
    const data = Buffer.from(JSON.stringify(json));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.sha256(data).slice(2);
    const attribute: AttributeObjectWithData = {
      body: dataBase64,
      hash: dataHash,
      data: `0x${data.toString("hex")}`,
    };

    return { did, attribute };
  };
  const newAdministrator = createAdministrator();
  const { attribute: attribute1 } = createAdministrator();
  const { attribute: attribute2 } = createAdministrator();
  const { attribute: attribute3 } = createAdministrator();

  let lastExistingAdminDid: string;
  let beforeLastExistingAdminDid: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    ledgerService = moduleFixture.get<LedgerService>(LedgerService);

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    // Generate a valid Client JWT (SIOP) for the tests
    const didRegistry = `${configService.get<string>(
      "didRegistryApiUrl"
    )}/identifiers`;

    testUserAccessToken = await requestSiopJwt({
      didRegistry,
      clientDid: configService.get<string>("testAdminDid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
    });

    // Get last 2 admins DID
    let administratorsResponse: SupertestAdministratorsResponse = await request(
      server
    )
      .get("/administrators")
      .auth(testUserAccessToken, { type: "bearer" });

    // Go to last page (where there is at least 2 admins)
    const { total } = administratorsResponse.body;
    administratorsResponse = await request(server)
      .get(`/administrators?page[after]=${Math.floor(total / 2)}&page[size]=2`)
      .auth(testUserAccessToken, { type: "bearer" });

    beforeLastExistingAdminDid = administratorsResponse.body.items[0].did;
    lastExistingAdminDid = administratorsResponse.body.items[1].did;
  });

  describe("/administrators", () => {
    it("should return a collection of administrators", async () => {
      expect.assertions(2);
      const response: SupertestAdministratorsResponse = await request(server)
        .get("/administrators")
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-issuers-registry/v2/administrators?page[after]=1&page[size]=10"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators?page[after]=1&page[size]=10"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators?page[after]=1&page[size]=10"
            ) as string,
            next: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators?page[after]="
            ) as string,
            last: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators?page[after]="
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/administrators/{did}", () => {
    it("should return a specific administrator", async () => {
      expect.assertions(2);

      const response: SupertestAdministratorResponse = await request(server)
        .get(`/administrators/${lastExistingAdminDid}`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        did: lastExistingAdminDid,
        attributes: expect.arrayContaining([]) as unknown[],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/not-a-did")
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/did:ebsi:z1234")
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/administrators/{did}/attributes", () => {
    it("should return the attributes from a specific administrator", async () => {
      expect.assertions(2);

      const response: SupertestAdministratorsResponse = await request(server)
        .get(`/administrators/${lastExistingAdminDid}/attributes`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-issuers-registry/v2/administrators/${lastExistingAdminDid}/attributes?page[after]=1&page[size]=10`
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${lastExistingAdminDid}/attributes?page[after]=1&page[size]=10`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${lastExistingAdminDid}/attributes?page[after]=1&page[size]=10`
            ) as string,
            next: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${lastExistingAdminDid}/attributes?page[after]=`
            ) as string,
            last: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${lastExistingAdminDid}/attributes?page[after]=`
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/not-a-did/attributes")
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get("/administrators/did:ebsi:z1234/attributes")
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}/attributes`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/administrators/{did}/attributes/{attributeId}", () => {
    let attributeId: string;
    let attributeId2: string;

    beforeAll(async () => {
      let responseAttributes: SupertestAttributesResponse = await request(
        server
      )
        .get(`/administrators/${lastExistingAdminDid}/attributes`)
        .auth(testUserAccessToken, { type: "bearer" });

      attributeId = responseAttributes.body.items[0].id;

      responseAttributes = await request(server)
        .get(`/administrators/${beforeLastExistingAdminDid}/attributes`)
        .auth(testUserAccessToken, { type: "bearer" });

      attributeId2 = responseAttributes.body.items[0].id;
    });

    it("should return a specific attribute", async () => {
      expect.assertions(2);

      const response: SupertestAttributeResponse = await request(server)
        .get(
          `/administrators/${lastExistingAdminDid}/attributes/${attributeId}`
        )
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        did: lastExistingAdminDid,
        attribute: {
          body: expect.any(String) as string,
          hash: attributeId,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/not-a-did/attributes/${attributeId}`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/did:ebsi:z1234/attributes/${attributeId}`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}/attributes/${attributeId}`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when attribute is not found", async () => {
      expect.assertions(4);

      // consult a random attribute
      const wrongAttributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const response: SupertestAttributeResponse = await request(server)
        .get(
          `/administrators/${lastExistingAdminDid}/attributes/${wrongAttributeId}`
        )
        .auth(testUserAccessToken, { type: "bearer" });

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
      const response2: SupertestAttributeResponse = await request(server)
        .get(
          `/administrators/${lastExistingAdminDid}/attributes/${attributeId2}`
        )
        .auth(testUserAccessToken, { type: "bearer" });

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

  describe("/administrators/{did}/attributes/{attributeId}/revisions", () => {
    let attributeId: string;
    let attributeId2: string;

    beforeAll(async () => {
      let responseAttributes: SupertestAttributesResponse = await request(
        server
      )
        .get(`/administrators/${lastExistingAdminDid}/attributes`)
        .auth(testUserAccessToken, { type: "bearer" });

      attributeId = responseAttributes.body.items[0].id;

      responseAttributes = await request(server)
        .get(`/administrators/${beforeLastExistingAdminDid}/attributes`)
        .auth(testUserAccessToken, { type: "bearer" });

      attributeId2 = responseAttributes.body.items[0].id;
    });

    it("should return revisions", async () => {
      expect.assertions(2);

      const urlPath = `/administrators/${lastExistingAdminDid}/attributes/${attributeId}/revisions`;

      const response = await request(server)
        .get(
          `/administrators/${lastExistingAdminDid}/attributes/${attributeId}/revisions`
        )
        .auth(testUserAccessToken, { type: "bearer" });

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

    it("should throw an error if the administrator DID is not correctly formatted", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/not-a-did/attributes/${attributeId}/revisions`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator DID is not a valid EBSI DID", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(
          `/administrators/did:ebsi:z1234/attributes/${attributeId}/revisions`
        )
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        detail: '["did must be a valid DID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);

      const response = await request(server)
        .get(`/administrators/${randomDid}/attributes/${attributeId}/revisions`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: `Administrator ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error when attribute is not found", async () => {
      expect.assertions(4);

      // consult a random attribute
      const wrongAttributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const response: SupertestAttributeResponse = await request(server)
        .get(
          `/administrators/${lastExistingAdminDid}/attributes/${wrongAttributeId}/revisions`
        )
        .auth(testUserAccessToken, { type: "bearer" });

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
      const response2: SupertestAttributeResponse = await request(server)
        .get(
          `/administrators/${lastExistingAdminDid}/attributes/${attributeId2}/revisions`
        )
        .auth(testUserAccessToken, { type: "bearer" });

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

  describe.each([
    "insertAdministrator",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
  ])("/jsonrpc - method: %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it(`should return a new unsigned transaction`, async () => {
      expect.assertions(2);

      const { did, attribute } = createAdministrator();
      let prevAttributeHash: string = null;
      if (updateAttribute)
        prevAttributeHash =
          "0x9045517cc555c75cd7085900a900e6693439086f9eddeee513271fba278964fe";

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
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
  });

  describe.each([
    "insertAdministrator",
    "updateAdministrator",
    "updateAdministrator(test update attribute)",
  ])("/jsonrpc - send transaction for %s", (testMethod: string) => {
    const updateAttribute = testMethod.includes("(test update attribute)");
    const method = testMethod.replace("(test update attribute)", "");

    it("should insert/update a administrator", async () => {
      expect.assertions(5);

      const { did } = newAdministrator;
      let attribute: AttributeObjectWithData;
      let prevAttributeHash: string = null;
      let expectedAttributes = [];

      switch (method) {
        case "insertAdministrator":
          // create a new administrator and add attribute1
          attribute = attribute1;
          expectedAttributes = [
            {
              body: attribute1.body,
              hash: attribute1.hash,
            },
          ];
          break;
        case "updateAdministrator":
          if (updateAttribute) {
            // update attribute1: change it to attribute3
            attribute = attribute3;
            prevAttributeHash = attribute1.hash;
            expectedAttributes = [
              {
                body: attribute3.body,
                hash: attribute3.hash,
              },
              {
                body: attribute2.body,
                hash: attribute2.hash,
              },
            ];
          } else {
            // updateIssuer: add attribute2
            attribute = attribute2;
            expectedAttributes = [
              {
                body: attribute1.body,
                hash: attribute1.hash,
              },
              {
                body: attribute2.body,
                hash: attribute2.hash,
              },
            ];
          }
          break;
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(testUserAccessToken, { type: "bearer" })
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

      const unsignedTransaction = responseBuild.body.result;
      const uTx = formatEthersUnsignedTransaction(
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await adminTestWallet.signTransaction(uTx);
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
        ledgerService,
        responseSend.body.result as string
      );
      expect(receipt.status).toBe(1);

      // get administrator
      const administratorResponse = await request(server)
        .get(`/administrators/${did}`)
        .auth(testUserAccessToken, { type: "bearer" });

      expect(administratorResponse.body).toStrictEqual({
        did,
        attributes: expectedAttributes,
      });
      expect(administratorResponse.status).toBe(200);
    });
  });
});
