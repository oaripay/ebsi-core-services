import request from "supertest";
import crypto from "crypto";
import { ethers } from "ethers";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { FastifyInstance } from "fastify";
import { config } from "../src/config/configuration";
import AppModule from "../src/app.module";
import AllExceptionsFilter from "../src/filters/http-exception.filter";
import {
  IssuersListResponseObject,
  IssuerResponseObject,
} from "../src/modules/issuers/types/issuers.interface";
import JsonRpcResponseObject from "../src/modules/jsonrpc/types/jsonrpc.interface";
import { unsignedTransactionEthers } from "../src/modules/jsonrpc/jsonrpc.formatter";

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

const prefixWith0x = (key: string): string =>
  key.startsWith("0x") ? key : `0x${key}`;

const { domain, adminTestPrivateKey } = config();

const callLedger = (method: string, params: unknown[]) => {
  return request(domain).post("/ledger/v1/blockchains/besu").send({
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  });
};

jest.setTimeout(10000);
describe("appController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  it(`(GET) trusted-issuers-registry/v2/health`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/v2/health`
    );
    expect(response.text).toStrictEqual("ok");
    expect(response.status).toBe(200);
  });

  it(`(GET) trusted-issuers-registry/v2/issuers`, async () => {
    expect.assertions(2);
    const response: SupertestIssuersResponse = await request(
      app.getHttpServer()
    ).get(`/trusted-issuers-registry/v2/issuers`);

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        self: expect.stringContaining(
          `/trusted-issuers-registry/v2/issuers`
        ) as string,
        items: expect.arrayContaining([]) as string[],
        total: expect.any(Number) as number,
        pageSize: expect.any(Number) as number,
        links: expect.objectContaining({
          first: expect.stringContaining(
            `/trusted-issuers-registry/v2/issuers`
          ) as string,
          prev: expect.stringContaining(
            `/trusted-issuers-registry/v2/issuers`
          ) as string,
          next: expect.stringContaining(
            `/trusted-issuers-registry/v2/issuers`
          ) as string,
          last: expect.stringContaining(
            `/trusted-issuers-registry/v2/issuers`
          ) as string,
        }) as IssuersListResponseObject["links"],
      })
    );
    expect(response.status).toBe(200);
  });

  it(`gets a specific issuer`, async () => {
    expect.assertions(3);
    const issuers: SupertestIssuersResponse = await request(
      app.getHttpServer()
    ).get(`/trusted-issuers-registry/v2/issuers`);
    expect(issuers.status).toBe(200);
    const did: string = issuers.body.items[issuers.body.items.length - 1];

    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/v2/issuers/${did}`
    );
    expect(response.body).toStrictEqual({
      did: did.toLowerCase(),
      attributes: expect.arrayContaining([]) as unknown[],
    });
    expect(response.status).toBe(200);
  });

  it(`inserts and gets a new issuer`, async () => {
    expect.assertions(7);
    const wallet = new ethers.Wallet(prefixWith0x(adminTestPrivateKey));

    const did = `did:ebsi:test-${new Date().toISOString()}`;
    const attributeData = {
      // any object here
      any: "Any attribute here",
      type: "credential",
      data: crypto.randomBytes(16).toString("hex"),
    };

    const responseBuild: SupertestJsonRpcResponse = await request(
      app.getHttpServer()
    )
      .post("/trusted-issuers-registry/v2/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertIssuer",
        params: [
          {
            from: wallet.address,
            issuer: { did, attributeData },
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
    const uTx = unsignedTransactionEthers(
      JSON.parse(JSON.stringify(unsignedTransaction))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend: SupertestJsonRpcResponse = await request(
      app.getHttpServer()
    )
      .post("/trusted-issuers-registry/v2/jsonrpc")
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
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const responseReceipt: SupertestJsonRpcResponse = await callLedger(
      "eth_getTransactionReceipt",
      [responseSend.body.result]
    );
    expect(responseReceipt.body).toStrictEqual(
      expect.objectContaining({
        result: expect.objectContaining({
          status: "0x1",
        }) as { status: string },
      })
    );

    // get issuer
    const responseIssuer = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/v2/issuers/${did}`
    );

    expect(responseIssuer.body).toStrictEqual({
      did: did.toLowerCase(),
      attributes: [attributeData],
    });
    expect(responseIssuer.status).toBe(200);
  });

  it(`throws error for issuer not found`, async () => {
    expect.assertions(2);
    const response = await request(app.getHttpServer()).get(
      `/trusted-issuers-registry/v2/issuers/unknown-issuer`
    );
    expect(response.body).toStrictEqual({
      title: "Issuer Not Found",
      status: 404,
      detail: "Issuer unknown-issuer not found",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });
});
