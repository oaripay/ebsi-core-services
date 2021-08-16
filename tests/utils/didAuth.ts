import SignJWT from "jose/jwt/sign";
import { JWK } from "jose/jwk/thumbprint";
import parseJwk, { KeyLike } from "jose/jwk/parse";
import { KeyObject } from "crypto";
import { getPrivateKeyHex } from "./keys";

export async function getKeyByAlg(
  keys: {
    type: string;
    id: string;
    privateKeyJwk: JWK | JWK[];
    publicKeyJwk?: JWK | JWK[];
  }[],
  alg: string
): Promise<{
  id: string;
  publicKeyJwk?: JWK | JWK[];
  publicKeyJwkEncryption?: unknown;
  privateKeyJwk: JWK | JWK[];
  privateKeyJwkEncryption: unknown;
  privateKeyHexES256K: string;
}> {
  const types = {
    ES256K: "Secp256k1VerificationKey2018",
    ES256: "Secp256r1VerificationKey2018",
    RS256: "RsaVerificationKey2018",
    EdDSA: "Ed25519VerificationKey2018",
  };
  const keyObject = keys.find((p) => p.type === types[alg]);
  const privateKeyJwkEncryption = await parseJwk(
    Array.isArray(keyObject.privateKeyJwk)
      ? keyObject.privateKeyJwk.find((k) => k.use === "enc") // EdDSA
      : keyObject.privateKeyJwk,
    alg
  );

  let publicKeyJwkEncryption: KeyLike;
  try {
    publicKeyJwkEncryption =
      alg === "EdDSA"
        ? await parseJwk(
            (keyObject.publicKeyJwk as JWK[]).find((k) => k.use === "enc"),
            alg
          )
        : await parseJwk(keyObject.publicKeyJwk as JWK, alg);
  } catch (error) {
    /* empty */
  }
  const privateKeyHexES256K =
    alg === "ES256K"
      ? await getPrivateKeyHex(privateKeyJwkEncryption as KeyObject)
      : null;
  return {
    ...keyObject,
    privateKeyJwkEncryption,
    publicKeyJwkEncryption,
    privateKeyHexES256K,
  };
}

export async function createAuthenticationResponseJose(input: {
  alg: string;
  keyId: string;
  nonce: string;
  redirectUri: string;
  privateKeyJwk: JWK | JWK[];
  publicKeyJwk?: JWK | JWK[];
}): Promise<string> {
  const { alg, keyId, nonce, redirectUri, privateKeyJwk, publicKeyJwk } = input;
  const [did] = keyId.split("#");

  const privateKey = await parseJwk(
    alg === "EdDSA"
      ? (privateKeyJwk as JWK[]).find((k) => k.use === "sig")
      : (privateKeyJwk as JWK),
    alg
  );
  const payload = {
    sub: did,
    sub_jwk: publicKeyJwk || {},
    sub_did_verification_method_uri: keyId,
    nonce,
    claims: {},
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
