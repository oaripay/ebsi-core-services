export interface BesuResponseErrorObject {
  code?: number;
  data?: unknown;
  message?: string;
}

export interface BesuResponseObject {
  error?: BesuResponseErrorObject;
  id: null | number | string;
  jsonrpc: string;
  result?: unknown;
}

export interface BesuServiceResponse {
  data: BesuResponseObject;
  status: number;
}
