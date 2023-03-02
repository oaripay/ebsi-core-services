import type { KeyObject } from "node:crypto";
import { exportJWK } from "jose";
import type { JWK } from "jose";
import EbsiWallet from "@cef-ebsi/wallet-lib";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import { generateKeys, getPrivateKeyHex } from "./keys";

export async function createTestClient(): Promise<{
  keys: {
    type: string;
    id: string;
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
    "@context": "https://www.w3.org/ns/did/v1",
    id: did,
    verificationMethod: [] as NonNullable<DIDDocument["verificationMethod"]>,
    authentication: [`${did}#keys-1`],
    assertionMethod: [] as NonNullable<DIDDocument["assertionMethod"]>,
  } satisfies DIDDocument;

  let privateKeyHexES256K = "";
  const algs = ["ES256K", "ES256", "RS256", "EdDSA"] as const;
  const types = [
    "Secp256k1VerificationKey2018",
    "Secp256r1VerificationKey2018",
    "RsaVerificationKey2018",
    "Ed25519VerificationKey2018",
  ];
  const keys = [];
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < algs.length; i += 1) {
    const id = `${did}#keys-${i + 1}`;
    const ks = await generateKeys(algs[i]);
    const jwk = await exportJWK(ks.publicKey);
    const jwkPriv = await exportJWK(ks.privateKey);
    const type = types[i];
    if (algs[i] === "ES256K") {
      privateKeyHexES256K = await getPrivateKeyHex(ks.privateKey);
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
