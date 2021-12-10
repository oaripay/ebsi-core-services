import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { PolicyRegistry } from "../../src/contracts";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "../../src/modules/policies/policies.interface";

export interface PolicyObject {
  opType: number;
  policyConditions: {
    name: string;
    attributeName: string;
    typeOfValue: number;
    value: ethers.BytesLike;
    expectedValue: string | number | boolean;
    attributeOperation: number;
  }[];
  policyName: string;
  registry: string;
  status: true;
}

export async function insertPolicy(
  contract: PolicyRegistry
): Promise<PolicyObject> {
  const opType = OPERATION_TYPES.indexOf("AND");
  const policyConditions = [
    {
      name: "condition-string",
      attributeName: "any",
      value: ethers.utils.toUtf8Bytes("vxc4gdbfgb"),
      expectedValue: "vxc4gdbfgb",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
    },
    {
      name: "condition-bytes",
      attributeName: "any",
      value: ethers.utils.toUtf8Bytes("asdasdd"),
      expectedValue: "0x61736461736464", // bytes representation of "asdasdd"
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES"),
    },
    {
      name: "condition-boolean-uint8array",
      attributeName: "any",
      value: new Uint8Array([0]), // Uint8Array([0]) => false
      expectedValue: false,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    {
      name: "condition-boolean-array",
      attributeName: "any",
      value: [1], // [1] => true
      expectedValue: true,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    {
      name: "condition-boolean-string",
      attributeName: "any",
      value: "0x01", // "0x01" => true
      expectedValue: true,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    {
      name: "condition-address",
      attributeName: "any",
      value: "0x00000000219ab540356cbb839cbe05303d7705fa",
      expectedValue: "0x00000000219ab540356cbb839cbe05303d7705fa",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("ADDRESS"),
    },
    {
      name: "condition-uint256",
      attributeName: "any",
      value: `0x${(42).toString(16)}`, // 42 in hex
      expectedValue: "42", // as string, because UINT256 can be greater than JS' Number.MAX_SAFE_INTEGER
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("UINT256"),
    },
  ];
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const registry = `registry-test-${crypto.randomBytes(16).toString("hex")}`;

  await contract.insertPolicy(
    opType,
    // Remove "expectedValue" from properties
    policyConditions.map(({ expectedValue, ...otherProps }) => otherProps),
    policyName,
    registry
  );

  return {
    opType,
    policyConditions,
    policyName,
    registry,
    status: true,
  };
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
  adminWallet: ethers.Wallet;
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const policiesRegistryContract = await deployPoliciesRegistryContract();

  // Grant OPERATOR_ROLE to admin wallet
  const adminWallet = ethers.Wallet.createRandom();
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";
  await policiesRegistryContract.grantRole(OPERATOR_ROLE, adminWallet.address);

  // Create as many policies as requested
  const createPolicy = async () => {
    const policy = await insertPolicy(policiesRegistryContract);

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
    adminWallet,
  };
}
