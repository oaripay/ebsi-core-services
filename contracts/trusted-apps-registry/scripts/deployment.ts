import { ethers } from "hardhat";
import type { FactoryOptions } from "hardhat/types";

async function main() {
  const deployContract = async (
    name: string,
    opts: FactoryOptions = {}
  ): Promise<string> => {
    const factory = await ethers.getContractFactory(name, opts);
    const contract = await factory.deploy();
    return contract.address;
  };

  const Pagination = await deployContract("Pagination");

  const policyRegistryFactory = await ethers.getContractFactory(
    "PolicyRegistry",
    {
      libraries: {
        Pagination,
      },
    }
  );
  const policyContract = await policyRegistryFactory.deploy();
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
  const hashAlgoLib = await hashAlgoFactory.deploy();

  const didTimestampFactory = await ethers.getContractFactory(
    "DidTimestampLib"
  );
  const didTimestampLib = await didTimestampFactory.deploy();

  const didRecordFactory = await ethers.getContractFactory("DidRecordLib", {
    libraries: {
      Pagination,
    },
  });
  const didRecordLib = await didRecordFactory.deploy();

  const policyFactory = await ethers.getContractFactory("PolicyLib", {
    libraries: {
      Pagination,
    },
  });
  const policyLib = await policyFactory.deploy();

  const didContractFactory = await ethers.getContractFactory("DidRegistry", {
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      DidTimestampLib: didTimestampLib.address,
      DidRecordLib: didRecordLib.address,
      PolicyLib: policyLib.address,
    },
  });
  const didContract = await didContractFactory.deploy(policyContract.address);
  await didContract.initialize(16);
  await didContract.setTrustedPoliciesRegistryAddress();

  const contractFactory = await ethers.getContractFactory("Tar", {
    libraries: {
      AppLib: await deployContract("AppLib", {
        libraries: { Pagination },
      }),
      TarPolicyLib: await deployContract("TarPolicyLib", {
        libraries: { Pagination },
      }),
      RevocationLib: await deployContract("RevocationLib"),
      AuthLib: await deployContract("AuthLib"),
    },
  });
  const ts = await contractFactory.deploy(
    policyContract.address,
    didContract.address
  );
  await ts.initialize(16);
  await ts.setRegistryAddresses();

  console.log("Trusted Apps Registry deployed at :", ts.address);
  console.log(`Contract version set to: ${await ts.version()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
