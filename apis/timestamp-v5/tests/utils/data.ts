/**
 * Collection of functions for generating fake data to be used in the tests.
 */
import { randomBytes } from "node:crypto";
import type { DIDDocument, JsonWebKey } from "did-resolver";
import { calculateJwkThumbprint } from "jose";
import { ethers } from "ethers";
import { EbsiWallet } from "@cef-ebsi/wallet-lib";
import { encode } from "@ebsiint-api/shared";
import {
  HashAlgo,
  Owner,
  Record,
  TimestampSet,
  Version,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../.graphclient/index.js";

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

export const HASHES_TOTAL = 12;
export const HASH_ALGORITHMS_TOTAL = 3;
export const RECORDS_TOTAL = 3;
export const dummyEthAddresses = [
  ethers.Wallet.createRandom().address,
  ethers.Wallet.createRandom().address,
];

const now = Math.floor(Date.now() / 1000);

const hashAlgos: HashAlgo[] = [
  {
    id: "0",
    ianaName: "sha256",
    multiHash: "sha2-256",
    oid: "2.16.840.1.101.3.4.2.1",
    outputLength: "256",
    status: "active",
  },
  {
    id: "1",
    ianaName: "sha384",
    multiHash: "sha2-384",
    oid: "2.16.840.1.101.3.4.2.2",
    outputLength: "384",
    status: "active",
  },
  ...Array(HASH_ALGORITHMS_TOTAL - 2)
    .fill(undefined)
    .map((_, i) => ({
      id: `${i + 2}`,
      ianaName: `sha${i + 2}`,
      multiHash: `sha2-${i + 2}`,
      oid: `2.16.840.1.101.3.4.2.${i + 2}`,
      outputLength: `${i + 2}`,
      status: "active" as const,
    })),
];

const timestampSets: TimestampSet[] = Array(HASHES_TOTAL)
  .fill(undefined)
  .map(() => {
    const hashValue = `0x${randomBytes(32).toString("hex")}`;
    const id = ethers.utils.sha256(hashValue);
    const transactionHash = `0x${randomBytes(32).toString("hex")}`;
    const timestamp = now.toString();
    const timestampData = JSON.stringify({
      test: `0x${randomBytes(5).toString("hex")}`,
    });
    return {
      id,
      creator: dummyEthAddresses[0]!,
      blockNumber: "1",
      transactionHash,
      timestamp,
      hashAlgorithmId: "0",
      timestampData,
      hashValue,
      recordIdsFirstVersion: [],
    };
  });

const records: Record[] = [];
const owners: Owner[] = dummyEthAddresses.map((address) => ({
  id: address,
  recordIds: [],
}));

for (let i = 0; i < timestampSets.length; i += 1) {
  if (i % 2 === 0) {
    const recordId = `0x${randomBytes(32).toString("hex")}`;
    const version: Version = {
      id: `${recordId}0x00`,
      recordId,
      versionNumber: "0",
      timestamps: [timestampSets[i]!],
      infos: [
        {
          id: `0x${randomBytes(32).toString("hex")}`,
          content: `0x${Buffer.from(
            JSON.stringify({
              testinfo: `0x${randomBytes(5).toString("hex")}`,
            }),
          ).toString("hex")}`,
        },
      ],
    };
    const record: Record = {
      id: recordId,
      owners: dummyEthAddresses.map((address) => ({
        id: `${recordId}${address}`,
        notBefore: now.toString(),
        notAfter: (now + 5 * 365 * 24 * 60 * 60).toString(),
      })),
      versions: [version],
    };
    timestampSets[i]!.recordIdsFirstVersion.push(record);
    records.push(record);
    owners.forEach((owner) => {
      owner.recordIds.push(record);
    });
  } else {
    // add a new version to last record
    const record = records[records.length - 1]!;
    const version: Version = {
      id: `${record.id}0x01`,
      recordId: record.id,
      versionNumber: "1",
      timestamps: [timestampSets[i]!],
      infos: [
        {
          id: `0x${randomBytes(32).toString("hex")}`,
          content: `0x${Buffer.from(
            JSON.stringify({
              testinfo: `0x${randomBytes(5).toString("hex")}`,
            }),
          ).toString("hex")}`,
        },
      ],
    };
    record.versions.push(version);
  }
}

export const dummyData = {
  hashAlgos,
  timestampSets,
  records,
  owners,
};
