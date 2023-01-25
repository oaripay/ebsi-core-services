/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import crypto from "node:crypto";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import type { DIDDocument } from "did-resolver";
import { JWK } from "jose";
import { ec as EC } from "elliptic";
import KeyEncoder from "key-encoder";
import { bases, bytes } from "multiformats/basics";

/**
 * Creates a random EBSI DID.
 *
 * @returns A random EBSI DID
 */
export const createDid = (): string => {
  return EbsiWallet.createDid();
};

/**
 * Generates a new DID Document.
 *
 * Example taken from:
 * https://www.w3.org/TR/2021/CR-did-core-20210318/#example-33-did-document-with-many-different-verification-methods
 *
 * @param did - Any DID
 * @returns A DID Document for the given DID
 */
export const createDidDocument = (did: string): DIDDocument => {
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
      "https://w3id.org/security/suites/secp256k1-2019/v1",
    ],
    id: did,
    verificationMethod: [
      {
        id: `${did}#${crypto.randomBytes(32).toString("hex")}`,
        type: "Ed25519VerificationKey2020",
        controller: did,
        publicKeyBase58: "H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV",
      },
      {
        id: `${did}#zQ3shP2mWsZYWgvgM11nenXRTx9L1yiJKmkf9dfX7NaMKb1pX`,
        type: "EcdsaSecp256k1VerificationKey2019",
        controller: did,
        publicKeyMultibase: "zd5cW2R53NHTTkv7EQSYR8YxaKx7MVCcchjmK5EgCNXxo",
      },
      {
        id: `${did}#_Qq0UL2Fq651Q0Fjd6TvnYE-faHiOpRlPVQcY_-tA4A`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "OKP",
          crv: "Ed25519",
          x: "VCpo2LMLhn6iWku8MKvSLg2ZAoC-nlOyPVQaO3FxVeQ",
        },
      },
      {
        id: `${did}#z6LSnjagzhe8Df6gZmroW3wjDd7XQLwAuYfwa4ZeTBCGFoYc`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "OKP",
          crv: "X25519",
          x: "pE_mG098rdQjY3MKK2D5SUQ6ZOEW3a6Z6T7Z4SgnzCE",
        },
      },
      {
        id: `${did}#4SZ-StXrp5Yd4_4rxHVTCYTHyt4zyPfN1fIuYsm6k3A`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "EC",
          crv: "secp256k1",
          x: "Z4Y3NNOxv0J6tCgqOBFnHnaZhJF6LdulT7z8A-2D5_8",
          y: "i5a2NtJoUKXkLm6q8nOEu9WOkso1Ag6FTUT6k_LMnGk",
        },
      },
      {
        id: `${did}#n4cQ-I_WkHMcwXBJa7IHkYu8CMfdNcZKnKsOrnHLpFs`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "RSA",
          e: "AQAB",
          n: "omwsC1AqEk6whvxyOltCFWheSQvv1MExu5RLCMT4jVk9khJKv8JeMXWe3bWHatjPskdf2dlaGkW5QjtOnUKL742mvr4tCldKS3ULIaT1hJInMHHxj2gcubO6eEegACQ4QSu9LO0H-LM_L3DsRABB7Qja8HecpyuspW1Tu_DbqxcSnwendamwL52V17eKhlO4uXwv2HFlxufFHM0KmCJujIKyAxjD_m3q__IiHUVHD1tDIEvLPhG9Azsn3j95d-saIgZzPLhQFiKluGvsjrSkYU5pXVWIsV-B2jtLeeLC14XcYxWDUJ0qVopxkBvdlERcNtgF4dvW4X00EHj4vCljFw",
        },
      },
      {
        id: `${did}#_TKzHv2jFIyvdTGF1Dsgwngfdg3SH6TpDv0Ta1aOEkw`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "EC",
          crv: "P-256",
          x: "38M1FDts7Oea7urmseiugGW7tWc3mLpJh6rKe7xINZ8",
          y: "nDQW6XZ7b_u2Sy9slofYLlG03sOEoug3I0aAPQ0exs4",
        },
      },
      {
        id: `${did}#8wgRfY3sWmzoeAL-78-oALNvNj67ZlQxd1ss_NX1hZY`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "EC",
          crv: "P-384",
          x: "GnLl6mDti7a2VUIZP5w6pcRX8q5nvEIgB3Q_5RI2p9F_QVsaAlDN7IG68Jn0dS_F",
          y: "jq4QoAHKiIzezDp88s_cxSPXtuXYFliuCGndgU4Qp8l91xzD1spCmFIzQgVjqvcP",
        },
      },
      {
        id: `${did}#NjQ6Y_ZMj6IUK_XkgCDwtKHlNTUTVjEYOWZtxhp1n-E`,
        type: "JsonWebKey2020",
        controller: did,
        publicKeyJwk: {
          kty: "EC",
          crv: "P-521",
          x: "AVlZG23LyXYwlbjbGPMxZbHmJpDSu-IvpuKigEN2pzgWtSo--Rwd-n78nrWnZzeDc187Ln3qHlw5LRGrX4qgLQ-y",
          y: "ANIbFeRdPHf1WYMCUjcPz-ZhecZFybOqLIJjVOlLETH7uPlyG0gEoMWnIZXhQVypPy_HtUiUzdnSEPAylYhHBTX2",
        },
      },
    ],
  };
};

/**
 * Generates a random metadata object.
 *
 * @returns A random metadata object
 */
export const createMetadata = (): { [x: string]: unknown } => ({
  meta: crypto.randomBytes(32).toString("hex"),
});

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
      const pubPoint = ec.keyFromPublic(keyHex, "hex").getPublic();
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
