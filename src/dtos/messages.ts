export interface ICallResponse {
  id?: string;
  message: string;
  hash?: string;
}

export interface IRequestProcessed {
  message: string;
  callback_url: string;
}

export interface IServiceEndpoint {
  serviceEndpoint: string;
}

export interface ISignatureTXResponse {
  ledgerHash: string;
}

export interface SignatureOutput {
  signatureJWS: string;
}

export interface ISignatureTXInput {
  did: string;
  hash: string;
  redirectURL: string;
  documentName?: string;
}

export interface ISendTXInput {
  signature: string;
}
