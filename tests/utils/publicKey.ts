import crypto from "crypto";
import parseJwk, { JWK } from "jose/jwk/parse";
import { ec as EC } from "elliptic";
import { ethers } from "ethers";
import KeyEncoder from "key-encoder";

const keyEncoder = new KeyEncoder("secp256k1");

export interface PublicKey {
  publicKeyObject: crypto.KeyObject;
  publicKeyPem: string;
  publicKeyHex: string;
  publicKeyId: string;
  jwk: JWK;
  address: string;
  did: string;
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
  const address = ethers.utils.computeAddress(`0x${publicKeyHex}`);
  const did = `did:ebsi:${address.toLowerCase()}`;
  return {
    publicKeyObject,
    publicKeyPem,
    publicKeyHex,
    publicKeyId,
    jwk,
    address,
    did,
  };
}
