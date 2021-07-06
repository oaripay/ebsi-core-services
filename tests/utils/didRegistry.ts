import crypto from "crypto";
import { ethers } from "ethers";
import ganache from "ganache-core";
import { range } from "rxjs";
import canonicalize from "canonicalize";
import { HashName } from "multihashes";
// ESLint error should be fixed with https://github.com/benmosher/eslint-plugin-import/pull/2097
// eslint-disable-next-line import/no-extraneous-dependencies
import { mergeMap, toArray } from "rxjs/operators";
import {
  DidRegistry,
  DidRegistry__factory,
  HashAlgoLib__factory,
  AdministratorLib__factory,
  PolicyLib__factory,
  DidRecordLib__factory,
  DidMethodLib__factory,
  DidTimestampLib__factory,
} from "../../src/contracts/did-registry";
import PaginationArtifact from "../../submodules/did-registry-ethereum-sc/artifacts/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol/Pagination.json";
import {
  createDid,
  createDidDocument,
  createDidMethod,
  createMetadata,
} from "./data";

interface Administrator {
  wallet: ethers.Wallet;
  attribute: { [x: string]: unknown };
  did: string;
}

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

interface DidMethod {
  methodName: string;
  ledgerName: string;
  didMethods: { [x: string]: unknown }[];
  didMethodsBuffer: Buffer[];
  canonicalizedDidMethods: string[];
  canonicalizedDidMethodsBuffer: Buffer[];
  canonicalizedDidMethodsHash: string[];
  methodSpec: string[];
  methodSpecHash: string[];
  notBefore: number;
  notAfter: number;
  status: number;
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

const ianaToNodeHashAlg = {
  "sha-256": "sha256",
  "sha-512": "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
};

export async function deployDidRegistryContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<DidRegistry> {
  const owner = ethersProvider.getSigner();

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

    ```js
    const ethers = require("ethers");
    console.log(
      ethers.utils.keccak256(
        Buffer.from("contracts/did-registry/AdministratorLib.sol:AdministratorLib", "utf-8")
      )
    );
    ```
    -> 0x717aec161b9ae870a8320204794edc6b45ff09d8bb3a0d428046500fccfce81b

    Mapping:

    __$717aec161b9ae870a8320204794edc6b45$__ = "contracts/did-registry/AdministratorLib.sol:AdministratorLib"
    __$83fd23072f3f71fd0064cd6aa0829166fc$__ = "contracts/did-registry/HashAlgoLib.sol:HashAlgoLib"
    __$c0ce321b058d74b8a232c7ea24bf1e9537$__ = "contracts/did-registry/PolicyLib.sol:PolicyLib"
    __$515a15b27d7e720e4d91814eed9672e50c$__ = "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination"
    __$4f4b3a405fd4509d509fff556f3095a5fd$__ = "contracts/did-registry/DidRecordLib.sol:DidRecordLib"
    __$5fb82bece21faf6323dd5a8d5ed0063559$__ = "contracts/did-registry/DidTimestampLib.sol:DidTimestampLib"
    __$b75474ddf77e030e5604a84f9456d5d2be$__ = "contracts/did-registry/DidMethodLib.sol:DidMethodLib"

  */

  // Deploy libs
  const paginationAddress = (
    await new ethers.ContractFactory(
      PaginationArtifact.abi,
      PaginationArtifact.bytecode,
      owner
    ).deploy()
  ).address;

  const administratorLibAddress = (
    await new AdministratorLib__factory(
      {
        __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
      },
      owner
    ).deploy()
  ).address;

  const hashAlgoLibAddress = (await new HashAlgoLib__factory(owner).deploy())
    .address;

  const didRecordLibAddress = (
    await new DidRecordLib__factory(
      {
        __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
      },
      owner
    ).deploy()
  ).address;

  const didMethodLibAddress = (
    await new DidMethodLib__factory(
      {
        __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
      },
      owner
    ).deploy()
  ).address;

  const didTimestampLibAddress = (
    await new DidTimestampLib__factory(owner).deploy()
  ).address;

  const policyLibAddress = (
    await new PolicyLib__factory(
      {
        __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
      },
      owner
    ).deploy()
  ).address;

  const didRegistry = await new DidRegistry__factory(
    {
      __$717aec161b9ae870a8320204794edc6b45$__: administratorLibAddress,
      __$83fd23072f3f71fd0064cd6aa0829166fc$__: hashAlgoLibAddress,
      __$c0ce321b058d74b8a232c7ea24bf1e9537$__: policyLibAddress,
      __$4f4b3a405fd4509d509fff556f3095a5fd$__: didRecordLibAddress,
      __$5fb82bece21faf6323dd5a8d5ed0063559$__: didTimestampLibAddress,
      __$b75474ddf77e030e5604a84f9456d5d2be$__: didMethodLibAddress,
    },
    owner
  ).deploy();

  return didRegistry;
}

export async function insertAdmin(
  contract: DidRegistry,
  adminDid: string
): Promise<{ [x: string]: unknown }> {
  const attribute = {
    "@context": {
      name: {
        "@id": "http://did-registry-api-test.org/name",
        "@type": "@id",
      },
      description: "http://did-registry-api-test.org/description",
    },
    name: `test-${adminDid}`,
  };

  const bufferAttribute = Buffer.from(JSON.stringify(attribute));

  await contract.insertAdministrator(adminDid.toLowerCase(), bufferAttribute);

  return attribute;
}

export async function insertDidDocument(
  contract: DidRegistry,
  ethersProvider: ethers.providers.Web3Provider,
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

export async function insertDidMethod(
  contract: DidRegistry,
  methodName = `did:${crypto.randomBytes(8).toString("hex")}`
): Promise<DidMethod> {
  const didMethod = createDidMethod();

  const didMethodBuffer = Buffer.from(JSON.stringify(didMethod));

  // Canonicalize DID Method
  const canonicalizedDidMethod = canonicalize(didMethod);

  const canonicalizedDidMethodBuffer = Buffer.from(canonicalizedDidMethod);
  const canonicalizedDidMethodHash = ethers.utils.sha256(
    canonicalizedDidMethodBuffer
  );

  const ledgerName = "ebsi-besu";
  const methodSpec = [didMethodBuffer].map((b) => `0x${b.toString("hex")}`);
  const methodSpecHash = [canonicalizedDidMethodHash];
  const notBefore = 1616408985883;
  const notAfter = 3232818053700;
  const status = 1;

  await contract.insertDidMethod(
    methodName,
    ledgerName,
    methodSpec,
    methodSpecHash,
    notBefore,
    notAfter,
    status
  );

  return {
    methodName,
    ledgerName,
    didMethods: [didMethod],
    didMethodsBuffer: [didMethodBuffer],
    canonicalizedDidMethods: [canonicalizedDidMethod],
    canonicalizedDidMethodsBuffer: [canonicalizedDidMethodBuffer],
    canonicalizedDidMethodsHash: [canonicalizedDidMethodHash],
    methodSpec,
    methodSpecHash,
    notBefore,
    notAfter,
    status,
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
  administratorsTotal?: number;
  didMethodsTotal?: number;
  didDocuments?: number;
  hashAlgorithmsTotal?: number;
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
  lowercaseDid?: boolean;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    administratorsTotal: 1,
    didMethodsTotal: 1,
    didDocuments: 1,
    hashAlgorithmsTotal: 1,
    policiesTotal: 1,
    policiesRevisionsTotal: 1,
    lowercaseDid: true,
  }
): Promise<{
  provider: ethers.providers.Web3Provider;
  didRegistryContract: DidRegistry;
  administrators: Administrator[];
  didMethods: DidMethod[];
  didDocuments: DidDocument[];
  hashAlgorithms: HashAlgorithmObject[];
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
}> {
  const provider = ganache.provider();
  const ethersProvider = new ethers.providers.Web3Provider(provider);
  const didDocuments: DidDocument[] = [];

  // Deploy contract
  const didRegistryContract = await deployDidRegistryContract(ethersProvider);

  // Insert fake data
  const hashAlgorithms = await Promise.all(
    Array(opts.hashAlgorithmsTotal ?? 1)
      .fill(0)
      .map((i: number) => insertHashAlgorithm(didRegistryContract, i))
  );

  const createAdminWallet = async () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);

    const did = createDid("did:ebsi", opts.lowercaseDid);

    // Insert a DID document controlled by the random wallet
    const adminDidDocument = await insertDidDocument(
      didRegistryContract,
      ethersProvider,
      did,
      hashAlgorithms[0].ianaName,
      wallet
    );

    didDocuments.push(adminDidDocument);

    const attribute = await insertAdmin(didRegistryContract, did);
    return { wallet, attribute, did };
  };

  const administrators = await range(0, opts.administratorsTotal ?? 1)
    .pipe(mergeMap(createAdminWallet), toArray())
    .toPromise();

  const didMethods = await Promise.all([
    insertDidMethod(didRegistryContract, "did:ebsi"),
    ...Array(Math.max(0, (opts.didMethodsTotal ?? 0) - 1))
      .fill(0)
      .map(() => insertDidMethod(didRegistryContract)),
  ]);

  didDocuments.push(
    ...(await Promise.all(
      Array(
        Math.max((opts.didDocuments ?? 1) - (opts.administratorsTotal ?? 1), 0)
      )
        .fill(0)
        .map(() =>
          insertDidDocument(
            didRegistryContract,
            ethersProvider,
            createDid("did:ebsi", opts.lowercaseDid),
            hashAlgorithms[0].ianaName
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
    administrators,
    didMethods,
    didDocuments,
    hashAlgorithms,
    policies,
    policyRevisions,
  };
}
