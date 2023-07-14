import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { exportJWK, generateKeyPair } from "jose";
import type { JWK } from "jose";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import type { DIDDocument, JsonWebKey } from "did-resolver";

export async function generateKeys(alg: string): Promise<{
  publicKey: KeyObject;
  privateKey: KeyObject;
  publicKeyEncryption?: KeyObject;
  privateKeyEncryption?: KeyObject;
}> {
  const { publicKey, privateKey } = (await generateKeyPair(alg)) as {
    publicKey: KeyObject;
    privateKey: KeyObject;
  };

  let publicKeyEncryption: KeyObject | undefined;
  let privateKeyEncryption: KeyObject | undefined;
  if (alg === "EdDSA") {
    // For Edward we have to use the keys for encryption
    const keysEncryption = generateKeyPairSync("x25519");
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

export async function createTestClient(): Promise<{
  keys: {
    type: string;
    id: string;
    alg: string;
    privateKeyJwk: JWK;
    publicKeyJwk: JWK;
    privateKeyEncryptionJwk: JWK;
    publicKeyEncryptionJwk: JWK;
  }[];
  keysBase64: string;
  did: string;
  privateKeyHexES256K: string;
  didDocument: DIDDocument;
}> {
  const did = EbsiWallet.createDid();

  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    controller: [did],
    verificationMethod: [] as NonNullable<DIDDocument["verificationMethod"]>,
    authentication: [`${did}#keys-1`],
    assertionMethod: [] as NonNullable<DIDDocument["assertionMethod"]>,
  } satisfies DIDDocument;

  let privateKeyHexES256K = "";
  const algs = ["ES256K", "ES256", "RS256", "EdDSA"] as const;
  const keys: {
    type: string;
    id: string;
    alg: string;
    privateKeyJwk: JWK;
    publicKeyJwk: JWK;
    privateKeyEncryptionJwk: JWK;
    publicKeyEncryptionJwk: JWK;
  }[] = [];
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < algs.length; i += 1) {
    const id = `${did}#keys-${i + 1}`;
    const ks = await generateKeys(algs[i]);
    const jwk = await exportJWK(ks.publicKey);
    const jwkPriv = await exportJWK(ks.privateKey);
    const type = "JsonWebKey2020";
    if (algs[i] === "ES256K") {
      privateKeyHexES256K = encode.privateKey.fromJWKToHex(jwkPriv);
    }
    if (algs[i] === "EdDSA") {
      const enc = {
        jwk: await exportJWK(ks.publicKeyEncryption as KeyObject),
        jwkPriv: await exportJWK(ks.privateKeyEncryption as KeyObject),
      };

      didDocument.verificationMethod.push({
        id,
        type,
        controller: did,
        publicKeyJwk: { ...jwk, use: "sig" } as JsonWebKey,
      });

      keys.push({
        type,
        id,
        alg: algs[i],
        publicKeyJwk: { ...jwk, use: "sig" },
        privateKeyJwk: { ...jwkPriv, use: "sig" },
        publicKeyEncryptionJwk: { ...enc.jwk, use: "enc" },
        privateKeyEncryptionJwk: { ...enc.jwkPriv, use: "enc" },
      });
    } else {
      didDocument.verificationMethod.push({
        id,
        type,
        controller: did,
        publicKeyJwk: jwk as JsonWebKey,
      });
      keys.push({
        type,
        id,
        alg: algs[i],
        publicKeyJwk: jwk,
        privateKeyJwk: jwkPriv,
        publicKeyEncryptionJwk: jwk,
        privateKeyEncryptionJwk: jwkPriv,
      });
    }
    didDocument.assertionMethod.push(id);
  }

  return {
    keys,
    keysBase64: Buffer.from(JSON.stringify(keys)).toString("base64"),
    did,
    privateKeyHexES256K,
    didDocument,
  };
}

export default createTestClient;
