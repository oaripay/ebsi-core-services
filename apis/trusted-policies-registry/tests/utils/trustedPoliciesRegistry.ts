import hre from "hardhat";
import "@nomiclabs/hardhat-ethers";
import crypto from "crypto";
import { ethers } from "ethers";
import { range } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import {
  PolicyRegistry,
  PolicyRegistry__factory,
} from "@ebsiint-sc/trusted-policies-registry";
import PaginationArtifact from "@ebsiint-sc/bootstrap/artifacts/contracts/utils/Pagination.sol/Pagination.json";
import {
  ATTRIBUTE_OPERATIONS,
  ATTRIBUTE_TYPES,
  OPERATION_TYPES,
} from "../../src/modules/policies/policies.interface";

export interface PolicyObject {
  policyId: number;
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
  description: string;
  status: true;
}

export interface UserObject {
  address: string;
  attributes: {
    [x: string]: string;
  };
}

export async function insertPolicy(
  contract: PolicyRegistry,
  policyId: number
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
      value: new Uint8Array(32),
      expectedValue: false,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    {
      name: "condition-boolean-array",
      attributeName: "any",
      value: [...(Array(31).fill(0) as number[]), 1],
      expectedValue: true,
      attributeOperation: ATTRIBUTE_OPERATIONS.indexOf("EQUAL"),
      typeOfValue: ATTRIBUTE_TYPES.indexOf("BOOLEAN"),
    },
    {
      name: "condition-boolean-string",
      attributeName: "any",
      value: `0x${"00".repeat(31)}01`,
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
  const description = crypto.randomBytes(16).toString("hex");

  await contract.insertPolicy(
    opType,
    // Remove "expectedValue" from properties
    policyConditions.map(({ expectedValue, ...otherProps }) => otherProps),
    policyName,
    description
  );

  return {
    policyId,
    opType,
    policyConditions,
    policyName,
    description,
    status: true,
  };
}

export async function insertUser(
  contract: PolicyRegistry
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
  attributeNames.forEach((name, i) => {
    user.attributes[name] = attributeValues[i];
  });

  await contract.insertUserAttributes(
    user.address,
    attributeNames,
    attributeValues
  );

  return user;
}

export async function deployPoliciesRegistryContract(): Promise<PolicyRegistry> {
  const signer = hre.ethers.provider.getSigner();
  const paginationFactory = await hre.ethers.getContractFactoryFromArtifact(
    PaginationArtifact,
    signer
  );
  const paginationContract = await paginationFactory.deploy();
  await paginationContract.deployed();

  const policiesRegistryFactory = new PolicyRegistry__factory(
    {
      "@ebsiint-sc/bootstrap/contracts/utils/Pagination.sol:Pagination":
        paginationContract.address,
    },
    signer
  );
  const policiesRegistry = await policiesRegistryFactory.deploy();
  await policiesRegistry.initialize(1);

  return policiesRegistry;
}

export interface SetupOptions {
  policiesTotal?: number;
  usersTotal?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    policiesTotal: 1,
  }
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
    opts.policiesTotal >= 1
      ? await range(0, opts.policiesTotal)
          .pipe(mergeMap(createPolicy), toArray())
          .toPromise()
      : [];

  const users =
    opts.usersTotal >= 1
      ? await range(0, opts.usersTotal)
          .pipe(mergeMap(createUser), toArray())
          .toPromise()
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
