import crypto from "crypto";
import parseJwk, { JWK } from "jose/jwk/parse";
import { ec as EC } from "elliptic";
import { ethers } from "ethers";
import KeyEncoder from "key-encoder";
import fromKeyLike from "jose/jwk/from_key_like";
import generateKeyPair from "jose/util/generate_key_pair";
import base64url from "base64url";

const keyEncoder = new KeyEncoder("secp256k1");

export interface PublicKey {
  publicKeyObject: crypto.KeyObject;
  publicKeyPem: string;
  publicKeyHex: string;
  publicKeyId: string;
  jwk: JWK;
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

export function hex2base64url(dataHex: string): string {
  const buffer = Buffer.from(dataHex, "hex");
  const base64 = buffer.toString("base64");
  const base64urlString = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64urlString;
}

export function getPublicKeyId(publicKeyPem: string): string {
  return ethers.utils.sha256(Buffer.from(publicKeyPem, "utf8"));
}

export async function getPublicKey(_privateKey: string): Promise<PublicKey> {
  let privateKey = _privateKey;
  if (privateKey.startsWith("0x")) privateKey = privateKey.slice(2);
  const ec = new EC("secp256k1");
  const privKey = ec.keyFromPrivate(privateKey);
  const pubPoint = privKey.getPublic();
  const jwk: JWK = {
    kty: "EC",
    crv: "secp256k1",
    x: hex2base64url(pubPoint.getX().toString("hex")),
    y: hex2base64url(pubPoint.getY().toString("hex")),
  };
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
