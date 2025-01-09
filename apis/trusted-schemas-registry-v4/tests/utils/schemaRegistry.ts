import "../../../../contracts/trusted-schemas-registry-v3/src/types/hardhat.d.ts";

import hre from "hardhat";

import type {
  TrustedPoliciesRegistryMock,
  TrustedSchemasRegistry,
} from "@ebsiint-sc/trusted-schemas-registry-v3";

import "@nomicfoundation/hardhat-ethers";

import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";

import { computeId } from "@ebsiint-api/shared";
import { ethers } from "ethers";
import crypto from "node:crypto";

import { createDid, createSchema, dummySchemas } from "./data.js";

export interface SetupOptions {
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
  policyContractMock: TrustedPoliciesRegistryMock;
  schemasRegistryContract: TrustedSchemasRegistry;
}> {
  const [upgrader] = await hre.ethers.getSigners();

  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "TrustedPoliciesRegistryMock",
  );
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
  ) as TrustedPoliciesRegistryMock;

  const contractFactory = await hre.ethers.getContractFactory(
    "TrustedSchemasRegistry",
  );
  const schemasRegistry = await hre.upgrades.deployProxy(
    contractFactory,
    [upgrader!.address, testTprAddress],
    { unsafeAllowLinkedLibraries: true },
  );

  await policyContractMock.setPolicyResult(true);

  return { policyContractMock, schemasRegistryContract: schemasRegistry };
}

export async function insertSchema(
  contract: TrustedSchemasRegistry,
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

export async function setupTestEnv(): Promise<{
  policyContractMock: TrustedPoliciesRegistryMock;
  provider: HardhatEthersProvider;
  schemaMetadata: SchemaMetadataObject[];
  schemaRevisions: SchemaObject[];
  schemas: SchemaObject[];
  schemasRegistryContract: TrustedSchemasRegistry;
  user: User;
}> {
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

  // Return test env variables
  return {
    policyContractMock,
    provider: ethersProvider,
    schemaMetadata: dummySchemas[0]!.revisions[0]!.metadata.map((m) => ({
      metadata: JSON.parse(m.content),
      serializedMetadata: Buffer.from(m.content),
    })),
    schemaRevisions: dummySchemas[0]!.revisions.map((s) => ({
      metadata: "",
      schema: JSON.parse(s.content),
      schemaId: s.id,
      serializedMetadata: Buffer.from(""),
      serializedSchema: Buffer.from(s.content),
    })),
    schemas: dummySchemas.map((s) => ({
      metadata: JSON.parse(s.lastRevision.metadata[0]!.content),
      schema: JSON.parse(s.lastRevision.content),
      schemaId: s.id,
      serializedMetadata: Buffer.from(""),
      serializedSchema: Buffer.from(s.lastRevision.content),
    })),
    schemasRegistryContract,
    user,
  };
}

export async function updateMetadata(
  schemaRevisionId: string,
  contract: TrustedSchemasRegistry,
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

export async function updateSchema(
  schemaId: string,
  contract: TrustedSchemasRegistry,
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
