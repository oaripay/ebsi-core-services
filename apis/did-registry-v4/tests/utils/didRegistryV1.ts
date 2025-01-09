import "../../../../contracts/did-registry/src/types/hardhat.d.ts";

import hre from "hardhat";

import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";

import {
  DidRegistry as DidRegistryV1,
  PolicyRegistryMock,
} from "@ebsiint-sc/did-registry";
import canonicalize from "canonicalize";
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";
import { Artifact, FactoryOptions } from "hardhat/types";
import { HashName } from "multihashes";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createDid, createDidDocument, createMetadata } from "./dataV1.js";

interface DidDocument {
  canonicalizedDidDocument: string;
  canonicalizedDidDocumentBuffer: Buffer;
  canonicalizedDidDocumentHash: string;
  controller: ethers.HDNodeWallet;
  did: string;
  didDocument: Record<string, unknown>;
  didDocumentBuffer: Buffer;
  didVersionMetadata: Record<string, unknown>;
  didVersionMetadataBuffer: Buffer;
  identifier: string;
  timestampDataBuffer: Buffer;
}

interface HashAlgorithmObject {
  ianaName: string;
  multihash: HashName;
  oid: string;
  outputLength: number;
  status: number;
}

const validHashAlgorithms = [
  "sha-256",
  "sha-512",
  "sha3-224",
  "sha3-256",
  "sha3-384",
  "sha3-512",
] as const;

const outputLengths: Record<string, number> = {
  "sha3-224": 224,
  "sha3-256": 256,
  "sha3-384": 384,
  "sha3-512": 512,
  "sha-256": 256,
  "sha-512": 512,
};

const ianaToMultihashAlg: Record<string, HashName> = {
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
  "sha-256": "sha2-256",
  "sha-512": "sha2-512",
};

const ianaToNodeHashAlg: Record<string, string> = {
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
  "sha-256": "sha256",
  "sha-512": "sha512",
};

const getArtifactV1 = (name: string): Artifact => {
  const pathToArtifactV1 = path.join(
    import.meta.dirname,
    "../../../..",
    "contracts/did-registry/artifacts",
    "contracts/did-registry",
    `${name}.sol`,
    `${name}.json`,
  );
  const data = fs.readFileSync(pathToArtifactV1, "utf8");
  return JSON.parse(data) as Artifact;
};

const deployContract = async (
  name: string,
  opts: FactoryOptions = {},
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.getAddress();
};

const deployContractV1 = async (
  name: string,
  opts: FactoryOptions = {},
): Promise<string> => {
  const artifact = getArtifactV1(name);
  const factory = await hre.ethers.getContractFactoryFromArtifact(
    artifact,
    opts,
  );
  const contract = await factory.deploy();
  return contract.getAddress();
};

export interface SetupOptions {
  didDocumentsTotal?: number;
  hashAlgorithmsTotal?: number;
}

export async function deployDidRegistryContract(): Promise<{
  didRegistryV1Contract: DidRegistryV1;
  policyContractMock: PolicyRegistryMock;
}> {
  // mock trusted policies registry
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

  const paginationAddress = await deployContract("Pagination");
  const linkLibPagination = {
    libraries: {
      Pagination: paginationAddress,
    },
  };

  const didRegistryV1ContractFactory =
    await hre.ethers.getContractFactoryFromArtifact(
      getArtifactV1("DidRegistry"),
      {
        libraries: {
          DidRecordLib: await deployContractV1(
            "DidRecordLib",
            linkLibPagination,
          ),
          DidTimestampLib: await deployContractV1("DidTimestampLib"),
          HashAlgoLib: await deployContractV1("HashAlgoLib"),
        },
      },
    );

  const didRegistryV1Contract = (await didRegistryV1ContractFactory.deploy(
    testTprAddress,
  )) as unknown as DidRegistryV1;
  await didRegistryV1Contract.initialize(1);
  await didRegistryV1Contract.setTrustedPoliciesRegistryAddress();

  await policyContractMock.setPolicyResult(true);

  return {
    didRegistryV1Contract,
    policyContractMock,
  };
}

export async function insertDidDocument(
  contract: DidRegistryV1,
  ethersProvider: HardhatEthersProvider,
  did: string,
  hashAlgorithmIanaName: string,
  defaultController?: ethers.HDNodeWallet,
): Promise<DidDocument> {
  const didDocument = createDidDocument(did);
  const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

  // @ts-expect-error "canonicalize is not callable" <- the exported types are incorrect
  const canonicalizedDidDocument = (canonicalize(didDocument) as ReturnType<
    typeof canonicalize.default
  >)!;

  const canonicalizedDidDocumentBuffer = Buffer.from(canonicalizedDidDocument);

  const canonicalizedDidDocumentHash = `0x${crypto
    .createHash(ianaToNodeHashAlg[hashAlgorithmIanaName]!)
    .update(canonicalizedDidDocument, "utf8")
    .digest()
    .toString("hex")}`;

  const timestampDataBuffer = Buffer.from(JSON.stringify({ data: "test" }));
  const didVersionMetadata = createMetadata();
  const didVersionMetadataBuffer = Buffer.from(
    JSON.stringify(didVersionMetadata),
  );

  const identifier = `0x${Buffer.from(did).toString("hex")}`;
  const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
  const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
  const didVersionMetadataHex = `0x${didVersionMetadataBuffer.toString("hex")}`;

  const controller =
    defaultController ??
    ethers.Wallet.createRandom().connect(
      ethersProvider as unknown as ethers.Provider,
    );

  await contract.insertDidDocument(
    identifier,
    0,
    canonicalizedDidDocumentHash,
    didVersionInfo,
    timestampData,
    didVersionMetadataHex,
  );

  await contract.insertDidController(
    identifier,
    controller.address,
    Date.now() - 1,
    Date.now() + 100_000,
  );

  return {
    canonicalizedDidDocument,
    canonicalizedDidDocumentBuffer,
    canonicalizedDidDocumentHash,
    controller,
    did,
    didDocument,
    didDocumentBuffer,
    didVersionMetadata,
    didVersionMetadataBuffer,
    identifier,
    timestampDataBuffer,
  };
}

export async function insertHashAlgorithm(
  contract: DidRegistryV1,
  id: number,
): Promise<HashAlgorithmObject> {
  const ianaName = validHashAlgorithms[id]!;
  const outputLength = outputLengths[ianaName]!;
  const oid = "oid-test";
  const status = 1;
  const multihash = ianaToMultihashAlg[ianaName]!;

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

export async function setupTestEnv({
  didDocumentsTotal = 1,
  hashAlgorithmsTotal = 1,
}: SetupOptions = {}): Promise<{
  defaultController: ethers.HDNodeWallet;
  didDocuments: DidDocument[];
  didRegistryV1Contract: DidRegistryV1;
  hashAlgorithms: HashAlgorithmObject[];
  policyContractMock: PolicyRegistryMock;
  provider: HardhatEthersProvider;
}> {
  const ethersProvider = hre.ethers.provider;
  const hashAlgorithms: HashAlgorithmObject[] = [];
  const didDocuments: DidDocument[] = [];

  // Deploy contract
  const { didRegistryV1Contract, policyContractMock } =
    await deployDidRegistryContract();

  // Insert fake data
  for (let i = 0; i < hashAlgorithmsTotal; i++) {
    hashAlgorithms.push(await insertHashAlgorithm(didRegistryV1Contract, i));
  }

  const defaultController = ethers.Wallet.createRandom();

  for (let i = 0; i < didDocumentsTotal; i++) {
    didDocuments.push(
      await insertDidDocument(
        didRegistryV1Contract,
        ethersProvider,
        createDid(),
        hashAlgorithms[0]!.ianaName,
        defaultController,
      ),
    );
  }

  // Return test env variables
  return {
    defaultController,
    didDocuments,
    didRegistryV1Contract,
    hashAlgorithms,
    policyContractMock,
    provider: ethersProvider,
  };
}
