import { ICallResponse } from "./messages";

export interface ICredentials {
  username: string;
  password: string;
  uri: string;
}

export interface ICASStorageOut extends ICallResponse {
  hash: string;
}
