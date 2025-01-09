import elliptic from "elliptic";
import { ethers } from "hardhat";
import { importJWK } from "jose";
import crypto from "node:crypto";

export async function getPublicKey(_privateKey: string): Promise<{
  publicKeyHex: string;
  publicKeyId: string;
  publicKeyObject: crypto.KeyObject;
  publicKeyPem: string;
}> {
  let privateKey = _privateKey;
  if (privateKey.startsWith("0x")) privateKey = privateKey.slice(2);
  const EC = elliptic.ec;
  const ec = new EC("secp256k1");
  const privKey = ec.keyFromPrivate(privateKey);
  const pubPoint = privKey.getPublic();
  const publicKey = await importJWK(
    {
      crv: "secp256k1",
      kty: "EC",
      x: hex2base64url(pubPoint.getX().toString("hex")),
      y: hex2base64url(pubPoint.getY().toString("hex")),
    },
    "ES256K",
  );
  const publicKeyObject = publicKey as crypto.KeyObject;
  const publicKeyPem = publicKeyObject
    .export({
      format: "pem",
      type: "spki",
    })
    .toString();
  const publicKeyHex = `0x${Buffer.from(publicKeyPem, "utf8").toString("hex")}`;
  const publicKeyId = getPublicKeyId(publicKeyPem);
  return {
    publicKeyHex,
    publicKeyId,
    publicKeyObject,
    publicKeyPem,
  };
}

export function getPublicKeyId(publicKeyPem: string): string {
  return ethers.sha256(Buffer.from(publicKeyPem, "utf8"));
}

export function hex2base64url(dataHex: string): string {
  const buffer = Buffer.from(dataHex, "hex");
  const base64 = buffer.toString("base64");
  const base64url = base64
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  return base64url;
}
