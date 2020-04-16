export interface ICredentialInfoList {
  list: Array<ICredentialInfo>;
}

export interface ICredentialInfo {
  id: string;
  type: string;
  hash: string;
  name?: string;
  issuer?: string;
}

export interface ICredentialOut extends ICredentialInfo {
  data: ICredData;
}

export interface ICredData {
  base64: string;
}

export interface IAttributeInput {
  id: string;
  issuer?: string;
  data: ICredData;
}

export interface Filters {
  types: string[];
}
