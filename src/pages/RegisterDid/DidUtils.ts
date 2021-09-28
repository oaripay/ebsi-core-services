import { ethers } from "ethers";
import { ec as EC } from "elliptic";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import bs58 from "bs58";
import crypto from "crypto";

type DocumentType = {
  "@context": string;
  id: string;
  verificationMethod: {
    id: string;
    type: string;
    controller: string;
    publicKeyHex: string;
    publicKeyJwk: string;
    publicKeyBase58: string;
  }[];
  authentication: string[];
  assertionMethod: string[];
};

type DidParamsOptions = {
  hashAlgorithmId?: number;
  timestamp?: {
    data: string;
  };
  meta?: {
    data: string;
  };
};

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

export function createTimestamp() {
  return {
    data: crypto.randomBytes(32).toString("hex"),
  };
}

export function computeIdentifier(did: string): string {
  return `0x${Buffer.from(did).toString("hex")}`;
}

export function buildDidParams(
  document: DocumentType,
  options?: DidParamsOptions
) {
  const timestamp = options?.timestamp || createTimestamp();
  const metadata = options?.meta || createMetadata();
  const bufferTimestamp = Buffer.from(JSON.stringify(timestamp));
  const bufferDocument = Buffer.from(JSON.stringify(document));
  const bufferMetadata = Buffer.from(JSON.stringify(metadata));
  const documentHash = ethers.utils.sha256(bufferDocument);
  return {
    info: {
      title: "Did document",
      data: document,
    },
    param: {
      identifier: computeIdentifier(document.id),
      hashAlgorithmId: options?.hashAlgorithmId || 1,
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

export function createDidIdentifier() {
  return EbsiWallet.createDid();
}

export function onlyUnique(
  value: string | number,
  index: string | number,
  self: any
) {
  return self.indexOf(value) === index;
}
