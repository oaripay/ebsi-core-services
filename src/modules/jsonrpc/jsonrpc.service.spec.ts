import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ethers } from "ethers";
import axios from "axios";
import JsonRpcService from "./jsonrpc.service";
import AppModule from "../../app.module";
import { mockTirContract } from "../../../tests/utils/mockTirContract";
import {
  ledgerWorking,
  ledgerBadRequest,
  sessionsWorkingBesuBadRequest,
  sessionsWorkingBesuError,
  sessionsWorkingBesuUnexpectedError,
} from "../../../tests/utils/mockAxios";

jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("JsonRpcService", () => {
  let jsonRpcService: JsonRpcService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Turn off logger
    Logger.overrideLogger(false);

    jsonRpcService = moduleFixture.get<JsonRpcService>(JsonRpcService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, "post").mockImplementation(ledgerWorking);
  });

  it(`Throws error if the service cannot create a new session with ledger api`, async () => {
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
