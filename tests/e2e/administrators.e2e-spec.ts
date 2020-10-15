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
import JsonRpcResponseObject from "../../src/modules/jsonrpc/types/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { waitToBeMined } from "../utils/waitToBeMined";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

jest.setTimeout(60000);

describe("Administrators (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;

  const prefixWith0x = (key: string): string =>
    key.startsWith("0x") ? key : `0x${key}`;

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
    const dataHash = ethers.utils.keccak256(data);
    const attribute = {
      body: dataBase64,
      hash: dataHash,
    };

    return { did, attribute };
  };

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

  describe("/jsonrpc - method: insertAdministrator", () => {
    it(`should return a new unsigned transaction`, async () => {
      expect.assertions(2);

      const { did, attribute } = createAdministrator();

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "insertAdministrator",
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
    });
  });

  it("should insert a new administrator", async () => {
    expect.assertions(3);

    const { did, attribute } = createAdministrator();

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .send({
        jsonrpc: "2.0",
        method: "insertAdministrator",
        params: [
          {
            from: wallet.address,
            did,
            attribute,
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

    /*
    // get administrator
    const administratorResponse = await request(server).get(`/administrators/${did}`);

    expect(administratorResponse.body).toStrictEqual({
      did: did.toLowerCase(),
      attributes: [attribute],
    });
    expect(administratorResponse.status).toBe(200);
    */
  });
});
