// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/timestamp/src/types/hardhat.d.ts" />
import { createHash, randomBytes, randomInt } from "node:crypto";
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ContractTransaction, Contract, ethers } from "ethers";
import { HashName } from "multihashes";
import { Timestamp } from "@ebsiint-sc/timestamp";

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

  const timestampContract =
    await timestampContractFactory.deploy(testTprAddress);

  await timestampContract.initialize(1);
  await timestampContract.setTrustedPoliciesRegistryAddress();
  await policyContractMock.setPolicyResult(true);

  return { timestampContract, policyContractMock };
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
        `0x${createHash(multihashToNodeHashAlg[hashAlgorithm.multihash])
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

export interface SetupOptions {
  hashAlgorithmsTotal?: number;
  recordsTotal?: number;
  hashesTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    hashAlgorithmsTotal: 1,
    recordsTotal: 1,
    hashesTotal: 0,
  },
): Promise<{
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

  // Insert fake data

  const hashAlgorithms = await Promise.all(
    Array(opts.hashAlgorithmsTotal)
      .fill(0)
      .map(() => insertHashAlgorithm(timestampContract)),
  );

  const records = await Promise.all(
    Array(opts.recordsTotal)
      .fill(0)
      .map(() => insertRecord(timestampContract, sender, hashAlgorithms[0]!)),
  );

  const hashes = await Promise.all(
    Array(opts.hashesTotal)
      .fill(0)
      .map(() => insertHash(timestampContract, hashAlgorithms[0]!)),
  );

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
