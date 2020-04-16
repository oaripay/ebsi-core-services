import { Signer } from "did-jwt";

export interface CredentialSubject {
  [x: string]: any;
}

export interface DiplomaInputCall {
  issuer: string | DiplomaIssuer;
  type: string[];
  id: string;
  credentialSubject: CredentialSubject;
  title?: DiplomaTitle[];
  description?: DiplomaTitleDescription[];
  expiry?: string;
  [x: string]: any;
}

export interface DiplomaOrganization {
  id: string;
  legalIdentifier: string;
  vatIdentifier: string;
  taxIdentifier: string;
  identifier: string;
  preferredName: string;
  alternativeName: string;
  homePage: string;
  escoOrganizationType: string;
  siteLocation: string;
  hasAccreditation: DiplomaAccreditation;
  [x: string]: any;
}

export interface DiplomaIssuer {
  id: string;
  organization: DiplomaOrganization;
}

export interface DiplomaAccreditation {
  targetFramework: string;
  targetResource: string;
}

export interface DiplomaTitle {
  lang: string;
  contentType: string;
  text: string;
}

export interface DiplomaTitleDescription {
  lang: string;
  contentType: string;
  text: string;
}

export interface Proof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  jws: string;
  [x: string]: string;
}

export interface VC {
  "@context": string[];
  id: string;
  type: string[];
  credentialSubject: CredentialSubject;
  [x: string]: any;
}

export interface VerifiableCredentialPayload {
  sub: string;
  vc: VC;
  nbf?: number;
  aud?: string;
  exp?: number;
  jti?: string;
  [x: string]: any;
}

export interface FullVC extends VC {
  issuer: string | DiplomaIssuer;
  issuanceDate: string;
  proof: Proof;
}

export interface FullVID extends VID {
  issuer: string;
  issuanceDate: string;
  proof: Proof;
  expirationDate: string;
}

export interface VIDCredentialSubject {
  id: string;
  personIdentifier: string;
  currentFamilyName: string;
  currentGivenName: string;
  birthName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  currentAddress: string;
  gender: string;
  govID?: string;
}

export interface VID {
  "@context": string[];
  id: string;
  type: string[];
  credentialSubject: VIDCredentialSubject;
}

export interface VerifiableIdCredentialPayload {
  sub: string;
  vc: VID;
  nbf?: number;
  aud?: string;
  exp?: number;
  jti?: string;
  [x: string]: any;
}

export interface VP {
  "@context": string[];
  type: string;
  verifiableCredential: string[];
  termsOfUse: string;
}

export interface PresentationPayload {
  vp: VP;
  aud?: string;
  nbf?: number;
  exp?: number;
  jti?: string;
  [x: string]: any;
}

export interface Issuer {
  did: string;
  signer: Signer;
}

export interface FullVP extends VP {
  proof: Proof;
}
