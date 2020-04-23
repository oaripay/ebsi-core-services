import { ICredentialInfoList } from "../dtos/attributeInfo";

export interface ICredential {
  did: string;
  data: ICredentialInfoList;
}
