import request from "supertest";
import axios from "axios";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ethers } from "ethers";
import crypto from "crypto";
import { FastifyInstance } from "fastify";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";

import JsonRpcModule from "./jsonrpc.module";
import JsonRpcResponseObject from "./types/jsonrpc.interface";
import AllExceptionsFilter from "../../filters/http-exception.filter";
import mockTirContract from "../../../tests/mockTirContract";
import { ledgerWorking } from "../../../tests/mockAxios";
import { unsignedTransactionEthers } from "./jsonrpc.formatter";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

jest.setTimeout(20000);
jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("appController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [JsonRpcModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`calls /jsonrpc for insertIssuer and sendTransaction`, async () => {
    expect.assertions(4);
    const wallet = new ethers.Wallet(
      "0xf327a0b21cc9c380cbd3fdb6841b3f6a2be13ad864fc1b1acdd6863b8d45d964"
    );
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
        value: "0x0",
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
    const responseSend = await request(app.getHttpServer())
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
  });

  it(`accepts a /jsonrpc call without id`, async () => {
    expect.assertions(2);
    const wallet = ethers.Wallet.createRandom();
    const did = `did:ebsi:test-${new Date().toISOString()}`;
    const attributeData = {};

    const responseBuild = await request(app.getHttpServer())
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
        // no id defined
      });

    expect(responseBuild.body).toStrictEqual({
      jsonrpc: "2.0",
      id: null,
      result: expect.objectContaining({}) as unknown,
    });
    expect(responseBuild.status).toBe(200);
  });

  it(`throws invalid request error for bad use of insertIssuer`, async () => {
    expect.assertions(4);

    // No attributeData defined
    const response1 = await request(app.getHttpServer())
      .post("/trusted-issuers-registry/v2/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertIssuer",
        params: [
          {
            from: "0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
            issuer: {
              did: "did:ebsi:0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
            },
          },
        ],
        id: 231,
      });

    expect(response1.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 231,
      error: {
        code: -32600,
        message: expect.stringContaining(
          "params[0].issuer.attributeData has failed"
        ) as string,
      },
    });
    expect(response1.status).toBe(400);

    // bad address
    const response2 = await request(app.getHttpServer())
      .post("/trusted-issuers-registry/v2/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertIssuer",
        params: [
          {
            from: "bad address",
            issuer: {
              did: "did:ebsi:0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
              attributeData: { data: "123" },
            },
          },
        ],
        id: 231,
      });

    expect(response2.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 231,
      error: {
        code: -32600,
        message: expect.stringContaining(
          "network does not support ENS"
        ) as string,
      },
    });
    expect(response2.status).toBe(400);
  });

  it(`throws invalid request error for bad method`, async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer())
      .post("/trusted-issuers-registry/v2/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "unknown-method",
        params: [],
        id: 123,
      });

    expect(response.body).toStrictEqual({
      jsonrpc: "2.0",
      id: 123,
      error: {
        code: -32600,
        message: expect.stringContaining(
          "The method 'unknown-method' is invalid"
        ) as string,
      },
    });
    expect(response.status).toBe(400);
  });

  it(`throws bad request for bad json rpc call`, async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer())
      .post("/trusted-issuers-registry/v2/jsonrpc")
      .send();

    expect(response.body).toStrictEqual({
      title: "Bad Request",
      status: 400,
      detail:
        '["jsonrpc must be equal to 2.0","method must be a string","params must be an array"]',
      type: "about:blank",
    });
    expect(response.status).toBe(400);
  });
});
