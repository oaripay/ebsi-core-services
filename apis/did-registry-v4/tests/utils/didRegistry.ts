import hre from "hardhat";
import { FactoryOptions } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import { Contract, ethers } from "ethers";
import { DidRegistry, PolicyRegistryMock } from "@ebsiint-sc/did-registry-v4";
import { createUser, UserDetails } from "./data";

const deployContract = async (
  name: string,
  opts: FactoryOptions = {}
): Promise<string> => {
  const factory = await hre.ethers.getContractFactory(name, opts);
  const contract = await factory.deploy();
  return contract.address;
};

export async function deployDidRegistryContract(): Promise<{
  didRegistryContract: DidRegistry;
  policyContractMock: Contract;
}> {
  // mock trusted policies registry
  const testTprAddress = "0xb2a560271ce08135e245F490b8794794A13a1208";
  const policyRegistryFactory = await hre.ethers.getContractFactory(
    "PolicyRegistryMock"
  );
  const tempPolicyContract = await policyRegistryFactory.deploy();
  await tempPolicyContract.deployed();
  const bytecode = await hre.ethers.provider.getCode(
    tempPolicyContract.address
  );

  await hre.network.provider.send("hardhat_setCode", [
    testTprAddress,
    bytecode,
  ]);
  const policyContractMock = policyRegistryFactory.attach(
    testTprAddress
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
        DidDocumentLib: await deployContract("DidDocumentLib", {
          libraries: {
            Pagination: paginationAddress,
            VRelationshipsLib: vRelationshipsLibAddress,
          },
        }),
        ControllersLib: await deployContract(
          "ControllersLib",
          linkLibPagination
        ),
        VRelationshipsLib: vRelationshipsLibAddress,
      },
    }
  );

  const didRegistryContract =
    (await didRegistryContractFactory.deploy()) as DidRegistry;
  await didRegistryContract.initialize(1);
  await didRegistryContract.setTrustedPoliciesRegistryAddress();

  await policyContractMock.setPolicyResult(true);

  return {
    didRegistryContract,
    policyContractMock,
  };
}

export async function insertDidDocument(
  contract: DidRegistry,
  indexAccount: number
): Promise<UserDetails> {
  const acc = hre.config.networks.hardhat.accounts as { mnemonic: string };
  const hd = ethers.utils.HDNode.fromMnemonic(acc.mnemonic);
  const wallet = new ethers.Wallet(
    hd.derivePath(`m/44'/60'/0'/0/${indexAccount}`).privateKey
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
    now + 3600
  );

  await contract.addVerificationRelationship(
    user.did,
    "authentication",
    user.thumbprint,
    now,
    now + 3600
  );

  await contract.addVerificationRelationship(
    user.did,
    "assertionMethod",
    user.thumbprint,
    now,
    now + 3600
  );

  return user;
}

export interface SetupOptions {
  didDocuments?: number;
}

export async function setupTestEnv(
  opts: SetupOptions = {
    didDocuments: 1,
  }
): Promise<{
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
      Array(opts.didDocuments ?? 1)
        .fill(0)
        .map((_, index) => insertDidDocument(didRegistryContract, index))
    ))
  );

  // Return test env variables
  return {
    provider: ethersProvider,
    didRegistryContract,
    policyContractMock,
    users,
  };
}
