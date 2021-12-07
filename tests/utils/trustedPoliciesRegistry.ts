import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { PolicyRegistry } from "../../src/contracts";

export interface PolicyObject {
  opType: ethers.BigNumberish;
  policyConditions?: unknown[];
  policyName: string;
  registry: string;
}

export async function insertPolicy(
  contract: PolicyRegistry
): Promise<PolicyObject> {
  const opType = 0;
  const policyConditions = [
    {
      name: "name1",
      attributeName: "attrName1",
      value: ethers.utils.toUtf8Bytes("vxc4gdbfgb"),
      attributeOperation: 0,
      typeOfValue: 3,
    },
    {
      name: "name2",
      attributeName: "attrName2",
      value: ethers.utils.toUtf8Bytes("asdasdd"),
      attributeOperation: 0,
      typeOfValue: 1,
    },
  ];
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const registry = `registry-test-${crypto.randomBytes(16).toString("hex")}`;

  await contract.insertPolicy(opType, policyConditions, policyName, registry);

  return {
    opType,
    policyConditions,
    policyName,
    registry,
  };
}

export async function updatePolicy(
  contract: PolicyRegistry,
  policyId: ethers.BigNumberish
): Promise<PolicyObject> {
  const opType = 0;
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const registry = `registry-test-${crypto.randomBytes(16).toString("hex")}`;

  await contract.updatePolicy(policyId, opType, policyName, registry);

  return { opType, policyName, registry };
}

export async function deployPoliciesRegistryContract(): Promise<PolicyRegistry> {
  const paginationFactory = await hre.ethers.getContractFactory("Pagination");
  const pagination = await paginationFactory.deploy();

  const policiesRegistryFactory = await hre.ethers.getContractFactory(
    "PolicyRegistry",
    {
      libraries: {
        Pagination: pagination.address,
      },
    }
  );
  const policiesRegistry = await policiesRegistryFactory.deploy();
  await policiesRegistry.initialize(1);

  return policiesRegistry;
}

export interface SetupOptions {
  policiesTotal?: number;
  policiesRevisionsTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    policiesTotal: 1,
    policiesRevisionsTotal: 1,
  }
): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  policiesRegistryContract: PolicyRegistry;
  policies: PolicyObject[];
  policyRevisions: { [x: string]: PolicyObject[] };
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const policiesRegistryContract = await deployPoliciesRegistryContract();

  const policyRevisions = {};

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(policiesRegistryContract);

    /*
    const createRevision = async () =>
      updatePolicy(policiesRegistryContract, policy.policyId);

    // For each policy, add revisions
    policyRevisions[policy.policyId] = [
      // The first revision is the policy itself
      policy,
      // Then, we add new revisions
      ...(await range(0, (opts.policiesRevisionsTotal ?? 1) - 1)
        .pipe(mergeMap(createRevision), toArray())
        .toPromise()),
    ];
    */

    return policy;
  };

  const policies =
    opts.policiesRevisionsTotal >= 1
      ? await range(0, opts.policiesTotal ?? 1)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise()
      : [];

  // Return test env variables
  return {
    provider: ethersProvider,
    policiesRegistryContract,
    policies,
    policyRevisions,
  };
}
