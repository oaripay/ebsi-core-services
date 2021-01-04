export default interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number;
  result: unknown;
}
