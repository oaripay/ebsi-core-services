// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-policies-registry-v3/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v3";
import { dummyPolicies, dummyUsers } from "./data.js";

export interface PolicyObject {
  policyId: string;
  policyName: string;
  description: string;
  status: boolean;
}

export interface UserObject {
  user: string;
  attributes: string[];
}

export async function insertUser(
  contract: PolicyRegistry,
): Promise<UserObject> {
  const user: UserObject = {
    user: ethers.Wallet.createRandom().address,
    attributes: ["test-attr1", "test-attr2", "test-attr3"],
  };

  await contract.insertUserAttributes(user.user, user.attributes);

  return user;
}

export async function deployPoliciesRegistryContract(): Promise<PolicyRegistry> {
  const policiesRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistry");

  const policyRegistry = await policiesRegistryFactory.deploy();
  await policyRegistry.initialize(1);
  return policyRegistry;
}

export interface SetupOptions {
  policiesTotal?: number;
  usersTotal?: number;
}

export async function setupTestEnv(): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  policiesRegistryContract: PolicyRegistry;
  policies: PolicyObject[];
  users: UserObject[];
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

  // Return test env variables
  return {
    provider: ethersProvider,
    policiesRegistryContract,
    policies: dummyPolicies,
    users: dummyUsers,
    adminWallet,
  };
}
