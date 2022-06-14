import { JWK } from "jose";

export function prefix0x(value: string): string {
  return value.startsWith("0x") ? value : `0x${value}`;
}

export function addAlgToJwk(jwk: JWK): JWK {
  if (jwk.alg) return jwk;

  let alg: string;
  if (jwk.kty === "EC" && jwk.crv === "P-256") alg = "ES256";
  else if (jwk.kty === "EC" && jwk.crv === "secp256k1") alg = "ES256K";
  else if (jwk.kty === "RSA") alg = "RS256";
  else if (jwk.kty === "OKP" && jwk.crv === "Ed25519") alg = "EdDSA";
  else alg = "ES256";

  return {
    alg,
    ...jwk,
  };
}

export default prefix0x;
