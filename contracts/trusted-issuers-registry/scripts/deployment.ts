import type {
  DidRecordLib__factory,
  DidRegistry__factory,
} from "@ebsiint-sc/did-registry";
import type { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry";

import { ethers } from "hardhat";

async function main() {
  const paginationFactory = await ethers.getContractFactory("Pagination", {});
  const pagination = await paginationFactory.deploy();
  const policyRegistryFactory = (await ethers.getContractFactory(
    "PolicyRegistry",
    {
      libraries: {
        Pagination: pagination.address,
      },
    },
  )) as PolicyRegistry__factory;
  const policyContract = await policyRegistryFactory.deploy();
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
  const hashAlgoLib = await hashAlgoFactory.deploy();

  const didTimestampFactory =
    await ethers.getContractFactory("DidTimestampLib");
  const didTimestampLib = await didTimestampFactory.deploy();

  const didRecordFactory = (await ethers.getContractFactory("DidRecordLib", {
    libraries: {
      Pagination: pagination.address,
    },
  })) as DidRecordLib__factory;
  const didRecordLib = await didRecordFactory.deploy();

  const policyFactory = await ethers.getContractFactory("PolicyLib", {
    libraries: {
      Pagination: pagination.address,
    },
  });
  const policyLib = await policyFactory.deploy();

  const didContractFactory = (await ethers.getContractFactory("DidRegistry", {
    libraries: {
      DidRecordLib: didRecordLib.address,
      DidTimestampLib: didTimestampLib.address,
      HashAlgoLib: hashAlgoLib.address,
      PolicyLib: policyLib.address,
    },
  })) as DidRegistry__factory;
  const didContract = await didContractFactory.deploy(policyContract.address);
  await didContract.initialize(16);
  await didContract.setTrustedPoliciesRegistryAddress();

  const tirFactory = await ethers.getContractFactory("Tir", {});
  const tir = await tirFactory.deploy(
    policyContract.address,
    didContract.address,
  );

  await tir.initialize(25);
  await tir.setRegistryAddresses();

  console.log("Trusted Issuers Registry deployed at :", tir.address);
  console.log(`Contract version set to: ${(await tir.version()).toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
