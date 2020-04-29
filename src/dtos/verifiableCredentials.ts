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

export interface ICredentialList {
  list: Array<ICredStruct>;
}

export interface ICredStruct {
  id: string;
  data: ICredData;
}

export interface ICredIssueInputCall {
  did: string;
  credentialAttach: ICredStruct;
}
