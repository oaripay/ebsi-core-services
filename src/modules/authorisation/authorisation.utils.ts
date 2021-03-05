import crypto from "crypto";
import KeyEncoder from "key-encoder";
import EthCrypto from "eth-crypto";
import EncryptJWT from "jose/jwt/encrypt";
import jwtDecrypt from "jose/jwt/decrypt";
import fromKeyLike from "jose/jwk/from_key_like";
import generateKeyPair from "jose/util/generate_key_pair";
import base64url from "base64url";

const keyEncoder = new KeyEncoder("secp256k1");

export async function generateKeys(
  alg: string
): Promise<{
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  publicKeyEncryption?: crypto.KeyObject;
  privateKeyEncryption?: crypto.KeyObject;
}> {
  const { publicKey, privateKey } = (await generateKeyPair(alg)) as {
    publicKey: crypto.KeyObject;
    privateKey: crypto.KeyObject;
  };

  let publicKeyEncryption: crypto.KeyObject;
  let privateKeyEncryption: crypto.KeyObject;
  if (alg === "EdDSA") {
    // For Edward we have to use the keys for encryption
    const keysEncryption = crypto.generateKeyPairSync("x25519");
    publicKeyEncryption = keysEncryption.publicKey;
    privateKeyEncryption = keysEncryption.privateKey;
  }

  return {
    publicKey,
    privateKey,
    publicKeyEncryption,
    privateKeyEncryption,
  };
}

export function getPublicKeyHex(publicKey: crypto.KeyObject): string {
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  });
  const publicKeyHex = keyEncoder.encodePublic(publicKeyPem, "pem", "raw");
  return publicKeyHex;
}

export async function getPrivateKeyHex(
  privateKey: crypto.KeyObject
): Promise<string> {
  const privateJwk = await fromKeyLike(privateKey);
  return base64url.decode(privateJwk.d, "hex");
}

export async function encrypt(
  alg: string,
  payload: { [x: string]: unknown },
  publicKey: crypto.KeyObject
): Promise<string> {
  if (alg === "ES256K") {
    // using eth-crypto lib for encryption
    const publicKeyHex = getPublicKeyHex(publicKey);
    const encrypted = await EthCrypto.encryptWithPublicKey(
      publicKeyHex,
      JSON.stringify(payload)
    );
    return EthCrypto.cipher.stringify(encrypted);
  }

  // using jose for ES256, RS256, and EdDSA
  return new EncryptJWT(payload)
    .setProtectedHeader({
      alg: alg === "RS256" ? "RSA1_5" : "ECDH-ES",
      enc: "A128GCM",
    })
    .encrypt(publicKey);
}

export async function decrypt(
  alg: string,
  privateKey: string | crypto.KeyObject,
  encrypted: string
): Promise<{ [x: string]: unknown }> {
  if (alg === "ES256K") {
    // using eth-crypto lib for decryption
    const privateKeyHex =
      typeof privateKey === "string"
        ? privateKey
        : await getPrivateKeyHex(privateKey);
    const encryptedObject = EthCrypto.cipher.parse(encrypted);
    const decrypted = await EthCrypto.decryptWithPrivateKey(
      privateKeyHex,
      encryptedObject
    );
    return JSON.parse(decrypted) as { [x: string]: unknown };
  }

  // using jose for ES256, RS256, and EdDSA
  const { payload } = await jwtDecrypt(
    encrypted,
    privateKey as crypto.KeyObject
  );
  return payload;
}
