import "../../../../contracts/did-registry-v2/src/types/hardhat.d.ts";

import hre from "hardhat";

import type { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider.js";

import { DidRegistry, PolicyRegistryMock } from "@ebsiint-sc/did-registry-v2";
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";
import { FactoryOptions } from "hardhat/types";

import { createUser, UserDetails } from "./data.js";
import { setupTestEnv as setupTestEnvV1 } from "./didRegistryV1.js";

const deployContract = async (
  name: string,
  opts: FactoryOptions = {},
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.getAddress();
};

export interface SetupOptions {
  didDocumentsTotal?: number;
}

export async function deployDidRegistryContract(
  testDidV3Address: string,
): Promise<{
  didRegistryContract: DidRegistry;
  policyContractMock: PolicyRegistryMock;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");
  const tempPolicyContract = await policyRegistryFactory.deploy();

  const bytecode = await hre.ethers.provider.getCode(
    await tempPolicyContract.getAddress(),
  );

  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(
    testTprAddress,
  ) as PolicyRegistryMock;

  const paginationAddress = await deployContract("Pagination");
  const linkLibPagination = {
    libraries: {
      Pagination: paginationAddress,
    },
  };
  const vRelationshipsLibAddress = await deployContract("VRelationshipsLib");

  const didRegistryContractFactory = await hre.ethers.getContractFactory(
    "DidRegistry",
    {
      libraries: {
        ControllersLib: await deployContract(
          "ControllersLib",
          linkLibPagination,
        ),
        DidDocumentLib: await deployContract("DidDocumentLib", {
          libraries: {
            Pagination: paginationAddress,
            VRelationshipsLib: vRelationshipsLibAddress,
          },
        }),
        VRelationshipsLib: vRelationshipsLibAddress,
      },
    },
  );

  const didRegistryContract = await didRegistryContractFactory.deploy(
    testTprAddress,
    testDidV3Address,
  );

  await didRegistryContract.initialize(1);
  await didRegistryContract.setRegistryAddresses();

  await policyContractMock.setPolicyResult(true);

  return {
    didRegistryContract,
    policyContractMock,
  };
}

export async function insertDidDocument(
  contract: DidRegistry,
  indexAccount: number,
): Promise<UserDetails> {
  const acc = hre.config.networks.hardhat.accounts as {
    mnemonic: string;
    path: string;
  };
  const hd = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(acc.mnemonic),
    acc.path,
  );
  const wallet = hd.derivePath(indexAccount.toString());
  const user = await createUser(wallet);

  const now = Math.floor(Date.now() / 1000);

  await contract.insertDidDocument(
    user.did,
    JSON.stringify({ "@context": user.didDocument["@context"] }),
    user.thumbprint,
    wallet.signingKey.publicKey,
    true,
    now,
    now + 3600,
  );

  await contract.addVerificationRelationship(
    user.did,
    "assertionMethod",
    user.thumbprint,
    now,
    now + 3600,
  );

  return user;
}

export async function setupTestEnv({
  didDocumentsTotal = 1,
}: SetupOptions = {}): Promise<{
  didRegistryContract: DidRegistry;
  policyContractMock: PolicyRegistryMock;
  provider: HardhatEthersProvider;
  setupV1: Awaited<ReturnType<typeof setupTestEnvV1>>;
  users: UserDetails[];
}> {
  const ethersProvider = hre.ethers.provider;
  const users: UserDetails[] = [];

  const setupV1 = await setupTestEnvV1({ didDocumentsTotal });

  // Deploy contract
  const { didRegistryContract, policyContractMock } =
    await deployDidRegistryContract(
      await setupV1.didRegistryV1Contract.getAddress(),
    );

  for (let i = 0; i < didDocumentsTotal; i++) {
    users.push(await insertDidDocument(didRegistryContract, i));
  }

  // Return test env variables
  return {
    didRegistryContract,
    policyContractMock,
    provider: ethersProvider,
    setupV1,
    users,
  };
}
