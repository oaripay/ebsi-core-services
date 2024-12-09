import "../../../../contracts/trusted-policies-registry/src/types/hardhat.d.ts";

import hre from "hardhat";

import "@nomiclabs/hardhat-ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { ethers } from "ethers";
import crypto from "node:crypto";

import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "../../src/modules/policies/policies.interface.js";

export interface PolicyObject {
  description: string;
  opType: number;
  policyConditions: {
    attributeName: string;
    attributeOperation: number;
    expectedValue: boolean | number | string;
    name: string;
    typeOfValue: number;
    value: ethers.BytesLike;
  }[];
  policyId: number;
  policyName: string;
  status: true;
}

export interface SetupOptions {
  policiesTotal?: number;
  usersTotal?: number;
}

export interface UserObject {
  address: string;
  attributes: Record<string, string>;
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
    },
  );
  const policiesRegistry = await policiesRegistryFactory.deploy();
  await policiesRegistry.initialize(1);

  return policiesRegistry;
}

export async function insertPolicy(
  contract: PolicyRegistry,
  policyId: number,
): Promise<PolicyObject> {
  const opType = OPERATION_TYPES.indexOf("AND");
  const policyConditions = [
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "vxc4gdbfgb",
      name: "condition-string",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("STRING"),
      value: ethers.utils.toUtf8Bytes("vxc4gdbfgb"),
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "0x61736461736464", // bytes representation of "asdasdd"
      name: "condition-bytes",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BYTES"),
      value: ethers.utils.toUtf8Bytes("asdasdd"),
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: false,
      name: "condition-boolean-uint8array",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
      value: new Uint8Array(32),
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: true,
      name: "condition-boolean-array",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
      value: [...(Array.from({ length: 31 }).fill(0) as number[]), 1],
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: true,
      name: "condition-boolean-string",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
      value: `0x${"00".repeat(31)}01`,
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "0x00000000219ab540356cbb839cbe05303d7705fa",
      name: "condition-address",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("ADDRESS"),
      value: "0x00000000219ab540356cbb839cbe05303d7705fa",
    },
    {
      attributeName: "any",
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      expectedValue: "42", // as string, because UINT256 can be greater than JS' Number.MAX_SAFE_INTEGER
      name: "condition-uint256",
      typeOfValue: ATTRIBUTE_TYPES.indexOf("UINT256"),
      value: `0x${(42).toString(16)}`, // 42 in hex
    },
  ];
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const description = crypto.randomBytes(16).toString("hex");

  await contract.insertPolicy(
    opType,
    // Remove "expectedValue" from properties
    policyConditions.map(({ expectedValue, ...otherProps }) => otherProps),
    policyName,
    description,
  );

  return {
    description,
    opType,
    policyConditions,
    policyId,
    policyName,
    status: true,
  };
}

export async function insertUser(
  contract: PolicyRegistry,
): Promise<UserObject> {
  const attributeNames = ["test-attr1", "test-attr2", "test-attr3"];
  const attributeValues = [
    `0x${crypto.randomBytes(12).toString("hex")}`,
    `0x${crypto.randomBytes(20).toString("hex")}`,
    `0x${crypto.randomBytes(32).toString("hex")}`,
  ];
  const user: UserObject = {
    address: ethers.Wallet.createRandom().address,
    attributes: {},
  };
  for (const [i, name] of attributeNames.entries()) {
    user.attributes[name] = attributeValues[i]!;
  }

  await contract.insertUserAttributes(
    user.address,
    attributeNames,
    attributeValues,
  );

  return user;
}

export async function setupTestEnv(opts: SetupOptions): Promise<{
  adminWallet: ethers.Wallet;
  policies: PolicyObject[];
  policiesRegistryContract: PolicyRegistry;
  provider: ethers.providers.JsonRpcProvider;
  users: UserObject[];
}> {
  const { policiesTotal, usersTotal } = {
    policiesTotal: 1,
    usersTotal: 1,
    ...opts,
  };
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const policiesRegistryContract = await deployPoliciesRegistryContract();

  // Grant OPERATOR_ROLE to admin wallet
  const adminWallet = ethers.Wallet.createRandom();
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";
  await policiesRegistryContract.grantRole(OPERATOR_ROLE, adminWallet.address);

  // Create as many policies as requested
  const createPolicy = async (id: number) => {
    return insertPolicy(policiesRegistryContract, id);
  };

  const createUser = async () => {
    return insertUser(policiesRegistryContract);
  };

  const policies: PolicyObject[] = [];
  for (let i = 0; i < policiesTotal; i++) {
    policies.push(await createPolicy(i));
  }

  const users: UserObject[] = [];
  for (let i = 0; i < usersTotal; i++) {
    users.push(await createUser());
  }

  // Return test env variables
  return {
    adminWallet,
    policies,
    policiesRegistryContract,
    provider: ethersProvider,
    users,
  };
}
