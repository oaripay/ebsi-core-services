import "../../../../contracts/trusted-policies-registry-v2/src/types/hardhat.d.ts";

import hre from "hardhat";

import "@nomiclabs/hardhat-ethers";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { ethers } from "ethers";
import crypto from "node:crypto";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";

export interface PolicyObject {
  description: string;
  policyId: number;
  policyName: string;
  status: true;
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

export async function insertPolicy(
  contract: PolicyRegistry,
  policyId: number,
): Promise<PolicyObject> {
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const description = crypto.randomBytes(16).toString("hex");

  await contract.insertPolicy(policyName, description);

  return {
    description,
    policyId: policyId + 1,
    policyName,
    status: true,
  };
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

  const policies =
    policiesTotal >= 1
      ? (await range(0, policiesTotal)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise())!
      : [];

  const users =
    usersTotal >= 1
      ? (await range(0, usersTotal)
          .pipe(mergeMap(createUser), toArray())
          .toPromise())!
      : [];

  // Return test env variables
  return {
    adminWallet,
    policies,
    policiesRegistryContract,
    provider: ethersProvider,
    users,
  };
}
