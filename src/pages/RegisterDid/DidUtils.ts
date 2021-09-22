import { ethers } from "ethers";
import { ec as EC } from "elliptic";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import bs58 from "bs58";
import crypto from "crypto";

export function fromHexString(hexString: string): Uint8Array {
  const match = hexString.match(/.{1,2}/g);
  if (!match) throw new Error("String could not be parsed");
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

export function createMetadata() {
  return {
    meta: crypto.randomBytes(32).toString("hex"),
  };
}

export const getIdentifierFromWalletAddr = (walletAddress: string) => {
  return `did:ebsi:${walletAddress}`;
};

export function computeIdentifier(did: string): string {
  return `0x${Buffer.from(did).toString("hex")}`;
}

export function createTimestamp() {
  return {
    data: crypto.randomBytes(32).toString("hex"),
  };
}

export function buildDidParams(document: any) {
  const bufferTimestamp = Buffer.from(JSON.stringify(createTimestamp()));
  const bufferDocument = Buffer.from(JSON.stringify(document));
  const bufferMetadata = Buffer.from(JSON.stringify(createMetadata()));
  const documentHash = ethers.utils.sha256(bufferDocument);
  return {
    info: {
      title: "Did document",
      data: document,
    },
    param: {
      identifier: computeIdentifier(document.id),
      hashAlgorithmId: 1, // sha256
      hashValue: documentHash,
      didVersionInfo: `0x${bufferDocument.toString("hex")}`,
      timestampData: `0x${bufferTimestamp.toString("hex")}`,
      didVersionMetadata: `0x${bufferMetadata.toString("hex")}`,
    },
  };
}

export function createDidDocument(didUser: string, publicKey: string) {
  const ec = new EC("secp256k1");
  const key = ec.keyFromPublic(publicKey.slice(2), "hex");
  const publicKeyObj = {
    publicKeyHex: publicKey.slice(2),
    publicKeyJwk: EbsiWallet.formatPublicKey(key.getPublic(), "jwk"),
    publicKeyBase58: bs58.encode(fromHexString(publicKey.slice(2))),
  };
  return {
    "@context": "https://w3id.org/did/v1",
    id: didUser,
    verificationMethod: [
      {
        id: `${didUser}#keys-1`,
        type: "Secp256k1VerificationKey2018",
        controller: didUser,
        ...publicKeyObj,
      },
    ],
    authentication: [`${didUser}#keys-1`],
    assertionMethod: [`${didUser}#keys-1`],
  };
}
