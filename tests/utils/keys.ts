import crypto from "crypto";
import parseJwk, { JWK } from "jose/jwk/parse";
import { ec as EC } from "elliptic";
import secp256k1 from "secp256k1";
import { ethers } from "ethers";
import KeyEncoder from "key-encoder";
import fromKeyLike from "jose/jwk/from_key_like";
import generateKeyPair from "jose/util/generate_key_pair";
import { base64url } from "multiformats/bases/base64";
import EbsiWallet from "@cef-ebsi/wallet-lib";

const keyEncoder = new KeyEncoder("secp256k1");
const ec = new EC("secp256k1");

export interface PublicKey {
  publicKeyObject: crypto.KeyObject;
  publicKeyPem: string;
  publicKeyHex: string;
  publicKeyId: string;
  jwk: JWK;
}

export function randomPrivateKeySecp256k1(): string {
  let privateKey: Buffer;
  do {
    privateKey = crypto.randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privateKey));
  return privateKey.toString("hex");
}

export async function generateKeys(alg: string): Promise<{
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

export async function getPrivateKeyHex(
  privateKey: crypto.KeyObject
): Promise<string> {
  const privateJwk = await fromKeyLike(privateKey);
  return Buffer.from(base64url.baseDecode(privateJwk.d)).toString("hex");
}

export function getPublicKeyId(publicKeyPem: string): string {
  return ethers.utils.sha256(Buffer.from(publicKeyPem, "utf8"));
}

export async function getPublicKey(_privateKey: string): Promise<PublicKey> {
  let privateKey = _privateKey;
  if (privateKey.startsWith("0x")) privateKey = privateKey.slice(2);
  const privKey = ec.keyFromPrivate(privateKey);
  const pubPoint = privKey.getPublic();
  const jwk = EbsiWallet.formatPublicKey(pubPoint, "jwk") as JWK;
  const publicKey = await parseJwk(jwk, "ES256K");
  const publicKeyObject = publicKey as crypto.KeyObject;
  const publicKeyPem = publicKeyObject
    .export({
      type: "spki",
      format: "pem",
    })
    .toString();
  const publicKeyHex = keyEncoder.encodePublic(publicKeyPem, "pem", "raw");
  const publicKeyId = getPublicKeyId(publicKeyPem);

  return {
    publicKeyObject,
    publicKeyPem,
    publicKeyHex,
    publicKeyId,
    jwk,
  };
}
