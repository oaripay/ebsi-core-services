import "@ebsiint-sc/trusted-schemas-registry/dist/hardhat.d.ts";

import hre from "hardhat";

import type {
  PolicyRegistryMock,
  SchemaSCRegistry,
} from "@ebsiint-sc/trusted-schemas-registry";
import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";

import "@nomicfoundation/hardhat-ethers";
import { computeId } from "@ebsiint-api/shared";
import { ethers } from "ethers";
import crypto from "node:crypto";

import { createDid, createSchema } from "./data.ts";

export interface PolicyObject {
  policyData: unknown;
  policyHash: string;
  policyId: string;
}

export interface SetupOptions {
  policiesRevisionsTotal?: number;
  policiesTotal?: number;
  schemaMetadataTotal?: number;
  schemaRevisionsTotal?: number;
  schemasTotal?: number;
}

interface SchemaMetadataObject {
  metadata: unknown;
  serializedMetadata: Buffer;
}

interface SchemaObject {
  metadata: unknown;
  schema: unknown;
  schemaId: string;
  serializedMetadata: Buffer;
  serializedSchema: Buffer;
}

interface User {
  did: string;
  wallet: ethers.BaseWallet;
}

export async function deploySchemasRegistryContract(): Promise<{
  policyContractMock: PolicyRegistryMock;
  schemasRegistryContract: SchemaSCRegistry;
}> {
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

  const paginationFactory = await hre.ethers.getContractFactory("Pagination");
  const pagination = await paginationFactory.deploy();

  const schemaLibFactory = await hre.ethers.getContractFactory("SchemaLib", {
    libraries: {
      Pagination: await pagination.getAddress(),
    },
  });
  const schemaLib = await schemaLibFactory.deploy();

  const schemasRegistryFactory = await hre.ethers.getContractFactory(
    "SchemaSCRegistry",
    {
      libraries: {
        Pagination: await pagination.getAddress(),
        SchemaLib: await schemaLib.getAddress(),
      },
    },
  );
  const schemasRegistry = await schemasRegistryFactory.deploy(testTprAddress);
  await schemasRegistry.initialize(1);
  await schemasRegistry.setTrustedPoliciesRegistryAddress();
  await policyContractMock.setPolicyResult(true);

  return { policyContractMock, schemasRegistryContract: schemasRegistry };
}

export async function insertPolicy(
  contract: SchemaSCRegistry,
): Promise<PolicyObject> {
  const policyId = `policy-test-${crypto.randomBytes(16).toString("hex")}`;

  const policyData = {
    // any object here
    any: "Any attribute here",
    data: crypto.randomBytes(16).toString("hex"),
    type: "credential",
  };

  const policyBuffer = Buffer.from(JSON.stringify(policyData));
  const policyHash = ethers.sha256(policyBuffer);

  await contract.insertPolicy(policyId, policyBuffer);

  return { policyData: policyBuffer.toString("base64"), policyHash, policyId };
}

export async function insertSchema(
  contract: SchemaSCRegistry,
): Promise<SchemaObject> {
  const schema = createSchema();

  const schemaIdBuffer = await computeId(schema);
  const schemaId = `0x${schemaIdBuffer.toString("hex")}`;

  const serializedSchema = Buffer.from(JSON.stringify(schema));

  const metadata = {
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
    meta: "value",
    validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
    validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
  };
  const serializedMetadata = Buffer.from(JSON.stringify(metadata));

  await contract.insertSchema(schemaId, serializedSchema, serializedMetadata);

  return {
    metadata,
    schema,
    schemaId,
    serializedMetadata,
    serializedSchema,
  };
}

export async function setupTestEnv(opts: SetupOptions): Promise<{
  policies: PolicyObject[];
  policyContractMock: PolicyRegistryMock;
  policyRevisions: Record<string, PolicyObject[]>;
  provider: HardhatEthersProvider;
  schemaMetadata: SchemaMetadataObject[];
  schemaRevisions: SchemaObject[];
  schemas: SchemaObject[];
  schemasRegistryContract: SchemaSCRegistry;
  user: User;
}> {
  const {
    policiesRevisionsTotal,
    policiesTotal,
    schemaMetadataTotal,
    schemaRevisionsTotal,
    schemasTotal,
  } = {
    policiesRevisionsTotal: 1,
    policiesTotal: 1,
    schemaMetadataTotal: 1,
    schemaRevisionsTotal: 1,
    schemasTotal: 1,
    ...opts,
  };
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { policyContractMock, schemasRegistryContract } =
    await deploySchemasRegistryContract();

  // Insert fake data
  const createWallet = () => {
    // Create random wallet and connect it so we can use it later to send transactions
    // @ts-expect-error Error due to contracts using CommonJS modules
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    const did = createDid();
    return { did, wallet };
  };

  const user = createWallet();

  const schemas: SchemaObject[] = [];
  for (let i = 0; i < schemasTotal; i++) {
    schemas.push(await insertSchema(schemasRegistryContract));
  }

  const schemaRevisions: SchemaObject[] = [];
  for (let i = 0, k = Math.max(0, schemaRevisionsTotal - 1); i < k; i++) {
    schemaRevisions.push(
      await updateSchema(schemas[0]!.schemaId, schemasRegistryContract),
    );
  }

  const schemaRevisionId = ethers.sha256(schemas[0]!.serializedSchema);
  const schemaMetadata: SchemaMetadataObject[] = [];
  for (let i = 0, k = Math.max(0, schemaMetadataTotal - 1); i < k; i++) {
    schemaMetadata.push(
      await updateMetadata(schemaRevisionId, schemasRegistryContract),
    );
  }

  const policyRevisions: Record<string, PolicyObject[]> = {};

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(schemasRegistryContract);

    const createRevision = async () =>
      updatePolicy(schemasRegistryContract, policy.policyId);

    // For each policy, add revisions
    policyRevisions[policy.policyId] = [
      // The first revision is the policy itself
      policy,
    ];

    for (let i = 0; i < policiesRevisionsTotal - 1; i++) {
      policyRevisions[policy.policyId]!.push(await createRevision());
    }

    return policy;
  };

  const policies: PolicyObject[] = [];
  for (let i = 0; i < policiesTotal; i++) {
    policies.push(await createPolicy());
  }

  // Return test env variables
  return {
    policies,
    policyContractMock,
    policyRevisions,
    provider: ethersProvider,
    schemaMetadata,
    schemaRevisions,
    schemas,
    schemasRegistryContract,
    user,
  };
}

export async function updateMetadata(
  schemaRevisionId: string,
  contract: SchemaSCRegistry,
): Promise<SchemaMetadataObject> {
  const metadata = {
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
    meta: "value",
  };
  const serializedMetadata = Buffer.from(JSON.stringify(metadata));

  await contract.updateMetadata(schemaRevisionId, serializedMetadata);

  return {
    metadata,
    serializedMetadata,
  };
}

export async function updatePolicy(
  contract: SchemaSCRegistry,
  policyId: string,
): Promise<PolicyObject> {
  const policyData = {
    // any object here
    any: "Any attribute here",
    data: crypto.randomBytes(16).toString("hex"),
    type: "credential",
  };

  const policyBuffer = Buffer.from(JSON.stringify(policyData));
  const policyHash = ethers.sha256(policyBuffer);

  await contract.updatePolicy(policyId, policyBuffer);

  return { policyData: policyBuffer.toString("base64"), policyHash, policyId };
}

export async function updateSchema(
  schemaId: string,
  contract: SchemaSCRegistry,
): Promise<SchemaObject> {
  const schema = createSchema();

  const serializedSchema = Buffer.from(JSON.stringify(schema));

  const metadata = {
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
    meta: "value",
    validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
    validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
  };
  const serializedMetadata = Buffer.from(JSON.stringify(metadata));

  await contract.updateSchema(schemaId, serializedSchema, serializedMetadata);

  return {
    metadata,
    schema,
    schemaId,
    serializedMetadata,
    serializedSchema,
  };
}
