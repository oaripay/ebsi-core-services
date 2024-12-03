export interface AxiosErrorResponse {
  message: string;
  response: {
    data: unknown;
    status: number;
  };
}

export interface AxiosResponseJsonRpc {
  data: JsonRpcResponseObject;
  status: number;
}

export interface AxiosResponseSessions {
  data: {
    accessToken: string;
    expiresIn: number;
    issuedAt: number;
    tokenType: string;
  };
  status: number;
}

export interface JsonRpcResponseObject {
  error?: unknown;
  id: null | number | string;
  jsonrpc: string;
  result: unknown;
}
