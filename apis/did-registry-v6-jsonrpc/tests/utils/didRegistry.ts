// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../../contracts/did-registry-v4/src/types/hardhat.d.ts" />
import hre from "hardhat";
import { FactoryOptions } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import { Contract, ethers } from "ethers";
import {
  DidRegistry,
  DidRegistry__factory,
  PolicyRegistryMock,
} from "@ebsiint-sc/did-registry-v4";
import { createUser, UserDetails } from "./data.js";

const deployContract = async (
  name: string,
  opts: FactoryOptions = {},
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.address;
};

export async function deployDidRegistryContract(): Promise<{
  didRegistryContract: DidRegistry;
  policyContractMock: PolicyRegistryMock;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory =
    await hre.ethers.getContractFactory("PolicyRegistryMock");
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address,
  );

  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(
    testTprAddress,
  ) as PolicyRegistryMock;

  const vRelationshipsLibAddress = await deployContract("VRelationshipsLib");

  const didRegistryContractFactory = (await hre.ethers.getContractFactory(
    "DidRegistry",
    {
      libraries: {
        DidDocumentLib: await deployContract("DidDocumentLib", {
          libraries: {
            VRelationshipsLib: vRelationshipsLibAddress,
          },
        }),
        ControllersLib: await deployContract("ControllersLib"),
      },
    },
  )) as DidRegistry__factory;

  const didRegistryContract =
    await didRegistryContractFactory.deploy(testTprAddress);

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
  const acc = hre.config.networks.hardhat.accounts as { mnemonic: string };
  const hd = ethers.utils.HDNode.fromMnemonic(acc.mnemonic);
  const wallet = new ethers.Wallet(
    hd.derivePath(`m/44'/60'/0'/0/${indexAccount}`).privateKey,
  );
  const user = await createUser(wallet);

  const now = Math.floor(Date.now() / 1000);

  await contract.insertDidDocument(
    user.did,
    JSON.stringify({ "@context": user.didDocument["@context"] }),
    user.thumbprint,
    wallet.publicKey,
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

export interface SetupOptions {
  didDocumentsTotal?: number;
}

export async function setupTestEnv({
  didDocumentsTotal = 1,
}: SetupOptions = {}): Promise<{
  provider: ethers.providers.JsonRpcProvider;
  didRegistryContract: DidRegistry;
  policyContractMock: Contract;
  users: UserDetails[];
}> {
  const ethersProvider = hre.ethers.provider;
  const users: UserDetails[] = [];

  // Deploy contract
  const { didRegistryContract, policyContractMock } =
    await deployDidRegistryContract();

  users.push(
    ...(await Promise.all(
      Array(didDocumentsTotal)
        .fill(0)
        .map((_, index) => insertDidDocument(didRegistryContract, index)),
    )),
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    didRegistryContract,
    policyContractMock,
    users,
  };
}
