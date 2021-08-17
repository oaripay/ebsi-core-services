import SignJWT from "jose/jwt/sign";
import { JWK } from "jose/jwk/thumbprint";
import parseJwk, { KeyLike } from "jose/jwk/parse";
import { KeyObject } from "crypto";
import { getPrivateKeyHex } from "./keys";

export async function getKeyByAlg(
  keys: {
    type: string;
    id: string;
    privateKeyJwk: JWK;
    publicKeyJwk?: JWK;
    privateKeyEncryptionJwk?: JWK;
    publicKeyEncryptionJwk?: JWK;
  }[],
  alg: string
): Promise<{
  type: string;
  id: string;
  privateKeyJwk: JWK;
  publicKeyJwk?: JWK;
  privateKeyEncryptionJwk?: JWK;
  publicKeyEncryptionJwk?: JWK;
  privateKeyEncryption: KeyLike;
  publicKeyEncryption?: KeyLike;
  privateKeyHexES256K: string;
}> {
  const types = {
    ES256K: "Secp256k1VerificationKey2018",
    ES256: "Secp256r1VerificationKey2018",
    RS256: "RsaVerificationKey2018",
    EdDSA: "Ed25519VerificationKey2018",
  };
  const keyObject = keys.find((p) => p.type === types[alg]);
  const privateKeyEncryption = await parseJwk(
    keyObject.privateKeyEncryptionJwk ?? keyObject.privateKeyJwk,
    alg
  );
  const publicKeyEncryption =
    keyObject.publicKeyEncryptionJwk || keyObject.publicKeyJwk
      ? await parseJwk(
          keyObject.publicKeyEncryptionJwk ?? keyObject.publicKeyJwk,
          alg
        )
      : null;
  const privateKeyHexES256K =
    alg === "ES256K"
      ? await getPrivateKeyHex(privateKeyEncryption as KeyObject)
      : null;
  return {
    ...keyObject,
    privateKeyEncryption,
    publicKeyEncryption,
    privateKeyHexES256K,
  };
}

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

  const privateKey = await parseJwk(privateKeyJwk, alg);
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
      kid: did,
    })
    .setIssuedAt()
    .setIssuer("https://self-issued.me")
    .setAudience(redirectUri)
    .setExpirationTime("15s")
    .sign(privateKey);

  return idToken;
}
