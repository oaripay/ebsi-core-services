import request from "supertest";
import crypto from "crypto";
import { ethers } from "ethers";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { loadConfig } from "../../src/config/configuration";
import AppModule from "../../src/app.module";
import AllExceptionsFilter from "../../src/filters/http-exception.filter";
import {
  AttributeObject,
  IdLink,
  DidLink,
  AdministratorResponseObject,
} from "../../src/modules/administrators/administrators.interface";
import JsonRpcResponseObject from "../../src/modules/jsonrpc/types/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import { prefixWith0x } from "../../src/shared/utils";
import { PaginatedList } from "../../src/shared/interfaces";

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

describe("Administrators (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

  const { adminTestPrivateKey } = loadConfig();

  const wallet = new ethers.Wallet(prefixWith0x(adminTestPrivateKey));

  const createAdministrator = () => {
    const did = `did:ebsi:test-${new Date().toISOString()}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.keccak256(data).slice(2);
    const attribute = {
      body: dataBase64,
      hash: dataHash,
    };

    return { did, attribute };
  };
  const newAdministrator = createAdministrator();
  const { attribute: attribute1 } = createAdministrator();
  const { attribute: attribute2 } = createAdministrator();
  const { attribute: attribute3 } = createAdministrator();

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
  });

  describe("/administrators", () => {
    it("should return a collection of administrators", async () => {
      expect.assertions(2);
      const response: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            "/trusted-issuers-registry/v2/administrators"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators"
            ) as string,
            next: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators"
            ) as string,
            last: expect.stringContaining(
              "/trusted-issuers-registry/v2/administrators"
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/administrators/{did}", () => {
    it("should return a specific administrator", async () => {
      expect.assertions(3);
      const administratorsResponse: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(administratorsResponse.status).toBe(200);
      const { did }: DidLink = administratorsResponse.body.items[
        administratorsResponse.body.items.length - 1
      ];

      const response: SupertestAdministratorResponse = await request(
        server
      ).get(`/administrators/${did}`);
      expect(response.body).toStrictEqual({
        did: did.toLowerCase(),
        attributes: expect.arrayContaining([]) as unknown[],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the administrator is not found", async () => {
      expect.assertions(2);
      const response = await request(server).get(
        "/administrators/unknown-administrator"
      );
      expect(response.body).toStrictEqual({
        title: "Administrator Not Found",
        status: 404,
        detail: "Administrator unknown-administrator not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("/administrators/{did}/attributes", () => {
    it("should return the attributes from a specific administrator", async () => {
      expect.assertions(3);

      const administrators: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(administrators.status).toBe(200);

      const { did }: DidLink = administrators.body.items[
        administrators.body.items.length - 1
      ];
      const response: SupertestAdministratorsResponse = await request(
        server
      ).get(`/administrators/${did}/attributes`);

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          self: expect.stringContaining(
            `/trusted-issuers-registry/v2/administrators/${did}/attributes`
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${did}/attributes`
            ) as string,
            prev: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${did}/attributes`
            ) as string,
            next: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${did}/attributes`
            ) as string,
            last: expect.stringContaining(
              `/trusted-issuers-registry/v2/administrators/${did}/attributes`
            ) as string,
          }) as PaginatedList<IdLink>["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/administrators/{did}/attributes/{attributeId}", () => {
    it("should return a specific attribute", async () => {
      expect.assertions(4);

      const administrators: SupertestAdministratorsResponse = await request(
        server
      ).get(`/administrators`);

      expect(administrators.status).toBe(200);

      const { did }: DidLink = administrators.body.items[
        administrators.body.items.length - 1
      ];
      const responseAttributes: SupertestAttributesResponse = await request(
        server
      ).get(`/administrators/${did}/attributes`);

      expect(responseAttributes.status).toBe(200);

      const attributeId = responseAttributes.body.items[0].id;
      const response: SupertestAttributeResponse = await request(server).get(
        `/administrators/${did}/attributes/${attributeId}`
      );

      expect(response.body).toStrictEqual({
        did,
        attribute: {
          body: expect.any(String) as string,
          hash: attributeId,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error when attribute is not found", async () => {
      expect.assertions(8);

      const administrators: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(administrators.status).toBe(200);

      const { did }: DidLink = administrators.body.items[
        administrators.body.items.length - 1
      ];

      // consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";
      const response: SupertestAttributeResponse = await request(server).get(
        `/administrators/${did}/attributes/${attributeId}`
      );

      expect(response.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);

      // consult an attribute from a random did
      const response2 = await request(server).get(
        `/administrators/did:ebsi:unknown/attributes/${attributeId}`
      );

      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          "Administrator did:ebsi:unknown not found"
        ) as string,
        status: 404,
        title: "Administrator Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);

      // consult an attribute from a different did
      const { did: did2 }: DidLink = administrators.body.items[
        administrators.body.items.length - 2
      ];
      const responseAttributes: SupertestAttributesResponse = await request(
        server
      ).get(`/administrators/${did2}/attributes`);

      expect(responseAttributes.status).toBe(200);

      const attributeId2 = responseAttributes.body.items[0].id;
      const response3: SupertestAttributeResponse = await request(server).get(
        `/administrators/${did}/attributes/${attributeId2}`
      );

      expect(response3.body).toStrictEqual({
        detail: expect.stringContaining(
          `Attribute ${attributeId2} not found`
        ) as string,
        status: 404,
        title: "Attribute Not Found",
        type: "about:blank",
      });
      expect(response3.status).toBe(404);
    });
  });

  describe("/administrators/{did}/attributes/{attributeId}/revisions", () => {
    it("should return revisions", async () => {
      expect.assertions(4);

      const administrators: SupertestAdministratorsResponse = await request(
        server
      ).get("/administrators");

      expect(administrators.status).toBe(200);

      const { did }: DidLink = administrators.body.items[
        administrators.body.items.length - 1
      ];

      const administratorResponse: SupertestAdministratorResponse = await request(
        server
      ).get(`/administrators/${did}`);

      expect(administratorResponse.status).toBe(200);

      const attributeId = administratorResponse.body.attributes[0].hash;
      const urlPath = `/administrators/${did}/attributes/${attributeId}/revisions`;

      const response = await request(server).get(
        `/administrators/${did}/attributes/${attributeId}/revisions`
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
        .send({
          jsonrpc: "2.0",
          method,
          params: [
            {
              from: wallet.address,
              did,
              attribute,
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
          from: wallet.address,
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

    it("should insert a new administrator", async () => {
      expect.assertions(5);

      const { did } = newAdministrator;
      let attribute: AttributeObject;
      let prevAttributeHash: string = null;
      let expectedAttributes = [];

      switch (method) {
        case "insertAdministrator":
          // create a new administrator and add attribute1
          attribute = attribute1;
          expectedAttributes = [attribute1];
          break;
        case "updateAdministrator":
          if (updateAttribute) {
            // update attribute1: change it to attribute3
            attribute = attribute3;
            prevAttributeHash = attribute1.hash;
            expectedAttributes = [attribute3, attribute2];
          } else {
            // updateIssuer: add attribute2
            attribute = attribute2;
            expectedAttributes = [attribute1, attribute2];
          }
          break;
        default:
          break;
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method,
          params: [
            {
              from: wallet.address,
              did,
              attribute,
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
      const sgnTx = await wallet.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
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
      const receipt = await waitToBeMined(responseSend.body.result as string);
      expect(receipt.status).toBe("0x1");

      // get administrator
      const administratorResponse = await request(server).get(
        `/administrators/${did}`
      );

      expect(administratorResponse.body).toStrictEqual({
        did: did.toLowerCase(),
        attributes: expectedAttributes,
      });
      expect(administratorResponse.status).toBe(200);
    });
  });
});
