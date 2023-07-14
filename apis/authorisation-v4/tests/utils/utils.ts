import { SignJWT, importJWK } from "jose";
import type { JWK } from "jose";

export async function createAuthenticationResponseJose(input: {
  alg: string;
  keyId: string;
  nonce: string;
  redirectUri: string;
  privateKeyJwk: JWK;
  publicKeyJwk?: JWK;
  publicKeyEncryptionJwk?: JWK;
  payload?: { [x: string]: unknown };
}): Promise<string> {
  const { alg, keyId, nonce, redirectUri, privateKeyJwk, publicKeyJwk } = input;
  const [did] = keyId.split("#");

  const privateKey = await importJWK(privateKeyJwk, alg);
  const payload = input?.payload ?? {
    sub: did,
    sub_jwk: publicKeyJwk || {},
    sub_did_verification_method_uri: keyId,
    nonce,
    claims: {
      ...(input.publicKeyEncryptionJwk && {
        encryption_key: input.publicKeyEncryptionJwk,
      }),
    },
  };

  const idToken = await new SignJWT(payload)
    .setProtectedHeader({
      alg,
      typ: "JWT",
      kid: keyId,
    })
    .setIssuedAt()
    .setIssuer("https://self-issued.me/v2")
    .setAudience(redirectUri)
    .setExpirationTime("15s")
    .sign(privateKey);

  return idToken;
}

export default createAuthenticationResponseJose;
