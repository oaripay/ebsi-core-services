export interface ICredentialInfoList {
  list: Array<ICredentialInfo>;
}

export interface ICredentialInfo {
  id: string;
  type: string;
  name: string;
  hash: string;
  did: string;
}

export interface ICredentialOut extends ICredentialInfo {
  data: ICredData;
}

export interface ICredData {
  base64: string;
}

export interface IAttributeInput {
  id: string;
  type: string[];
  name: string;
  data: ICredData;
}

export interface Filters {
  types: string[];
}
