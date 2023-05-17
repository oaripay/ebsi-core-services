import { ethers } from "hardhat";

async function main() {
  const paginationFactory = await ethers.getContractFactory("Pagination", {});
  const pagination = await paginationFactory.deploy();
  const policyRegistryFactory = await ethers.getContractFactory(
    "PolicyRegistry",
    {
      libraries: {
        Pagination: pagination.address,
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
      Pagination: pagination.address,
    },
  });
  const didRecordLib = await didRecordFactory.deploy();

  const policyFactory = await ethers.getContractFactory("PolicyLib", {
    libraries: {
      Pagination: pagination.address,
    },
  });
  const policyLib = await policyFactory.deploy();

  const contractFactory = await ethers.getContractFactory("DidRegistry", {
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      DidTimestampLib: didTimestampLib.address,
      DidRecordLib: didRecordLib.address,
      PolicyLib: policyLib.address,
    },
  });
  const didContract = await contractFactory.deploy(policyContract.address);
  await didContract.initialize(16);
  await didContract.setTrustedPoliciesRegistryAddress();

  console.log("DID Registry deployed at :", didContract.address);
  console.log(`Contract version set to: ${await didContract.version()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
