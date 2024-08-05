// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/timestamp-v3/src/types/hardhat.d.ts" />
import { createHash, randomBytes } from "node:crypto";
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers, type ContractTransaction, type Contract } from "ethers";
import type { HashName } from "multihashes";
import { Timestamp } from "@ebsiint-sc/timestamp-v3";
import { dummyData } from "./data.js";

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
  "sha-256": "sha2-256",
  "sha-512": "sha2-512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
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
  "sha-256": 256,
  "sha-512": 512,
  "sha3-224": 224,
  "sha3-256": 256,
  "sha3-384": 384,
  "sha3-512": 512,
} as const satisfies Record<ValidIanaHashAlgorithms, number>;

interface HashAlgorithmObject {
  outputLength: number;
  ianaName: ValidIanaHashAlgorithms;
  oid: string;
  status: number;
  multihash: ValidMultihashAlgorithms;
}

interface RecordObject {
  recordId: string;
  hashAlgorithmIds: number[];
  hashValues: string[];
  timestampData: string[];
  versionInfo: string;
}

interface HashObject {
  hashAlgorithmIds: number[];
  hashValues: string[];
  timestampData: string[];
  tx: ContractTransaction;
}

export async function deployTimestampContract(): Promise<{
  timestampContract: Timestamp;
  policyContractMock: Contract;
}> {
  const [upgrader] = await hre.ethers.getSigners();
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address,
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(testTprAddress);

  // Deploy libs
  const stringManipFactory = await hre.ethers.getContractFactory("StringManip");
  const stringManipLib = await stringManipFactory.deploy();

  const haFactory = await hre.ethers.getContractFactory("HashAlgoLib");
  const haLib = await haFactory.deploy();

  const tsFactory = await hre.ethers.getContractFactory("TimestampLib", {});
  const tsLib = await tsFactory.deploy();

  const rsFactory = await hre.ethers.getContractFactory("RecordLib", {
    libraries: {
      StringManip: stringManipLib.address,
    },
  });
  const rsLib = await rsFactory.deploy();

  const timestampContractFactory = await hre.ethers.getContractFactory(
    "Timestamp",
    {
      libraries: {
        HashAlgoLib: haLib.address,
        TimestampLib: tsLib.address,
        RecordLib: rsLib.address,
      },
    },
  );

  const timestampContract = (await hre.upgrades.deployProxy(
    timestampContractFactory,
    [upgrader!.address, testTprAddress],
    { unsafeAllowLinkedLibraries: true },
  )) as unknown as Timestamp;

  await policyContractMock.setPolicyResult(true);

  return { timestampContract, policyContractMock };
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
    outputLength,
    ianaName,
    oid,
    status,
    multihash,
  };
}

export async function insertRecord(
  contract: Timestamp,
  sender: string,
  hashAlgorithm: HashAlgorithmObject,
): Promise<RecordObject> {
  const hashAlgorithmIds = Array(3).fill(0) as number[];
  const hashValues = Array(3)
    .fill(0)
    .map(
      () =>
        `0x${createHash(
          multihashToNodeHashAlg[hashAlgorithm.multihash] as string,
        )
          .update(randomBytes(32).toString("hex"), "hex")
          .digest()
          .toString("hex")}`,
    );
  const timestampData = Array(3)
    .fill(0)
    .map(() => `0x${randomBytes(4).toString("hex")}`);
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
  const enc = ethers.utils.defaultAbiCoder.encode(types, values);
  const recordId = ethers.utils.sha256(enc);

  return {
    recordId,
    hashAlgorithmIds,
    hashValues,
    timestampData,
    versionInfo,
  };
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
    tx,
  };
}

export interface SetupOptions {
  hashAlgorithmsTotal?: number;
  recordsTotal?: number;
  hashesTotal?: number;
}

export async function setupTestEnv(): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  timestampContract: Timestamp;
  policyContractMock: Contract;
  hashAlgorithms: HashAlgorithmObject[];
  records: RecordObject[];
  hashes: HashObject[];
  sender: string;
}> {
  const ethersProvider = hre.ethers.provider;
  const sender = await ethersProvider.getSigner().getAddress();

  // Deploy contract
  const { timestampContract, policyContractMock } =
    await deployTimestampContract();

  await timestampContract.insertHashAlgorithm(
    256,
    "sha256",
    "2.16.840.1.101.3.4.2.1",
    1,
    "sha2-256",
  );

  const hashAlgorithms = dummyData.hashAlgos.map((h) => ({
    outputLength: Number(h.outputLength),
    ianaName: h.ianaName as ValidIanaHashAlgorithms,
    oid: h.oid,
    status: h.status === "active" ? 0 : 1,
    multihash: h.multiHash as ValidMultihashAlgorithms,
  }));

  const records = dummyData.records.map((r) => ({
    recordId: r.id,
    hashAlgorithmIds: r.versions[0]!.timestamps.map((t) =>
      Number(t.hashAlgorithmId),
    ),
    hashValues: r.versions[0]!.timestamps.map((t) => t.hashValue),
    timestampData: r.versions[0]!.timestamps.map((t) => t.timestampData),
    versionInfo: r.versions[0]!.infos[0]!.content,
  }));

  const hashes = dummyData.timestampSets.map((t) => ({
    hashAlgorithmIds: [Number(t.hashAlgorithmId)],
    hashValues: [t.hashValue],
    timestampData: [t.timestampData],
    tx: {
      hash: t.transactionHash,
      blockNumber: t.blockNumber,
    } as unknown as ContractTransaction,
  }));

  // Return test env variables
  return {
    provider: ethersProvider,
    timestampContract,
    policyContractMock,
    hashAlgorithms,
    records,
    hashes,
    sender,
  };
}
