export interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number;
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

export interface AdministratorResponseObject {
  did: string;
  attributes: {
    hash: string;
    body: string;
  }[];
}
