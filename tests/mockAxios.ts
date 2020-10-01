import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import JsonRpcResponseObject from "../src/modules/jsonrpc/types/jsonrpc.interface";

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

/* Ledger api returns 200 for sessions and calls to besu
 */
export function ledgerWorking(
  url: string
): Promise<AxiosResponseJsonRpc | AxiosResponseSessions> {
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

/* Ledger api returns 400
 */
export function ledgerBadRequest(): Promise<AxiosErrorResponse> {
  const httpError = new BadRequestError();
  const error: unknown = new Error("HTTP 400");
  (error as AxiosErrorResponse).response = {
    status: httpError.status,
    data: httpError.toJSON(),
  };

  return Promise.reject(error);
}

/* - Sessions is working
 * - calls to Besu returns
    {
      response: {
        status: 400,
        data: Bad Request Error json
      }
      message: "HTTP 400"
    }
 */
export function sessionsWorkingBesuBadRequest(
  url: string
): Promise<AxiosErrorResponse | AxiosResponseSessions> {
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

/* - Sessions is working
 * - calls to Besu returns
    {
      response: {
        status: 400,
        data: "text error no object"
      }
      message: "HTTP 400"
    }
 */
export function sessionsWorkingBesuError(
  url: string
): Promise<AxiosErrorResponse | AxiosResponseSessions> {
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

/* - Sessions is working
 * - calls to Besu returns
    {
      message: "Unexpected error"
    }
 */
export function sessionsWorkingBesuUnexpectedError(
  url: string
): Promise<Error | AxiosResponseSessions> {
  // sessions
  if (url.includes("/sessions")) return accessToken();

  // call to besu
  return Promise.reject(new Error("Unexpected error"));
}
