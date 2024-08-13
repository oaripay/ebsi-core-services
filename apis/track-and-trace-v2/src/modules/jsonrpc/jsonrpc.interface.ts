export interface JsonRpcResponseObject<T = unknown> {
  jsonrpc: string;
  id: string | number | null;
  result: T;
  error?: unknown;
}
