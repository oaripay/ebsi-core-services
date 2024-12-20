import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import elliptic from "elliptic";
import { ethers } from "ethers";
import { base64url } from "multiformats/bases/base64";
import { calculateJwkThumbprint, importJWK, JWK, KeyLike } from "jose";
const EC = elliptic.ec;

export interface UserData {
  baseDocument: string;
  did: string;
  notAfter: number;
  notBefore: number;
  ES256: {
    privateKey: KeyLike | Uint8Array;
    privateKeyJwk: JWK;
    publicKeyJwk: JWK;
    publicKeyHex: string;
    vMethodId: string;
  };
  ES256K: {
    privateKey: KeyLike | Uint8Array;
    privateKeyJwk: JWK;
    publicKeyHex: string;
    publicKeyJwk: JWK;
    vMethodId: string;
  };
}

export function removePrefix0x(key: string): string {
  return key.startsWith("0x") ? key.slice(2) : key;
}

export function getJwks(privateKeyHex: string, alg: "ES256" | "ES256K") {
  const ec = alg === "ES256" ? new EC("p256") : new EC("secp256k1");
  const privateKey = removePrefix0x(privateKeyHex);
  const keyPair = ec.keyFromPrivate(privateKey, "hex");
  const validation = keyPair.validate();
  if (validation.result === false) {
    throw new Error(validation.reason);
  }
  const pubPoint = keyPair.getPublic();
  const publicKeyJwk = {
    kty: "EC",
    crv: "P-256",
    x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
    y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
  };
  const privateKeyJwk = {
    ...publicKeyJwk,
    d: base64url.baseEncode(Buffer.from(privateKey, "hex")),
  };
  return { publicKeyJwk, privateKeyJwk };
}

export async function generateDidParams(
  wallet: ethers.Wallet,
): Promise<UserData> {
  const did = EbsiWallet.createDid();
  const baseDocument = JSON.stringify({
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
  });
  const jwksES256K = getJwks(wallet.privateKey, "ES256K");
  const jwksES256 = getJwks(wallet.privateKey, "ES256");
  const notBefore = Math.floor(Date.now() / 1000);
  const notAfter = notBefore + 84_600 * 365 * 5;
  return {
    baseDocument,
    did,
    notAfter,
    notBefore,
    ES256: {
      ...jwksES256,
      privateKey: await importJWK(jwksES256.privateKeyJwk, "ES256"),
      publicKeyHex: `0x${Buffer.from(JSON.stringify(jwksES256.publicKeyJwk)).toString("hex")}`,
      vMethodId: await calculateJwkThumbprint(jwksES256.publicKeyJwk, "sha256"),
    },
    ES256K: {
      ...jwksES256K,
      privateKey: await importJWK(jwksES256K.privateKeyJwk, "ES256K"),
      publicKeyHex: wallet.publicKey,
      vMethodId: await calculateJwkThumbprint(
        jwksES256K.publicKeyJwk,
        "sha256",
      ),
    },
  };
}
