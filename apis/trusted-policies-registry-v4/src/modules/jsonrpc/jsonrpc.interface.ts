export interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number | null;
  result: unknown;
  error?: unknown;
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
