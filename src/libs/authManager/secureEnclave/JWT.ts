import { Resolver, DIDDocument } from "did-resolver";

export interface VerifiedJwt {
  payload: any;
  doc?: DIDDocument;
  issuer?: string;
  signer?: object;
  jwt: string;
}

export interface JWTVerifyOptions {
  auth?: boolean;
  audience?: string;
  callbackUrl?: string;
  resolver: Resolver;
}

export interface JWTHeader {
  typ: "JWT";
  alg: string;
  jwk?: string;
  jku?: string;
  kid?: string;
}

export interface JWTClaims {
  // Registered Claim names
  iss?: string; // (Issuer) Claim
  sub?: string; // (Subject) Claim
  aud?: string; // (Audience) Claim
  exp?: string; // (Expiration Time) Claim. (Set it in string: 1 hour, 10 minutes)
  nbf?: number; // (Not Before) Claim
  iat?: number; // (Issued At) Claim
  jti?: string; // (JWT ID) Claim
}

export interface IUserAuthNToken extends JWTClaims {
  ticket: string;
  publicKey?: string;
}

export interface IComponentAuthNToken extends JWTClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: string;
}

export interface IComponentAuthZToken extends JWTClaims {
  iss: string;
  aud: string;
}
export interface IUserAuthZToken extends JWTClaims {
  did: string;
  userName?: string;
  userId: string;
}

export interface IEnterpriseAuthZToken extends JWTClaims {
  did: string;
  enterpriseName: string;
  nonce: string;
}
