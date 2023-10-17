export interface PaginatedResponse<T> {
  self: string;
  items: T[];
  total: number;
  pageSize: number;
  links: {
    first: string;
    prev: string;
    next: string;
    last: string;
  };
}

export interface Proof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws: string;
}

export interface Notification {
  schemaId: string;
  type: string[];
  "@context": string[];
  // "id" is used for Cassandra only
  id?: string;
  from: string;
  to: string;
  issuanceDate: string;
  expirationDate?: string;
  payload: unknown;
  proof: Proof;
}

export interface NotificationResponseObject extends Notification {
  _links: {
    self: {
      href: string;
    };
  };
}

export interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number;
  result: unknown;
  error?: unknown;
}

export interface NotificationCassandraModel {
  id: string;
  sender: string;
  receiver: string;
  message: string;
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
  fetchSize?: number;
  pageState?: string;
}
