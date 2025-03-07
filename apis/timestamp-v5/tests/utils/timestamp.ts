import "@ebsiint-sc/timestamp-v3/dist/hardhat.d.ts";

import hre from "hardhat";

import type { PolicyRegistryMock, Timestamp } from "@ebsiint-sc/timestamp-v3";
import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";
import type { HashName } from "multihashes";

import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";
import { createHash, randomBytes } from "node:crypto";

import { dummyData } from "./data.ts";

export const validHashAlgorithms = [
  "sha-256",
  "sha-512",
  "sha3-224",
  "sha3-256",
  "sha3-384",
  "sha3-512",
] as const;

export type ValidIanaHashAlgorithms = (typeof validHashAlgorithms)[number];

export const ianaToMultihashAlg = {
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
  "sha-256": "sha2-256",
  "sha-512": "sha2-512",
} as const satisfies Record<ValidIanaHashAlgorithms, HashName>;

export type ValidMultihashAlgorithms =
  (typeof ianaToMultihashAlg)[ValidIanaHashAlgorithms];

export const multihashToNodeHashAlg = {
  "sha2-256": "sha256",
  "sha2-512": "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
} as const satisfies Record<ValidMultihashAlgorithms, string>;

export const outputLengths = {
  "sha3-224": 224,
  "sha3-256": 256,
  "sha3-384": 384,
  "sha3-512": 512,
  "sha-256": 256,
  "sha-512": 512,
} as const satisfies Record<ValidIanaHashAlgorithms, number>;

export interface SetupOptions {
  hashAlgorithmsTotal?: number;
  hashesTotal?: number;
  recordsTotal?: number;
}

interface HashAlgorithmObject {
  ianaName: ValidIanaHashAlgorithms;
  multihash: ValidMultihashAlgorithms;
  oid: string;
  outputLength: number;
  status: number;
}

interface HashObject {
  hashAlgorithmIds: number[];
  hashValues: string[];
  timestampData: string[];
  tx: {
    blockNumber: string;
    hash: string;
  };
}

interface RecordObject {
  hashAlgorithmIds: number[];
  hashValues: string[];
  recordId: string;
  timestampData: string[];
  versionInfo: string;
}

export async function deployTimestampContract(): Promise<{
  policyContractMock: PolicyRegistryMock;
  timestampContract: Timestamp;
}> {
  const [upgrader] = await hre.ethers.getSigners();
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");
  const tempPolicyContract = await policyRegistryFactory.deploy();

  const bytecode = await hre.ethers.provider.getCode(
    await tempPolicyContract.getAddress(),
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(
    testTprAddress,
  ) as PolicyRegistryMock;

  // Deploy libs
  const stringManipFactory = await hre.ethers.getContractFactory("StringManip");
  const stringManipLib = await stringManipFactory.deploy();

  const haFactory = await hre.ethers.getContractFactory("HashAlgoLib");
  const haLib = await haFactory.deploy();

  const tsFactory = await hre.ethers.getContractFactory("TimestampLib", {});
  const tsLib = await tsFactory.deploy();

  const rsFactory = await hre.ethers.getContractFactory("RecordLib", {
    libraries: {
      StringManip: await stringManipLib.getAddress(),
    },
  });
  const rsLib = await rsFactory.deploy();

  const timestampContractFactory = await hre.ethers.getContractFactory(
    "Timestamp",
    {
      libraries: {
        HashAlgoLib: await haLib.getAddress(),
        RecordLib: await rsLib.getAddress(),
        TimestampLib: await tsLib.getAddress(),
      },
    },
  );

  const timestampContract = await hre.upgrades.deployProxy(
    timestampContractFactory,
    [upgrader!.address, testTprAddress],
    { unsafeAllowLinkedLibraries: true },
  );

  await policyContractMock.setPolicyResult(true);

  return { policyContractMock, timestampContract };
}

export async function insertHash(
  contract: Timestamp,
  hashAlgorithm: HashAlgorithmObject,
): Promise<HashObject> {
  const hashAlgorithmIds = [0];
  const hashValues = [
    `0x${createHash(multihashToNodeHashAlg[hashAlgorithm.multihash] as string)
      .update(randomBytes(32).toString("hex"), "hex")
      .digest()
      .toString("hex")}`,
  ];
  const timestampData = [`0x${randomBytes(4).toString("hex")}`];

  const tx = await contract.timestampHashes(
    hashAlgorithmIds,
    hashValues,
    timestampData,
  );

  return {
    hashAlgorithmIds,
    hashValues,
    timestampData,
    // @ts-expect-error Error due to contracts using CommonJS modules
    tx,
  };
}

export async function insertHashAlgorithm(
  contract: Timestamp,
  index: number,
): Promise<HashAlgorithmObject> {
  const ianaName = validHashAlgorithms[index]!;
  const outputLength = outputLengths[ianaName];
  const oid = "oid-test";
  const status = 1;
  const multihash = ianaToMultihashAlg[ianaName];

  await contract.insertHashAlgorithm(
    outputLength,
    ianaName,
    oid,
    status,
    multihash,
  );

  return {
    ianaName,
    multihash,
    oid,
    outputLength,
    status,
  };
}

export async function insertRecord(
  contract: Timestamp,
  sender: string,
  hashAlgorithm: HashAlgorithmObject,
): Promise<RecordObject> {
  const hashAlgorithmIds = Array.from({ length: 3 }).fill(0) as number[];
  const hashValues = Array.from({ length: 3 }).map(
    () =>
      `0x${createHash(multihashToNodeHashAlg[hashAlgorithm.multihash] as string)
        .update(randomBytes(32).toString("hex"), "hex")
        .digest()
        .toString("hex")}`,
  );
  const timestampData = Array.from({ length: 3 }).map(
    () => `0x${randomBytes(4).toString("hex")}`,
  );
  const versionInfo = `0x${Buffer.from(
    JSON.stringify({ test: "my test" }),
    "utf8",
  ).toString("hex")}`;

  const { blockNumber } = await contract.timestampRecordHashes(
    hashAlgorithmIds,
    hashValues,
    timestampData,
    versionInfo,
  );

  const types = ["address", "uint256", "bytes"];
  const values = [sender, blockNumber, hashValues[0]];
  const enc = ethers.AbiCoder.defaultAbiCoder().encode(types, values);
  const recordId = ethers.sha256(enc);

  return {
    hashAlgorithmIds,
    hashValues,
    recordId,
    timestampData,
    versionInfo,
  };
}

export async function setupTestEnv(): Promise<{
  hashAlgorithms: HashAlgorithmObject[];
  hashes: HashObject[];
  policyContractMock: PolicyRegistryMock;
  provider: HardhatEthersProvider;
  records: RecordObject[];
  sender: string;
  timestampContract: Timestamp;
}> {
  const ethersProvider = hre.ethers.provider;
  const signer = await ethersProvider.getSigner();
  const sender = await signer.getAddress();

  // Deploy contract
  const { policyContractMock, timestampContract } =
    await deployTimestampContract();

  await timestampContract.insertHashAlgorithm(
    256,
    "sha256",
    "2.16.840.1.101.3.4.2.1",
    1,
    "sha2-256",
  );

  const hashAlgorithms = dummyData.hashAlgos.map((h) => ({
    ianaName: h.ianaName as ValidIanaHashAlgorithms,
    multihash: h.multiHash as ValidMultihashAlgorithms,
    oid: h.oid,
    outputLength: Number(h.outputLength),
    status: h.status === "active" ? 0 : 1,
  }));

  const records = dummyData.records.map((r) => ({
    hashAlgorithmIds: r.versions[0]!.timestamps.map((t) =>
      Number(t.hashAlgorithmId),
    ),
    hashValues: r.versions[0]!.timestamps.map((t) => t.hashValue),
    recordId: r.id,
    timestampData: r.versions[0]!.timestamps.map((t) => t.timestampData),
    versionInfo: r.versions[0]!.infos[0]!.content,
  }));

  const hashes = dummyData.timestampSets.map((t) => ({
    hashAlgorithmIds: [Number(t.hashAlgorithmId)],
    hashValues: [t.hashValue],
    timestampData: [t.timestampData],
    tx: {
      blockNumber: t.blockNumber,
      hash: t.transactionHash,
    },
  }));

  // Return test env variables
  return {
    hashAlgorithms,
    hashes,
    policyContractMock,
    provider: ethersProvider,
    records,
    sender,
    timestampContract,
  };
}
