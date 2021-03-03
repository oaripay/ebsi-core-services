import crypto from "crypto";
import parseJwk from "jose/jwk/parse";
import { ec as EC } from "elliptic";
import { ethers } from "ethers";

export interface PublicKey {
  publicKeyObject: crypto.KeyObject;
  publicKeyPem: string;
  publicKeyHex: string;
  publicKeyId: string;
}

export function hex2base64url(dataHex: string): string {
  const buffer = Buffer.from(dataHex, "hex");
  const base64 = buffer.toString("base64");
  const base64url = base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64url;
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
  const publicKey = await parseJwk(
    {
      kty: "EC",
      crv: "secp256k1",
      x: hex2base64url(pubPoint.getX().toString("hex")),
      y: hex2base64url(pubPoint.getY().toString("hex")),
    },
    "ES256K"
  );
  const publicKeyObject = publicKey as crypto.KeyObject;
  const publicKeyPem = publicKeyObject
    .export({
      type: "spki",
      format: "pem",
    })
    .toString();
  const publicKeyHex = `0x${Buffer.from(publicKeyPem, "utf8").toString("hex")}`;
  const publicKeyId = getPublicKeyId(publicKeyPem);
  return {
    publicKeyObject,
    publicKeyPem,
    publicKeyHex,
    publicKeyId,
  };
}

export async function createKeys(): Promise<{
  privateKey: string;
  publicKey: PublicKey;
}> {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < 100; i += 1) {
    const privateKey = crypto.randomBytes(32).toString("hex");
    try {
      const publicKey = await getPublicKey(privateKey);
      return { privateKey, publicKey };
    } catch (error) {
      if (i === 99) throw error;
    }
  }
  /* eslint-enable no-await-in-loop */
  throw new Error("Error creating a key pair");
}
