import "../../../../contracts/timestamp/src/types/hardhat.d.ts";

import hre from "hardhat";

import { Timestamp } from "@ebsiint-sc/timestamp";
import "@nomiclabs/hardhat-ethers";
import { Contract, ContractTransaction, ethers } from "ethers";
import { HashName } from "multihashes";
import { createHash, randomBytes, randomInt } from "node:crypto";

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
  tx: ContractTransaction;
}

interface RecordObject {
  hashAlgorithmIds: number[];
  hashValues: string[];
  recordId: string;
  timestampData: string[];
  versionInfo: string;
}

export async function deployTimestampContract(): Promise<{
  policyContractMock: Contract;
  timestampContract: Timestamp;
}> {
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
        RecordLib: rsLib.address,
        TimestampLib: tsLib.address,
      },
    },
  );

  const timestampContract =
    await timestampContractFactory.deploy(testTprAddress);

  await timestampContract.initialize(1);
  await timestampContract.setTrustedPoliciesRegistryAddress();
  await policyContractMock.setPolicyResult(true);

  return { policyContractMock, timestampContract };
}

export async function insertHash(
  contract: Timestamp,
  hashAlgorithm: HashAlgorithmObject,
): Promise<HashObject> {
  const hashAlgorithmIds = [0];
  const hashValues = [
    `0x${createHash(multihashToNodeHashAlg[hashAlgorithm.multihash])
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

export async function insertHashAlgorithm(
  contract: Timestamp,
): Promise<HashAlgorithmObject> {
  const ianaName = validHashAlgorithms[randomInt(validHashAlgorithms.length)]!;
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
      `0x${createHash(multihashToNodeHashAlg[hashAlgorithm.multihash])
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
  const enc = ethers.utils.defaultAbiCoder.encode(types, values);
  const recordId = ethers.utils.sha256(enc);

  return {
    hashAlgorithmIds,
    hashValues,
    recordId,
    timestampData,
    versionInfo,
  };
}

export async function setupTestEnv(opts: SetupOptions): Promise<{
  hashAlgorithms: HashAlgorithmObject[];
  hashes: HashObject[];
  policyContractMock: Contract;
  provider: ethers.providers.JsonRpcProvider;
  records: RecordObject[];
  sender: string;
  timestampContract: Timestamp;
}> {
  const { hashAlgorithmsTotal, hashesTotal, recordsTotal } = {
    hashAlgorithmsTotal: 1,
    hashesTotal: 0,
    recordsTotal: 1,
    ...opts,
  };
  const ethersProvider = hre.ethers.provider;
  const sender = await ethersProvider.getSigner().getAddress();

  // Deploy contract
  const { policyContractMock, timestampContract } =
    await deployTimestampContract();

  // Insert fake data
  const hashAlgorithms: HashAlgorithmObject[] = [];
  for (let i = 0; i < hashAlgorithmsTotal; i++) {
    hashAlgorithms.push(await insertHashAlgorithm(timestampContract));
  }

  const records: RecordObject[] = [];
  for (let i = 0; i < recordsTotal; i++) {
    records.push(
      await insertRecord(timestampContract, sender, hashAlgorithms[0]!),
    );
  }

  const hashes: HashObject[] = [];
  for (let i = 0; i < hashesTotal; i++) {
    hashes.push(await insertHash(timestampContract, hashAlgorithms[0]!));
  }

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
