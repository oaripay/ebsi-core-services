import { ethers } from "ethers";
import crypto from "crypto";
import ganache from "ganache-core";
import {
  Timestamp,
  Timestamp__factory,
  RecordLib__factory,
  HashAlgoLib__factory,
  TimestampLib__factory,
  StringManip__factory,
} from "../../src/contracts/timestamp";

interface HashAlgorithmObject {
  outputLength: number;
  ianaName: string;
  oid: string;
  status: number;
}

interface RecordObject {
  recordId: string;
  hashAlgorithmIds: number[];
  hashValues: string[];
  timestampData: string[];
  versionInfo: string;
}

interface HashObect {
  hashAlgorithmIds: number[];
  hashValues: string[];
  timestampData: string[];
}

export async function deployTimestampContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<Timestamp> {
  const owner = ethersProvider.getSigner();

  // Deploy libs
  const stringManipLibAddress = (await new StringManip__factory(owner).deploy())
    .address;

  const recordLibAddress = (
    await new RecordLib__factory(
      {
        __$03a3ed36080dbf419ca536faa0da0f57a5$__: stringManipLibAddress,
      },
      owner
    ).deploy()
  ).address;

  const hashAlgoLibAddress = (await new HashAlgoLib__factory(owner).deploy())
    .address;

  const timestampLibAddress = (await new TimestampLib__factory(owner).deploy())
    .address;

  /*
    https://docs.soliditylang.org/en/latest/using-the-compiler.html#library-linking

    "If your contracts use libraries, you will notice that the bytecode contains substrings of the
    form __$53aea86b7d70b31448b230b20ae141a537$__. These are placeholders for the actual library
    addresses. The placeholder is a 34 character prefix of the hex encoding of the keccak256 hash
    of the fully qualified library name. The bytecode file will also contain lines of the form
    // <placeholder> -> <fq library name> at the end to help identify which libraries the
    placeholders represent. Note that the fully qualified library name is the path of its source
    file and the library name separated by :."

    Example:

    ethers.utils.keccak256(
      Buffer.from("contracts/timestamp/RecordLib.sol:RecordLib", "utf-8")
    )
    -> 0x4aa86fb47714171f15e6e85dc0e79cd2757be45d182cf82fb27a07f13b2b49c7

    Mapping:

    __$4aa86fb47714171f15e6e85dc0e79cd275$__ = "contracts/timestamp/RecordLib.sol:RecordLib"
    __$51d8af212ae13938afd29dd8a87e91365d$__ = "contracts/timestamp/HashAlgoLib.sol:HashAlgoLib"
    __$d57c960d617b3db721236e785ea0ace101$__ = "contracts/timestamp/TimestampLib.sol:TimestampLib"
  */

  const TimestampContract = await new Timestamp__factory(
    {
      __$4aa86fb47714171f15e6e85dc0e79cd275$__: recordLibAddress,
      __$51d8af212ae13938afd29dd8a87e91365d$__: hashAlgoLibAddress,
      __$d57c960d617b3db721236e785ea0ace101$__: timestampLibAddress,
    },
    owner
  ).deploy();

  return TimestampContract;
}

const validHashAlgorithms = [
  "sha-256",
  "sha-512",
  "sha3-224",
  "sha3-256",
  "sha3-384",
  "sha3-512",
] as const;

const outputLengths = {
  "sha-256": 256,
  "sha-512": 512,
  "sha3-224": 224,
  "sha3-256": 256,
  "sha3-384": 384,
  "sha3-512": 512,
};

export async function insertHashAlgorithm(
  contract: Timestamp
): Promise<HashAlgorithmObject> {
  const ianaName =
    validHashAlgorithms[Math.floor(Math.random() * validHashAlgorithms.length)];
  const outputLength = outputLengths[ianaName];
  const oid = "oid-test";
  const status = 1;
  await contract.insertHashAlgorithm(outputLength, ianaName, oid, status);
  return {
    outputLength,
    ianaName,
    oid,
    status,
  };
}

export async function insertRecord(
  contract: Timestamp,
  sender: string
): Promise<RecordObject> {
  const hashAlgorithmIds = Array(3).fill(0);
  const hashValues = Array(3)
    .fill(0)
    .map(() => `0x${crypto.randomBytes(4).toString("hex")}`);
  const timestampData = Array(3)
    .fill(0)
    .map(() => `0x${crypto.randomBytes(4).toString("hex")}`);
  const versionInfo = `0x${Buffer.from(
    JSON.stringify({ test: "my test" }),
    "utf8"
  ).toString("hex")}`;
  await contract.timestampRecordHashes(
    hashAlgorithmIds,
    hashValues,
    timestampData,
    versionInfo
  );

  const blockNumber = 2;
  const types = ["address", "uint256", "uint256"];
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

export async function insertHash(contract: Timestamp): Promise<HashObect> {
  const hashAlgorithmIds = [0];
  const hashValues = [`0x${crypto.randomBytes(4).toString("hex")}`];
  const timestampData = [`0x${crypto.randomBytes(4).toString("hex")}`];

  await contract.timestampHashes(hashAlgorithmIds, hashValues, timestampData);

  return {
    hashAlgorithmIds,
    hashValues,
    timestampData,
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
  }
): Promise<{
  provider: ethers.providers.Web3Provider;
  timestampContract: Timestamp;
  hashAlgorithms: HashAlgorithmObject[];
  records: RecordObject[];
  hashes: HashObect[];
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());
  const sender = await ethersProvider.getSigner().getAddress();

  // Deploy contract
  const timestampContract = await deployTimestampContract(ethersProvider);

  // Insert fake data

  const hashAlgorithms = await Promise.all(
    Array(opts.hashAlgorithmsTotal)
      .fill(0)
      .map(() => insertHashAlgorithm(timestampContract))
  );

  const records = await Promise.all(
    Array(opts.recordsTotal)
      .fill(0)
      .map(() => insertRecord(timestampContract, sender))
  );

  const hashes = await Promise.all(
    Array(opts.hashesTotal)
      .fill(0)
      .map(() => insertHash(timestampContract))
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    timestampContract,
    hashAlgorithms,
    records,
    hashes,
  };
}
