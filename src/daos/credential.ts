import { ICredentialInfoList } from "src/dtos/attributeInfo";

export interface ICredential {
  did: string;
  data: ICredentialInfoList;
}
