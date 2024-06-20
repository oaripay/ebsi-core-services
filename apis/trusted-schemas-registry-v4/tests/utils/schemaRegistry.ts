// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-schemas-registry-v3/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "node:crypto";
import { Contract, ethers } from "ethers";
import { TrustedSchemasRegistry } from "@ebsiint-sc/trusted-schemas-registry-v3";
import { computeId } from "@ebsiint-api/shared";
import { createDid, createSchema, dummySchemas } from "./data.js";

interface User {
  wallet: ethers.Wallet;
  did: string;
}

interface SchemaObject {
  schema: unknown;
  metadata: unknown;
  serializedSchema: Buffer;
  serializedMetadata: Buffer;
  schemaId: string;
}

interface SchemaMetadataObject {
  metadata: unknown;
  serializedMetadata: Buffer;
}

export async function insertSchema(
  contract: TrustedSchemasRegistry,
): Promise<SchemaObject> {
  const schema = createSchema();

  const schemaId = `0x${(await computeId(schema)).toString("hex")}`;

  const serializedSchema = Buffer.from(JSON.stringify(schema));

  const metadata = {
    meta: "value",
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
    validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
    validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
  };
  const serializedMetadata = Buffer.from(JSON.stringify(metadata));

  await contract.insertSchema(schemaId, serializedSchema, serializedMetadata);

  return {
    schema,
    metadata,
    serializedSchema,
    serializedMetadata,
    schemaId,
  };
}

export async function updateSchema(
  schemaId: string,
  contract: TrustedSchemasRegistry,
): Promise<SchemaObject> {
  const schema = createSchema();

  const serializedSchema = Buffer.from(JSON.stringify(schema));

  const metadata = {
    meta: "value",
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
    validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
    validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
  };
  const serializedMetadata = Buffer.from(JSON.stringify(metadata));

  await contract.updateSchema(schemaId, serializedSchema, serializedMetadata);

  return {
    schema,
    metadata,
    serializedSchema,
    serializedMetadata,
    schemaId,
  };
}

export async function updateMetadata(
  schemaRevisionId: string,
  contract: TrustedSchemasRegistry,
): Promise<SchemaMetadataObject> {
  const metadata = {
    meta: "value",
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
  };
  const serializedMetadata = Buffer.from(JSON.stringify(metadata));

  await contract.updateMetadata(schemaRevisionId, serializedMetadata);

  return {
    metadata,
    serializedMetadata,
  };
}

export async function deploySchemasRegistryContract(): Promise<{
  schemasRegistryContract: TrustedSchemasRegistry;
  policyContractMock: Contract;
}> {
  const [upgrader] = await hre.ethers.getSigners();

  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "TrustedPoliciesRegistryMock",
  );
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

  const contractFactory = await hre.ethers.getContractFactory(
    "TrustedSchemasRegistry",
  );
  const schemasRegistry = (await hre.upgrades.deployProxy(
    contractFactory,
    [upgrader!.address, testTprAddress],
    { unsafeAllowLinkedLibraries: true },
  )) as unknown as TrustedSchemasRegistry;

  await policyContractMock.setPolicyResult(true);

  return { schemasRegistryContract: schemasRegistry, policyContractMock };
}

export interface SetupOptions {
  schemasTotal?: number;
  schemaRevisionsTotal?: number;
  schemaMetadataTotal?: number;
}

export async function setupTestEnv(): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  schemasRegistryContract: TrustedSchemasRegistry;
  policyContractMock: Contract;
  user: User;
  schemas: SchemaObject[];
  schemaRevisions: SchemaObject[];
  schemaMetadata: SchemaMetadataObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const { schemasRegistryContract, policyContractMock } =
    await deploySchemasRegistryContract();

  // Insert fake data
  const createWallet = () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    const did = createDid();
    return { wallet, did };
  };

  const user = createWallet();

  // Return test env variables
  return {
    provider: ethersProvider,
    schemasRegistryContract,
    policyContractMock,
    user,
    schemas: dummySchemas.map((s) => ({
      schemaId: s.id,
      schema: JSON.parse(s.lastRevision.content),
      metadata: JSON.parse(s.lastRevision.metadata[0]!.content),
      serializedSchema: Buffer.from(s.lastRevision.content),
      serializedMetadata: Buffer.from(""),
    })),
    schemaRevisions: dummySchemas[0]!.revisions.map((s) => ({
      schemaId: s.id,
      schema: JSON.parse(s.content),
      metadata: "",
      serializedSchema: Buffer.from(s.content),
      serializedMetadata: Buffer.from(""),
    })),
    schemaMetadata: dummySchemas[0]!.revisions[0]!.metadata.map((m) => ({
      metadata: JSON.parse(m.content),
      serializedMetadata: Buffer.from(m.content),
    })),
  };
}
