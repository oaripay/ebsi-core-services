export interface AuthenticationResponse {
  session_token: string;
}
export interface AuthenticationRequest {
  scope: string;
}
export interface VerifiableAuthorization {
  verifiableCredential: string;
}
export interface AuthenticationResponseRequest {
  id_token: string;
}
