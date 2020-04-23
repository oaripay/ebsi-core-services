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

export interface UserAuthNToken extends JWTClaims {
  ticket: string;
  publicKey: string;
  frontEndpoint: string;
}

export interface LegalEntityAuthNToken extends JWTClaims {
  enterpriseName: string;
  nonce: string;
}

export interface ComponentAuthNToken extends JWTClaims {
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

export enum GRANT_TYPE {
  jwtBearer = "urn:ietf:params:oauth:grant-type:jwt-bearer",
}

export enum EBSI_ACCESS_TOKEN_SCOPE {
  USER = "ebsi profile user",
  ENTITY = "ebsi profile entity",
  COMPONENT = "ebsi profile component",
}

export interface AccessTokenRequestBody {
  grantType: GRANT_TYPE.jwtBearer;
  assertion: string;
  scope?: EBSI_ACCESS_TOKEN_SCOPE;
}

export enum TOKEN_TYPE {
  bearer = "Bearer",
}

export interface AccessTokenResponseBody {
  accessToken: string;
  tokenType: TOKEN_TYPE.bearer;
  expiresIn: number; // 15 minutes
  issuedAt: number;
}

export enum SignatureTypes {
  EcdsaSecp256k1Signature2019 = "EcdsaSecp256k1Signature2019",
}
