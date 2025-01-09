import "../../../../contracts/trusted-policies-registry-v3/src/types/hardhat.d.ts";

import hre from "hardhat";

import "@nomicfoundation/hardhat-ethers";

import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";

import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v3";
import { ethers } from "ethers";

import { dummyPolicies, dummyUsers } from "./data.js";

export interface PolicyObject {
  description: string;
  policyId: string;
  policyName: string;
  status: boolean;
}

export interface SetupOptions {
  policiesTotal?: number;
  usersTotal?: number;
}

export interface UserObject {
  attributes: string[];
  user: string;
}

export async function deployPoliciesRegistryContract(): Promise<PolicyRegistry> {
  const policiesRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistry");

  const policyRegistry = await policiesRegistryFactory.deploy();
  await policyRegistry.initialize(1);
  return policyRegistry;
}

export async function insertUser(
  contract: PolicyRegistry,
): Promise<UserObject> {
  const user: UserObject = {
    attributes: ["test-attr1", "test-attr2", "test-attr3"],
    user: ethers.Wallet.createRandom().address,
  };

  await contract.insertUserAttributes(user.user, user.attributes);

  return user;
}

export async function setupTestEnv(): Promise<{
  adminWallet: ethers.BaseWallet;
  policies: PolicyObject[];
  policiesRegistryContract: PolicyRegistry;
  provider: HardhatEthersProvider;
  users: UserObject[];
}> {
  const ethersProvider = hre.ethers.provider;

  // Deploy contract
  const policiesRegistryContract = await deployPoliciesRegistryContract();

  // Grant OPERATOR_ROLE to admin wallet
  const adminWallet = ethers.Wallet.createRandom();
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";
  await policiesRegistryContract.grantRole(OPERATOR_ROLE, adminWallet.address);

  // Return test env variables
  return {
    adminWallet,
    policies: dummyPolicies,
    policiesRegistryContract,
    provider: ethersProvider,
    users: dummyUsers,
  };
}
