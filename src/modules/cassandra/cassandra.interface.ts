export interface StoredNotification {
  id: string;
  from: string;
  to: string;
  message: string;
}

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
  pageState: string;
}

export interface PageOpts {
  fetchSize: number;
  pageState: string;
}
