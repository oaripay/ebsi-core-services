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

export interface CassandraResponse {
  rows: unknown[];
}

export interface AttributeResponseObject {
  hash: string;
  did: string;
  // visibility: string;
  // contentType: string;
  data: string;
  // metadata: string;
}
