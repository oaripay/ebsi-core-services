import type { DIDDocument, JsonWebKey } from "did-resolver";

import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import { ethers } from "ethers";
import { calculateJwkThumbprint } from "jose";
/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";

import {
  HashAlgo,
  Owner,
  Record,
  TimestampSet,
  Version,
} from "../../.graphclient/index.js";

export interface UserDetails {
  did: string;
  didDocument: DIDDocument;
  kid: string;
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
  thumbprint: string;
  wallet: ethers.BaseWallet;
}

export async function createUser(wallet?: ethers.Wallet): Promise<UserDetails> {
  const did = EbsiWallet.createDid();
  const w = wallet ?? ethers.Wallet.createRandom();
  const privateKeyJwk = encode.privateKey.fromHexToJWK(
    w.privateKey,
  ) as unknown as JsonWebKey;
  const publicKeyJwk = encode.publicKey.fromHexToJWK(
    w.signingKey.publicKey,
  ) as unknown as JsonWebKey;
  const thumbprint = await calculateJwkThumbprint(publicKeyJwk, "sha256");

  const kid = `${did}#${thumbprint}`;
  const didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    assertionMethod: [kid],
    authentication: [kid],
    capabilityInvocation: [kid],
    controller: [did],
    id: did,
    verificationMethod: [
      {
        controller: did,
        id: kid,
        publicKeyJwk,
        type: "JsonWebKey2020",
      },
    ],
  };

  return {
    did,
    didDocument,
    kid,
    privateKeyJwk,
    publicKeyJwk,
    thumbprint,
    wallet: w,
  };
}

export const HASHES_TOTAL = 12;
export const HASH_ALGORITHMS_TOTAL = 3;
export const RECORDS_TOTAL = 3;
export const dummyEthAddresses = [
  ethers.Wallet.createRandom().address,
  ethers.Wallet.createRandom().address,
];

const now = Math.floor(Date.now() / 1000);

const hashAlgos = [
  {
    ianaName: "sha256",
    id: "0",
    multiHash: "sha2-256",
    oid: "2.16.840.1.101.3.4.2.1",
    outputLength: "256",
    status: "active",
  },
  {
    ianaName: "sha384",
    id: "1",
    multiHash: "sha2-384",
    oid: "2.16.840.1.101.3.4.2.2",
    outputLength: "384",
    status: "active",
  },
  ...Array.from({ length: HASH_ALGORITHMS_TOTAL - 2 }).map((_, i) => ({
    ianaName: `sha${i + 2}`,
    id: `${i + 2}`,
    multiHash: `sha2-${i + 2}`,
    oid: `2.16.840.1.101.3.4.2.${i + 2}`,
    outputLength: `${i + 2}`,
    status: "active" as const,
  })),
] satisfies HashAlgo[];

const timestampSets = Array.from({ length: HASHES_TOTAL }).map(() => {
  const hashValue = `0x${randomBytes(32).toString("hex")}`;
  const id = ethers.sha256(hashValue);
  const transactionHash = `0x${randomBytes(32).toString("hex")}`;
  const timestamp = now.toString();
  const timestampData = JSON.stringify({
    test: `0x${randomBytes(5).toString("hex")}`,
  });
  return {
    blockNumber: "1",
    creator: dummyEthAddresses[0]!,
    hashAlgorithmId: "0",
    hashValue,
    id,
    recordIdsFirstVersion: [] as Record[],
    timestamp,
    timestampData,
    transactionHash,
  } satisfies TimestampSet;
});

const records: Record[] = [];
const owners = dummyEthAddresses.map(
  (address) =>
    ({
      id: address,
      recordIds: [] as Record[],
    }) satisfies Owner,
);

for (const [i, timestampSet] of timestampSets.entries()) {
  if (i % 2 === 0) {
    const recordId = `0x${randomBytes(32).toString("hex")}`;
    const version: Version = {
      id: `${recordId}0x00`,
      infos: [
        {
          content: `0x${Buffer.from(
            JSON.stringify({
              testinfo: `0x${randomBytes(5).toString("hex")}`,
            }),
          ).toString("hex")}`,
          id: `0x${randomBytes(32).toString("hex")}`,
        },
      ],
      recordId,
      timestamps: [timestampSet],
      versionNumber: "0",
    };
    const record: Record = {
      id: recordId,
      owners: dummyEthAddresses.map((address) => ({
        id: `${recordId}${address}`,
        notAfter: (now + 5 * 365 * 24 * 60 * 60).toString(),
        notBefore: now.toString(),
      })),
      versions: [version],
    };
    timestampSet.recordIdsFirstVersion.push(record);
    records.push(record);
    for (const owner of owners) {
      owner.recordIds.push(record);
    }
  } else {
    // add a new version to last record
    const record = records.at(-1)!;
    const version: Version = {
      id: `${record.id}0x01`,
      infos: [
        {
          content: `0x${Buffer.from(
            JSON.stringify({
              testinfo: `0x${randomBytes(5).toString("hex")}`,
            }),
          ).toString("hex")}`,
          id: `0x${randomBytes(32).toString("hex")}`,
        },
      ],
      recordId: record.id,
      timestamps: [timestampSet],
      versionNumber: "1",
    };
    record.versions.push(version);
  }
}

export const dummyData = {
  hashAlgos,
  owners,
  records,
  timestampSets,
};
