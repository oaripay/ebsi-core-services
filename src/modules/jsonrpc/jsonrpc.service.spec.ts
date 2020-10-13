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
import { mockTirContract } from "../../../tests/mockTirContract";

import {
  ledgerWorking,
  ledgerBadRequest,
  sessionsWorkingBesuBadRequest,
  sessionsWorkingBesuError,
  sessionsWorkingBesuUnexpectedError,
} from "../../../tests/mockAxios";

jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("JsonRpcService", () => {
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

  it(`Throws error the service cannot create a new session with ledger api`, async () => {
    expect.assertions(1);
    jest.spyOn(axios, "post").mockImplementation(ledgerBadRequest);
    await expect(jsonRpcService.createSession()).rejects.toThrow(
      "A new session with ledger api could not be established"
    );
  });

  it(`Parses the error from axios when calling besu`, async () => {
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
});
