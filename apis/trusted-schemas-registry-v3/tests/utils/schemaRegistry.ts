// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-schemas-registry-v2/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "node:crypto";
import { Contract, ethers } from "ethers";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry-v2";
import { computeId } from "@ebsiint-api/shared";
import { createDid, createSchema } from "./data.js";

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
  contract: SchemaSCRegistry,
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
  contract: SchemaSCRegistry,
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
  contract: SchemaSCRegistry,
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
  schemasRegistryContract: SchemaSCRegistry;
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

  const schemaLibFactory = await hre.ethers.getContractFactory("SchemaLib", {});
  const schemaLib = await schemaLibFactory.deploy();

  const schemasRegistryFactory = await hre.ethers.getContractFactory(
    "SchemaSCRegistry",
    {
      libraries: {
        SchemaLib: schemaLib.address,
      },
    },
  );
  const schemasRegistry = await schemasRegistryFactory.deploy(testTprAddress);
  await policyContractMock.setPolicyResult(true);

  return { schemasRegistryContract: schemasRegistry, policyContractMock };
}

export interface SetupOptions {
  schemasTotal?: number;
  schemaRevisionsTotal?: number;
  schemaMetadataTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    schemasTotal: 1,
    schemaRevisionsTotal: 1,
    schemaMetadataTotal: 1,
  },
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  schemasRegistryContract: SchemaSCRegistry;
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

  const schemas = await Promise.all(
    Array(opts.schemasTotal ?? 1)
      .fill(0)
      .map(() => insertSchema(schemasRegistryContract)),
  );

  const schemaRevisions = await Promise.all(
    Array(Math.max(0, (opts.schemaRevisionsTotal ?? 1) - 1))
      .fill(0)
      .map(() => updateSchema(schemas[0]!.schemaId, schemasRegistryContract)),
  );

  const schemaRevisionId = ethers.utils.sha256(schemas[0]!.serializedSchema);
  const schemaMetadata = await Promise.all(
    Array(Math.max(0, (opts.schemaMetadataTotal ?? 1) - 1))
      .fill(0)
      .map(() => updateMetadata(schemaRevisionId, schemasRegistryContract)),
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    schemasRegistryContract,
    policyContractMock,
    user,
    schemas,
    schemaRevisions,
    schemaMetadata,
  };
}
