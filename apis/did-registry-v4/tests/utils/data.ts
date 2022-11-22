/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import type { DIDDocument, JsonWebKey } from "did-resolver";
import { calculateJwkThumbprint, JWK } from "jose";
import { ec as EC } from "elliptic";
import KeyEncoder from "key-encoder";
import { bases, bytes } from "multiformats/basics";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";

export interface UserDetails {
  kid: string;
  did: string;
  didDocument: DIDDocument;
  thumbprint: string;
  wallet: ethers.Wallet;
}

const { base64url } = bases;

const ec = new EC("secp256k1");
const keyEncoder = new KeyEncoder("secp256k1");

export const encode = {
  publicKey: {
    fromJWKToHex: (keyJwk: JWK): string => {
      return ec
        .keyFromPublic({
          x: bytes.toHex(base64url.baseDecode(keyJwk.x || "")),
          y: bytes.toHex(base64url.baseDecode(keyJwk.y || "")),
        })
        .getPublic("hex");
    },
    fromHexToJWK: (keyHex: string): JWK => {
      const hex = keyHex.replace("0x", "");
      const pubPoint = ec.keyFromPublic(hex, "hex").getPublic();
      return {
        kty: "EC",
        crv: "secp256k1",
        x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
        y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
      };
    },
    fromJWKToPEM: (keyJwk: JWK): string => {
      const keyHex = ec
        .keyFromPublic({
          x: bytes.toHex(base64url.baseDecode(keyJwk.x || "")),
          y: bytes.toHex(base64url.baseDecode(keyJwk.y || "")),
        })
        .getPublic("hex");
      return keyEncoder.encodePublic(keyHex, "raw", "pem");
    },
  },
  privateKey: {
    fromJWKToHex: (keyJwk: JWK): string => {
      return bytes.toHex(base64url.baseDecode(keyJwk.d || ""));
    },
    fromHexToJWK: (keyHex: string): JWK => {
      const hex = keyHex.replace("0x", "");
      const pubPoint = ec.keyFromPrivate(hex, "hex").getPublic();
      return {
        kty: "EC",
        crv: "secp256k1",
        x: base64url.baseEncode(pubPoint.getX().toBuffer("be", 32)),
        y: base64url.baseEncode(pubPoint.getY().toBuffer("be", 32)),
        d: base64url.baseEncode(bytes.fromHex(hex)),
      };
    },
  },
};

export async function createUser(wallet?: ethers.Wallet): Promise<UserDetails> {
  const did = EbsiWallet.createDid();
  const w = wallet || ethers.Wallet.createRandom();
  const publicKeyJwk = encode.publicKey.fromHexToJWK(
    w.publicKey
  ) as unknown as JsonWebKey;
  const thumbprint = await calculateJwkThumbprint(publicKeyJwk, "sha256");

  const kid = `${did}#${thumbprint}`;
  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    controller: [did],
    verificationMethod: [
      {
        id: kid,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk,
      },
    ],
    authentication: [kid],
    assertionMethod: [kid],
    capabilityInvocation: [kid],
  };

  return {
    kid,
    did,
    didDocument,
    thumbprint,
    wallet: w,
  };
}
