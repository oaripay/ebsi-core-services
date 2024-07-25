/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import type { DIDDocument } from "did-resolver";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { getPublicKeyJwk, getSigner } from "@ebsiint-api/shared";
import type { EbsiIssuer } from "@cef-ebsi/verifiable-credential";
import { hexToBytes } from "did-jwt";

export interface UserDetails extends EbsiIssuer {
  didDocument: DIDDocument;
  thumbprint: string;
  wallet: ethers.Wallet;
}

export async function createUser(wallet?: ethers.Wallet): Promise<UserDetails> {
  const did = EbsiWallet.createDid();
  const w = wallet || ethers.Wallet.createRandom();
  const privateKey = hexToBytes(w.privateKey);
  const {
    kid: publicKeyJwkKid,
    alg,
    ...publicKeyJwk
  } = await getPublicKeyJwk(privateKey, "ES256K");
  const thumbprint = publicKeyJwkKid;

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
    signer: getSigner(privateKey, alg),
    alg,
  };
}
