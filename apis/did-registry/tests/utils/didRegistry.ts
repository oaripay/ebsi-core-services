// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/did-registry/src/types/hardhat.d.ts" />
import hre from "hardhat";
import { FactoryOptions } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import crypto from "node:crypto";
import { Contract, ethers } from "ethers";
import { range } from "rxjs";
import canonicalize from "canonicalize";
import { HashName } from "multihashes";
import { mergeMap, toArray } from "rxjs/operators";
import { DidRegistry } from "@ebsiint-sc/did-registry";
import { createDid, createDidDocument, createMetadata } from "./data";

interface DidDocument {
  did: string;
  identifier: string;
  didDocument: { [x: string]: unknown };
  didDocumentBuffer: Buffer;
  canonicalizedDidDocument: string;
  canonicalizedDidDocumentBuffer: Buffer;
  canonicalizedDidDocumentHash: string;
  controller: ethers.Wallet;
  timestampDataBuffer: Buffer;
  didVersionMetadata: { [x: string]: unknown };
  didVersionMetadataBuffer: Buffer;
}

interface HashAlgorithmObject {
  outputLength: number;
  ianaName: string;
  oid: string;
  status: number;
  multihash: HashName;
}

interface PolicyObject {
  policyId: string;
  policyData: unknown;
  policyHash: string;
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
  "sha-256": 256,
  "sha-512": 512,
  "sha3-224": 224,
  "sha3-256": 256,
  "sha3-384": 384,
  "sha3-512": 512,
};

const ianaToMultihashAlg: Record<string, HashName> = {
  "sha-256": "sha2-256",
  "sha-512": "sha2-512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
};

const ianaToNodeHashAlg: Record<string, string> = {
  "sha-256": "sha256",
  "sha-512": "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
};

const deployContract = async (
  name: string,
  opts: FactoryOptions = {}
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.address;
};

export async function deployDidRegistryContract(): Promise<{
  didRegistryContract: DidRegistry;
  policyContractMock: Contract;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "PolicyRegistryMock"
  );
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address
  );
  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(testTprAddress);

  const paginationAddress = await deployContract("Pagination");
  const linkLibPagination = {
    libraries: {
      Pagination: paginationAddress,
    },
  };

  const didRegistryContractFactory = await hre.ethers.getContractFactory(
    "DidRegistry",
    {
      libraries: {
        DidPolicyLib: await deployContract("DidPolicyLib", linkLibPagination),
        HashAlgoLib: await deployContract("HashAlgoLib"),
        DidTimestampLib: await deployContract("DidTimestampLib"),
        DidRecordLib: await deployContract("DidRecordLib", linkLibPagination),
      },
    }
  );

  const didRegistryContract = await didRegistryContractFactory.deploy();
  await didRegistryContract.initialize(1);
  await didRegistryContract.setTrustedPoliciesRegistryAddress();

  await policyContractMock.setPolicyResult(true);

  return {
    didRegistryContract,
    policyContractMock,
  };
}

export async function insertDidDocument(
  contract: DidRegistry,
  ethersProvider: ethers.providers.JsonRpcProvider,
  did: string,
  hashAlgorithmIanaName: string,
  defaultController?: ethers.Wallet
): Promise<DidDocument> {
  const didDocument = createDidDocument(did);
  const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

  const canonicalizedDidDocument = canonicalize(didDocument);

  const canonicalizedDidDocumentBuffer = Buffer.from(canonicalizedDidDocument);

  const canonicalizedDidDocumentHash = `0x${crypto
    .createHash(ianaToNodeHashAlg[hashAlgorithmIanaName])
    .update(canonicalizedDidDocument, "utf8")
    .digest()
    .toString("hex")}`;

  const timestampDataBuffer = Buffer.from(JSON.stringify({ data: "test" }));
  const didVersionMetadata = createMetadata();
  const didVersionMetadataBuffer = Buffer.from(
    JSON.stringify(didVersionMetadata)
  );

  const identifier = `0x${Buffer.from(did).toString("hex")}`;
  const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
  const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
  const didVersionMetadataHex = `0x${didVersionMetadataBuffer.toString("hex")}`;

  const controller =
    defaultController ?? ethers.Wallet.createRandom().connect(ethersProvider);

  await contract.insertDidDocument(
    identifier,
    0,
    canonicalizedDidDocumentHash,
    didVersionInfo,
    timestampData,
    didVersionMetadataHex
  );

  await contract.insertDidController(
    identifier,
    controller.address,
    Date.now() - 1,
    Date.now() + 100000
  );

  return {
    did,
    identifier,
    didDocument,
    didDocumentBuffer,
    canonicalizedDidDocument,
    canonicalizedDidDocumentBuffer,
    canonicalizedDidDocumentHash,
    controller,
    timestampDataBuffer,
    didVersionMetadata,
    didVersionMetadataBuffer,
  };
}

export async function insertPolicy(
  contract: DidRegistry
): Promise<PolicyObject> {
  const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;

  const policyData = {
    // any object here
    any: "Any attribute here",
    type: "credential",
    data: crypto.randomBytes(16).toString("hex"),
  };

  const policyBuffer = Buffer.from(JSON.stringify(policyData));
  const policyHash = ethers.utils.sha256(policyBuffer);

  await contract.insertPolicy(policyId, policyBuffer);

  return { policyId, policyData: policyBuffer.toString("base64"), policyHash };
}

export async function updatePolicy(
  contract: DidRegistry,
  policyId: string
): Promise<PolicyObject> {
  const policyData = {
    // any object here
    any: "Any attribute here",
    type: "credential",
    data: crypto.randomBytes(16).toString("hex"),
  };

  const policyBuffer = Buffer.from(JSON.stringify(policyData));
  const policyHash = ethers.utils.sha256(policyBuffer);

  await contract.updatePolicy(policyId, policyBuffer);

  return { policyId, policyData: policyBuffer.toString("base64"), policyHash };
}

export async function insertHashAlgorithm(
  contract: DidRegistry,
  id: number
): Promise<HashAlgorithmObject> {
  const ianaName = validHashAlgorithms[id];
  const outputLength = outputLengths[ianaName];
  const oid = "oid-test";
  const status = 1;
  const multihash = ianaToMultihashAlg[ianaName];

  await contract.insertHashAlgorithm(
    outputLength,
    ianaName,
    oid,
    status,
    multihash
  );

  return {
    outputLength,
    ianaName,
    oid,
    status,
    multihash,
  };
}

export interface SetupOptions {
  didDocuments?: number;
  hashAlgorithmsTotal?: number;
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    didDocuments: 1,
    hashAlgorithmsTotal: 1,
    policiesTotal: 1,
    policiesRevisionsTotal: 1,
  }
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  didRegistryContract: DidRegistry;
  policyContractMock: Contract;
  didDocuments: DidDocument[];
  defaultController: ethers.Wallet;
  hashAlgorithms: HashAlgorithmObject[];
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
}> {
  const ethersProvider = hre.ethers.provider;
  const didDocuments: DidDocument[] = [];

  // Deploy contract
  const { didRegistryContract, policyContractMock } =
    await deployDidRegistryContract();

  // Insert fake data
  const hashAlgorithms = await Promise.all(
    Array(opts.hashAlgorithmsTotal ?? 1)
      .fill(0)
      .map((i: number) => insertHashAlgorithm(didRegistryContract, i))
  );

  const defaultController = ethers.Wallet.createRandom();

  didDocuments.push(
    ...(await Promise.all(
      Array(opts.didDocuments ?? 1)
        .fill(0)
        .map(() =>
          insertDidDocument(
            didRegistryContract,
            ethersProvider,
            createDid(),
            hashAlgorithms[0].ianaName,
            defaultController
          )
        )
    ))
  );

  const policyRevisions = {};

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(didRegistryContract);

    const createRevision = async () =>
      updatePolicy(didRegistryContract, policy.policyId);

    // For each policy, add revisions
    policyRevisions[policy.policyId] = [
      // The first revision is the policy itself
      policy,
      // Then, we add new revisions
      ...(await range(0, (opts.policiesRevisionsTotal ?? 1) - 1)
        .pipe(mergeMap(createRevision), toArray())
        .toPromise()),
    ];

    return policy;
  };

  const policies =
    opts.policiesTotal >= 1
      ? await range(0, opts.policiesTotal)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise()
      : [];

  // Return test env variables
  return {
    provider: ethersProvider,
    didRegistryContract,
    policyContractMock,
    didDocuments,
    defaultController,
    hashAlgorithms,
    policies,
    policyRevisions,
  };
}
