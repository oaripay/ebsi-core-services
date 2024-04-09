/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import type { DIDDocument, JsonWebKey } from "did-resolver";
import { calculateJwkThumbprint } from "jose";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";

export interface UserDetails {
  kid: string;
  did: string;
  didDocument: DIDDocument;
  thumbprint: string;
  wallet: ethers.Wallet;
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
}

export async function createUser(wallet?: ethers.Wallet): Promise<UserDetails> {
  const did = EbsiWallet.createDid();
  const w = wallet || ethers.Wallet.createRandom();
  const privateKeyJwk = encode.privateKey.fromHexToJWK(
    w.privateKey,
  ) as unknown as JsonWebKey;
  const publicKeyJwk = encode.publicKey.fromHexToJWK(
    w.publicKey,
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
    privateKeyJwk,
    publicKeyJwk,
  };
}
