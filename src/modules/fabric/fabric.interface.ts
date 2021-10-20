export interface JsonRpcResponseObject {
  jsonrpc: string;
  id: string | number;
  result: unknown;
  error?: unknown;
}

export interface ProposalAction {
  init: boolean;
  transientMap?: Record<string, Buffer>;
  transactionId: string;
  args: Buffer[];
  fcn: string;
  header: {
    signature_header: Buffer;
    channel_header: Buffer;
  };
  proposal: {
    header: Buffer;
    payload: Buffer;
  };
}
