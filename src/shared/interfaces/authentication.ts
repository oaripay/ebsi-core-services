import { VerifiableCredential } from "@cef-ebsi/verifiable-credential";

export interface AuthenticationResponse {
  session_token: string;
}
export interface AuthenticationRequest {
  scope: string;
}
export interface VerifiableAuthorization {
  verifiableCredential: VerifiableCredential;
}
export interface AuhtenticationResponseRequest {
  id_token: string;
}
