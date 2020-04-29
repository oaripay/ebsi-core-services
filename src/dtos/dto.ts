import {
  UserAuthNToken,
  LegalEntityAuthNToken,
} from "../libs/authManager/secureEnclave/jwt";

export interface PublicKey {
  pubkey: string;
}

export interface ResponseMessageOK {
  message: string;
}

export interface CallbackMessageOK extends ResponseMessageOK {
  callback_url: string;
}

export interface HashInput {
  did: string;
  hash: string;
  name: string;
}

export interface OpInfo {
  opId: string;
  dataName: string;
  data: string;
  sender: string;
  opTypeId: string;
}

export interface CredentialInfo {
  id: string;
  credTypeId: string;
  name: string;
  data: string;
}

export interface OpReady {
  did: string;
  opId: string;
  data: string;
  opTypeId: string;
}

export interface IBondInput {
  userId: string;
  userName: string;
  publicKey: string;
  front_endpoint: string;
}

export type IUserLoginInput = UserAuthNToken;

export interface ITestUserUE {
  uid: string;
  firstname: string;
  lastname: string;
}

export interface IUserTestLoginInput extends IUserLoginInput {
  userEU: ITestUserUE;
}

export type IEnterpriseLoginInput = LegalEntityAuthNToken;

export interface IAuthenticationOutput {
  jwt: string;
}

export interface VerifIdRequestInput {
  did: string;
  eidasDatasetInput: EIDASDatasetInput;
}

export interface EIDASDatasetInput {
  currentFamilyName: string;
  currentGivenName: string;
  dateOfBirth: string;
  placeOfBirth: string;
}

export interface VerifIdIssueInputCall {
  did: string;
  verifIdStruct: VerifIdStruct;
}

interface VerifIdStruct {
  "@id": string;
  data: VerifIdData;
}

interface VerifIdData {
  base64: string;
}
