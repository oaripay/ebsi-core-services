import fromKeyLike, { JWK } from "jose/jwk/from_key_like";
import crypto from "crypto";
import { DIDDocument } from "did-resolver";
import bs58 from "bs58";
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
  const did = `did:ebsi:${bs58.encode(crypto.randomBytes(32))}`;

  const didDocument = {
    "@context": "https://w3id.org/did/v1",
    id: did,
    verificationMethod: [],
    authentication: [did],
    assertionMethod: [],
  };

  let privateKeyHexES256K = "";
  const algs = ["ES256K", "ES256", "RS256", "EdDSA"];
  const types = [
    "Secp256k1VerificationKey2018",
    "Secp256r1VerificationKey2018",
    "RsaVerificationKey2018",
    "Ed25519VerificationKey2018",
  ];
  const keys = [];
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < 4; i += 1) {
    const id = `${did}#keys-${i + 1}`;
    const ks = await generateKeys(algs[i]);
    const jwk = await fromKeyLike(ks.publicKey);
    const jwkPriv = await fromKeyLike(ks.privateKey);
    const type = types[i];
    if (algs[i] === "ES256K") {
      privateKeyHexES256K = await getPrivateKeyHex(ks.privateKey);
    }
    if (algs[i] === "EdDSA") {
      const enc = {
        jwk: await fromKeyLike(ks.publicKeyEncryption),
        jwkPriv: await fromKeyLike(ks.privateKeyEncryption),
      };
      didDocument.verificationMethod.push({
        id,
        type,
        controller: did,
        publicKeyJwk: { ...jwk, use: "sig" },
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
        publicKeyJwk: jwk,
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
