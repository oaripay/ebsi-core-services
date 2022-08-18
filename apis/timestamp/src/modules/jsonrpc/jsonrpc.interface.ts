export interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number;
  result: unknown;
  error?: unknown;
}

export interface AxiosResponseSessions {
  status: number;
  data: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    issuedAt: number;
  };
}

export interface AxiosResponseJsonRpc {
  status: number;
  data: JsonRpcResponseObject;
}

export interface AxiosErrorResponse {
  message: string;
  response: {
    status: number;
    data: unknown;
  };
}
