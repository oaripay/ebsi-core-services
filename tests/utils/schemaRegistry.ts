import crypto from "crypto";
import { ethers } from "ethers";
import ganache from "ganache-core";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import {
  SchemaSCRegistry,
  SchemaSCRegistry__factory,
  SchemaLib__factory,
} from "../../src/contracts/trusted-schemas";
import PaginationArtifact from "../../submodules/trusted-schemas-registry-ethereum-sc/artifacts/contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol/Pagination.json";

interface SchemaObject {
  schema: unknown;
  metadata: unknown;
  serializedSchema: Buffer;
  serializedMetadata: Buffer;
  schemaId: string;
}

export interface PolicyObject {
  policyId: string;
  policyData: unknown;
  policyHash: string;
}

const randomOid = () =>
  `1.3.6.1.4.1.${Math.ceil(Math.random() * 2020)}.${Math.ceil(
    Math.random() * 10
  )}.${Math.ceil(Math.random() * 250)}.${Math.ceil(
    Math.random() * 3
  )}.${Math.ceil(Math.random() * 3)}.${Math.ceil(
    Math.random() * 3
  )}.${Math.ceil(Math.random() * 100)}`;

export async function insertSchema(
  contract: SchemaSCRegistry
): Promise<SchemaObject> {
  const schemaId = `0x${Buffer.from(randomOid()).toString("hex")}`;

  const schema = {
    "@context": "https://ebsi.com",
    type: "CustomSchema",
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
  };

  const serializedSchema = Buffer.from(JSON.stringify(schema));

  const metadata = {
    meta: "value",
    data: `data-${crypto.randomBytes(16).toString("hex")}`,
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

export async function insertPolicy(
  contract: SchemaSCRegistry
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
  contract: SchemaSCRegistry,
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

export async function deploySchemasRegistryContract(
  ethersProvider: ethers.providers.Web3Provider
): Promise<SchemaSCRegistry> {
  const owner = ethersProvider.getSigner();

  // Deploy libs
  const paginationAddress = (
    await new ethers.ContractFactory(
      PaginationArtifact.abi,
      PaginationArtifact.bytecode,
      owner
    ).deploy()
  ).address;

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
        Buffer.from("contracts/trusted-schemas-registry/SchemaLib.sol:SchemaLib", "utf-8")
      )
    );
    ```
    -> 0x88ab2ccec2edd5f1fa8d2957a7a4b5dfb8c55b2964ed57111b971506e0878efa

    Mapping:

    __$88ab2ccec2edd5f1fa8d2957a7a4b5dfb8$__ = "contracts/trusted-schemas-registry/SchemaLib.sol:SchemaLib"
    __$515a15b27d7e720e4d91814eed9672e50c$__ = "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination"
  */

  const schemaLibAddress = (
    await new SchemaLib__factory(
      {
        __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
      },
      owner
    ).deploy()
  ).address;

  const schemasRegistry = await new SchemaSCRegistry__factory(
    {
      __$88ab2ccec2edd5f1fa8d2957a7a4b5dfb8$__: schemaLibAddress,
      __$515a15b27d7e720e4d91814eed9672e50c$__: paginationAddress,
    },
    owner
  ).deploy();

  return schemasRegistry;
}

export async function insertAdmin(
  contract: SchemaSCRegistry,
  adminAddress: string
): Promise<ethers.ContractTransaction> {
  const adminDid = `did:ebsi:${adminAddress.toLowerCase()}`;
  const bufferAttribute = Buffer.from(
    JSON.stringify({
      "@context": {
        name: { "@id": "http://tar-api-test.org/name", "@type": "@id" },
        description: "http://tar-api-test.org/description",
      },
      name: `test-${adminDid}`,
    })
  );

  return contract.insertAdministrator(adminDid, bufferAttribute);
}

export interface SetupOptions {
  administratorsTotal?: number;
  schemasTotal?: number;
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    administratorsTotal: 1,
    schemasTotal: 1,
    policiesTotal: 1,
    policiesRevisionsTotal: 1,
  }
): Promise<{
  provider: ethers.providers.Web3Provider;
  schemasRegistryContract: SchemaSCRegistry;
  administrators: ethers.Wallet[];
  schemas: SchemaObject[];
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
}> {
  const ethersProvider = new ethers.providers.Web3Provider(ganache.provider());

  // Deploy contract
  const schemasRegistryContract = await deploySchemasRegistryContract(
    ethersProvider
  );

  const createAdminWallet = async () => {
    // Create random wallet and connect it so we can use it later to send transactions
    const wallet = ethers.Wallet.createRandom().connect(ethersProvider);
    await insertAdmin(schemasRegistryContract, wallet.address);
    return wallet;
  };

  const administrators = await range(0, opts.administratorsTotal)
    .pipe(mergeMap(createAdminWallet), toArray())
    .toPromise();
  // Insert fake data
  const schemas = await Promise.all(
    Array(opts.schemasTotal)
      .fill(0)
      .map(() => insertSchema(schemasRegistryContract))
  );

  const policyRevisions = {};

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(schemasRegistryContract);

    const createRevision = async () =>
      updatePolicy(schemasRegistryContract, policy.policyId);

    // For each policy, add revisions
    policyRevisions[policy.policyId] = [
      // The first revision is the policy itself
      policy,
      // Then, we add new revisions
      ...(await range(0, opts.policiesRevisionsTotal - 1)
        .pipe(mergeMap(createRevision), toArray())
        .toPromise()),
    ];

    return policy;
  };

  const policies =
    opts.policiesRevisionsTotal >= 1
      ? await range(0, opts.policiesTotal)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise()
      : [];

  // Return test env variables
  return {
    provider: ethersProvider,
    schemasRegistryContract,
    administrators,
    schemas,
    policies,
    policyRevisions,
  };
}
