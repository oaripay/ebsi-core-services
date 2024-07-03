export interface BesuResponseErrorObject {
  code?: number;
  message?: string;
  data?: unknown;
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
