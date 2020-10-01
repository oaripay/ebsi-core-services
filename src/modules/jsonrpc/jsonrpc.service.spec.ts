import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ethers } from "ethers";
import axios from "axios";
import { FastifyInstance } from "fastify";
import JsonRpcService from "./jsonrpc.service";
import AppModule from "../../app.module";
import mockTirContract from "../../../tests/mockTirContract";
import RequestInsertIssuerDto from "./dto/insertIssuer/request-insert-issuer.dto";
import TrustedIssuersRegistry from "../../contracts/TrustedIssuerRegistry.json";
import { unsignedTransactionEthers } from "./jsonrpc.formatter";
import { config } from "../../config/configuration";

import {
  ledgerWorking,
  ledgerBadRequest,
  sessionsWorkingBesuBadRequest,
  sessionsWorkingBesuError,
  sessionsWorkingBesuUnexpectedError,
} from "../../../tests/mockAxios";

jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("jsonRpcService", () => {
  let app: INestApplication;
  let jsonRpcService: JsonRpcService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
  });

  afterAll(async () => {
    await app.close();
  });

  it(`throws error the service cannot create a new session with ledger api`, async () => {
    expect.assertions(1);
    jest.spyOn(axios, "post").mockImplementation(ledgerBadRequest);
    await expect(jsonRpcService.createSession()).rejects.toThrow(
      "A new session with ledger api could not be established"
    );
  });

  it(`parses the error from axios when calling besu`, async () => {
    expect.assertions(3);
    jest.spyOn(axios, "post").mockImplementation(sessionsWorkingBesuBadRequest);
    await expect(
      jsonRpcService.callBesuAuth("eth_sendRawTransaction", [""])
    ).rejects.toThrow(
      '{"title":"Bad Request","status":400,"type":"about:blank","detail":"detail from bad request"}'
    );

    jest.spyOn(axios, "post").mockImplementation(sessionsWorkingBesuError);
    await expect(
      jsonRpcService.callBesuAuth("eth_sendRawTransaction", [""])
    ).rejects.toThrow("text error no object");

    jest
      .spyOn(axios, "post")
      .mockImplementation(sessionsWorkingBesuUnexpectedError);
    await expect(
      jsonRpcService.callBesuAuth("eth_sendRawTransaction", [""])
    ).rejects.toThrow("Unexpected error");
  });

  it("builds a transaction for insertIssuer", async () => {
    expect.assertions(1);
    const transaction = await jsonRpcService.buildTransactionInsertIssuer(
      {
        params: [
          {
            from: "0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
            issuer: {
              did: "did:ebsi:0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
              attributeData: {
                any: "Any attribute here",
                type: "credential",
                data: "123",
              },
            },
          },
        ],
      },
      1
    );
    expect(transaction).toStrictEqual({
      chainId: expect.any(String) as string,
      data: expect.any(String) as string,
      from: "0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
      gasLimit: expect.any(String) as string,
      gasPrice: "0x0",
      nonce: expect.any(String) as string,
      to: expect.any(String) as string,
      value: "0x0",
    });
  });

  it("throws error for bad request for insertIssuer", async () => {
    expect.assertions(2);
    const request1 = {
      params: [
        {
          from: "0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
          issuer: {
            // no attributeData present
            did: "did:ebsi:0xde020FB144Bc3239C1446EB9dE73706A47D5929b",
          },
        },
      ],
    } as RequestInsertIssuerDto;

    await expect(
      jsonRpcService.buildTransactionInsertIssuer(request1, 1)
    ).rejects.toThrow("params[0].issuer.attributeData has failed");

    const request2 = {
      params: [
        {
          from: "0xde020F44Bc3239C1446EB9dE73706A47D5929b",
          issuer: {
            // no did present
            attributeData: {
              data: "123",
            },
          },
        },
      ],
    } as RequestInsertIssuerDto;

    await expect(
      jsonRpcService.buildTransactionInsertIssuer(request2, 1)
    ).rejects.toThrow("params[0].issuer.did has failed");
  });

  it("throws error when unsignedTransaction has been tampered", async () => {
    expect.assertions(2);
    const wallet1 = ethers.Wallet.createRandom();
    const wallet2 = ethers.Wallet.createRandom();
    const transaction1 = await jsonRpcService.buildTransactionInsertIssuer(
      {
        params: [
          {
            from: wallet1.address,
            issuer: {
              did: "did:ebsi:1",
              attributeData: {},
            },
          },
        ],
      },
      1
    );
    const transaction2 = await jsonRpcService.buildTransactionInsertIssuer(
      {
        params: [
          {
            from: wallet2.address,
            issuer: {
              did: "did:ebsi:2",
              attributeData: {},
            },
          },
        ],
      },
      1
    );

    const uTx = unsignedTransactionEthers(
      JSON.parse(JSON.stringify(transaction1))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet1.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    // tampering signatures
    await expect(
      jsonRpcService.sendTransaction(
        {
          params: [
            {
              protocol: "eth",
              // we send transaction2 instead of transaction1
              unsignedTransaction: transaction2,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
        },
        1
      )
    ).rejects.toThrow("does not match with the signedRawTransaction");

    // tampering "from"
    transaction1.from = transaction2.from;
    await expect(
      jsonRpcService.sendTransaction(
        {
          params: [
            {
              protocol: "eth",
              // we send transaction2 instead of transaction1
              unsignedTransaction: transaction1,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
        },
        1
      )
    ).rejects.toThrow("does not match with unsignedTransaction.from");
  });

  it("throws error when sendTransaction is trying to use an invalid function", async () => {
    expect.assertions(1);
    const wallet = ethers.Wallet.createRandom();
    const tirInterface = new ethers.utils.Interface(TrustedIssuersRegistry.abi);
    const transaction = {
      from: wallet.address,
      to: config().besuTrustedIssuersRegistryAddress,
      data: tirInterface.encodeFunctionData("getIssuer", ["did"]),
      value: "0x00",
      nonce: "0x00",
      chainId: "0x1b3b",
      gasLimit: "0x1000000",
      gasPrice: "0x00",
    };

    const uTx = unsignedTransactionEthers(
      JSON.parse(JSON.stringify(transaction))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    await expect(
      jsonRpcService.sendTransaction(
        {
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
        },
        1
      )
    ).rejects.toThrow(
      "The function name getIssuer can not be used in this context"
    );
  });

  it("throws error when the sender of a transaction is not in the TIR", async () => {
    expect.assertions(1);
    const wallet = ethers.Wallet.createRandom();
    const transaction = await jsonRpcService.buildTransactionInsertIssuer(
      {
        params: [
          {
            from: wallet.address, // this address is not in the TIR
            issuer: {
              did: "did:ebsi:1",
              attributeData: {},
            },
          },
        ],
      },
      1
    );

    const uTx = unsignedTransactionEthers(
      JSON.parse(JSON.stringify(transaction))
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    await expect(
      jsonRpcService.sendTransaction(
        {
          params: [
            {
              protocol: "eth",
              unsignedTransaction: transaction,
              r,
              s,
              v: `0x${Number(v).toString(16)}`,
              signedRawTransaction: sgnTx,
            },
          ],
        },
        1
      )
    ).rejects.toThrow(
      `Issuer did:ebsi:${wallet.address.toLowerCase()} was not found in the Trusted Issuer Registry`
    );
  });
});
