// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/trusted-policies-registry-v2/src/types/hardhat.d.ts" />
import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "node:crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";

export interface PolicyObject {
  policyId: number;
  policyName: string;
  description: string;
  status: true;
}

export interface UserObject {
  user: string;
  attributes: string[];
}

export async function insertPolicy(
  contract: PolicyRegistry,
  policyId: number,
): Promise<PolicyObject> {
  const policyName = `policy-test-${crypto.randomBytes(16).toString("hex")}`;
  const description = crypto.randomBytes(16).toString("hex");

  await contract.insertPolicy(policyName, description);

  return {
    policyId: policyId + 1,
    policyName,
    description,
    status: true,
  };
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

  const policyRegistry = await policiesRegistryFactory.deploy();
  await policyRegistry.initialize(1);
  return policyRegistry;
}

export interface SetupOptions {
  policiesTotal?: number;
  usersTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    policiesTotal: 1,
  },
): Promise<{
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

  // Create as many policies as requested
  const createPolicy = async (id: number) => {
    return insertPolicy(policiesRegistryContract, id);
  };

  const createUser = async () => {
    return insertUser(policiesRegistryContract);
  };

  const policies =
    opts.policiesTotal! >= 1
      ? (await range(0, opts.policiesTotal)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise())!
      : [];

  const users =
    opts.usersTotal! >= 1
      ? (await range(0, opts.usersTotal)
          .pipe(mergeMap(createUser), toArray())
          .toPromise())!
      : [];

  // Return test env variables
  return {
    provider: ethersProvider,
    policiesRegistryContract,
    policies,
    users,
    adminWallet,
  };
}
