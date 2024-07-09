export interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number | null;
  result: unknown;
}
