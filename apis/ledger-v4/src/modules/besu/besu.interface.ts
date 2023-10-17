export interface BesuResponseErrorObject {
  code?: string;
}

export interface BesuResponseObject {
  jsonrpc: string;
  id: string | number | null;
  result?: unknown;
  error?: BesuResponseErrorObject;
}

export interface BesuServiceResponse {
  status: number;
  data: BesuResponseObject;
}
