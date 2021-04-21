import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import axios from "axios";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { JsonRpcService } from "./jsonrpc.service";
import { JsonRpcResponseObject } from "./jsonrpc.interface";
import { AppModule } from "../../app.module";
import { Tar, Tar__factory } from "../../contracts";

interface AxiosResponseSessions {
  status: number;
  data: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    issuedAt: number;
  };
}

interface AxiosResponseJsonRpc {
  status: number;
  data: JsonRpcResponseObject;
}

interface AxiosErrorResponse {
  message: string;
  response: {
    status: number;
    data: unknown;
  };
}

function accessToken() {
  const nowMs = Date.now();
  const now = nowMs - (nowMs % 1000);
  return Promise.resolve({
    status: 200,
    data: {
      accessToken: "jwt",
      tokenType: "Bearer",
      expiresIn: 900,
      issuedAt: now,
    },
  });
}

// Note: make sure the TAR contract is not called
jest
  .spyOn(Tar__factory, "connect")
  .mockImplementation((() => {}) as jest.Mock<Tar>);

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
    jest.spyOn(axios, "post").mockImplementation(
      (url: string): Promise<AxiosResponseJsonRpc | AxiosResponseSessions> => {
        // sessions
        if (url.includes("/sessions")) return accessToken();

        // call to besu
        return Promise.resolve({
          status: 200,
          data: {
            result: "0x1",
            jsonrpc: "2.0",
            id: 1,
          },
        });
      }
    );
  });

  it(`Parses the error from axios when calling besu`, async () => {
    expect.assertions(3);
    jest.spyOn(axios, "post").mockImplementation(
      (url: string): Promise<AxiosErrorResponse | AxiosResponseSessions> => {
        // sessions
        if (url.includes("/sessions")) return accessToken();

        // call to besu
        const httpError = new BadRequestError("Bad Request", {
          detail: "detail from bad request",
        });
        const error: unknown = new Error("HTTP 400");
        (error as AxiosErrorResponse).response = {
          status: httpError.status,
          data: httpError.toJSON(),
        };
        return Promise.reject(error);
      }
    );
    await expect(
      jsonRpcService.callBesuAuth("eth_sendRawTransaction", [""])
    ).rejects.toThrow(
      '{"title":"Bad Request","status":400,"type":"about:blank","detail":"detail from bad request"}'
    );

    jest.spyOn(axios, "post").mockImplementation(
      (url: string): Promise<AxiosErrorResponse | AxiosResponseSessions> => {
        // sessions
        if (url.includes("/sessions")) return accessToken();

        // call to besu
        const error: unknown = new Error("HTTP 400");
        (error as AxiosErrorResponse).response = {
          status: 400,
          data: "text error no object",
        };
        return Promise.reject(error);
      }
    );
    await expect(
      jsonRpcService.callBesuAuth("eth_sendRawTransaction", [""])
    ).rejects.toThrow("text error no object");

    jest.spyOn(axios, "post").mockImplementation(
      (url: string): Promise<Error | AxiosResponseSessions> => {
        // sessions
        if (url.includes("/sessions")) return accessToken();

        // call to besu
        return Promise.reject(new Error("Unexpected error"));
      }
    );
    await expect(
      jsonRpcService.callBesuAuth("eth_sendRawTransaction", [""])
    ).rejects.toThrow("Unexpected error");
  });
});
