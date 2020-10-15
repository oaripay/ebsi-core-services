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
  IssuersListResponseObject,
  IssuerResponseObject,
} from "../../src/modules/issuers/types/issuers.interface";
import JsonRpcResponseObject from "../../src/modules/jsonrpc/types/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface SupertestIssuersResponse {
  status: number;
  body: IssuersListResponseObject;
}

interface SupertestIssuerResponse {
  status: number;
  body: IssuerResponseObject;
}

interface SupertestAttributesResponse {
  status: number;
  body: AttributeObject[];
}

interface SupertestAttributeResponse {
  status: number;
  body: AttributeObject;
}

jest.setTimeout(60000);

describe("Issuers (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

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
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;
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
            "/trusted-issuers-registry/v2/issuers"
          ) as string,
          items: expect.arrayContaining([]) as string[],
          total: expect.any(Number) as number,
          pageSize: expect.any(Number) as number,
          links: expect.objectContaining({
            first: expect.stringContaining(
              "/trusted-issuers-registry/v2/issuers"
            ) as string,
            prev: expect.stringContaining(
              "/trusted-issuers-registry/v2/issuers"
            ) as string,
            next: expect.stringContaining(
              "/trusted-issuers-registry/v2/issuers"
            ) as string,
            last: expect.stringContaining(
              "/trusted-issuers-registry/v2/issuers"
            ) as string,
          }) as IssuersListResponseObject["links"],
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe("/issuers/{did}", () => {
    it("should return a specific issuer", async () => {
      expect.assertions(3);
      const issuers: SupertestIssuersResponse = await request(server).get(
        "/issuers"
      );
      expect(issuers.status).toBe(200);
      const did: string = issuers.body.items[issuers.body.items.length - 1];

      const response: SupertestIssuerResponse = await request(server).get(
        `/issuers/${did}`
      );
      expect(response.body).toStrictEqual({
        did: did.toLowerCase(),
        attributes: expect.arrayContaining([]) as unknown[],
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the issuer is not found", async () => {
      expect.assertions(2);
      const response = await request(server).get("/issuers/unknown-issuer");
      expect(response.body).toStrictEqual({
        title: "Issuer Not Found",
        status: 404,
        detail: "Issuer unknown-issuer not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  it("should insert and get a new issuer", async () => {
    expect.assertions(7);

    const prefixWith0x = (key: string): string =>
      key.startsWith("0x") ? key : `0x${key}`;
    const { adminTestPrivateKey } = loadConfig();
    const wallet = new ethers.Wallet(prefixWith0x(adminTestPrivateKey));

    const did = `did:ebsi:test-${new Date().toISOString()}`;
    const json = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };
    const data = Buffer.from(JSON.stringify(json));
    const dataBase64 = data.toString("base64");
    const dataHash = ethers.utils.keccak256(data);
    const attribute = {
      body: dataBase64,
      hash: dataHash,
    };

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertIssuer",
        params: [
          {
            from: wallet.address,
            did,
            attribute,
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

    // get issuer
    const responseIssuer: SupertestIssuerResponse = await request(server).get(
      `/issuers/${did}`
    );

    expect(responseIssuer.body).toStrictEqual({
      did: did.toLowerCase(),
      attributes: [attribute],
    });
    expect(responseIssuer.status).toBe(200);
  });

  describe("/issuers/{did}/attributes", () => {
    it("should return the attributes from a specific issuer", async () => {
      expect.assertions(3);

      const issuers: SupertestIssuersResponse = await request(server).get(
        `/issuers`
      );

      expect(issuers.status).toBe(200);

      const did: string = issuers.body.items[issuers.body.items.length - 1];
      const response: SupertestAttributesResponse = await request(server).get(
        `/issuers/${did}/attributes`
      );

      expect(response.body).toStrictEqual([
        {
          body: expect.any(String) as string,
          hash: expect.any(String) as string,
        },
      ]);
      expect(response.status).toBe(200);
    });
  });

  describe("/issuers/{did}/attributes/{attributeId}", () => {
    it("should return a specific attribute", async () => {
      expect.assertions(4);
      const issuers: SupertestIssuersResponse = await request(server).get(
        `/issuers`
      );
      expect(issuers.status).toBe(200);
      const did: string = issuers.body.items[issuers.body.items.length - 1];

      const responseAttributes: SupertestAttributesResponse = await request(
        server
      ).get(`/issuers/${did}/attributes`);
      expect(responseAttributes.status).toBe(200);

      const attributeId = responseAttributes.body[0].hash;

      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${did}/attributes/${attributeId}`
      );
      expect(response.body).toStrictEqual({
        body: expect.any(String) as string,
        hash: expect.any(String) as string,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error when attribute is not found", async () => {
      expect.assertions(8);

      const issuers: SupertestIssuersResponse = await request(server).get(
        "/issuers"
      );
      expect(issuers.status).toBe(200);

      const did: string = issuers.body.items[issuers.body.items.length - 1];

      // consult a random attribute
      const attributeId =
        "0x31a014c390aa9ad2b47a1df8904c8addf87db279b06eae50797f546da63229d2";

      const response: SupertestAttributeResponse = await request(server).get(
        `/issuers/${did}/attributes/${attributeId}`
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
        `/issuers/did:ebsi:unknown/attributes/${attributeId}`
      );
      expect(response2.body).toStrictEqual({
        detail: expect.stringContaining(
          `Issuer did:ebsi:unknown not found`
        ) as string,
        status: 404,
        title: "Issuer Not Found",
        type: "about:blank",
      });
      expect(response2.status).toBe(404);

      // consult an attribute from a different did
      const did2: string = issuers.body.items[issuers.body.items.length - 2];
      const responseAttributes: SupertestAttributesResponse = await request(
        server
      ).get(`/issuers/${did2}/attributes`);
      expect(responseAttributes.status).toBe(200);

      const attributeId2 = responseAttributes.body[0].hash;

      const response3: SupertestAttributeResponse = await request(server).get(
        `/issuers/${did}/attributes/${attributeId2}`
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
});
