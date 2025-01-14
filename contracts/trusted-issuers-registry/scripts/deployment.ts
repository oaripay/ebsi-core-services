import { ethers } from "hardhat";

import type {
  DidRecordLib__factory,
  DidRegistry__factory,
} from "@ebsiint-sc/did-registry";
import type { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry";

async function main() {
  const paginationFactory = await ethers.getContractFactory("Pagination", {});
  const pagination = await paginationFactory.deploy();
  const policyRegistryFactory = (await ethers.getContractFactory(
    "PolicyRegistry",
    {
      libraries: {
        Pagination: await pagination.getAddress(),
      },
    },
  )) as PolicyRegistry__factory;
  const policyContract = await policyRegistryFactory.deploy();
  await policyContract.waitForDeployment();

  console.log("Policy deployed at :", await policyContract.getAddress());

  await policyContract.initialize(1n);

  const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
  const hashAlgoLib = await hashAlgoFactory.deploy();

  const didTimestampFactory =
    await ethers.getContractFactory("DidTimestampLib");
  const didTimestampLib = await didTimestampFactory.deploy();

  const didRecordFactory = (await ethers.getContractFactory("DidRecordLib", {
    libraries: {
      Pagination: await pagination.getAddress(),
    },
  })) as DidRecordLib__factory;
  const didRecordLib = await didRecordFactory.deploy();

  const policyFactory = await ethers.getContractFactory("PolicyLib", {
    libraries: {
      Pagination: await pagination.getAddress(),
    },
  });
  const policyLib = await policyFactory.deploy();

  const didContractFactory = (await ethers.getContractFactory("DidRegistry", {
    libraries: {
      DidRecordLib: await didRecordLib.getAddress(),
      DidTimestampLib: await didTimestampLib.getAddress(),
      HashAlgoLib: await hashAlgoLib.getAddress(),
      PolicyLib: await policyLib.getAddress(),
    },
  })) as DidRegistry__factory;
  const didContract = await didContractFactory.deploy(
    await policyContract.getAddress(),
  );
  await didContract.initialize(16);
  await didContract.setTrustedPoliciesRegistryAddress();

  const tirFactory = await ethers.getContractFactory("Tir", {});
  const tir = await tirFactory.deploy(
    await policyContract.getAddress(),
    await didContract.getAddress(),
  );

  await tir.initialize(25);
  await tir.setRegistryAddresses();

  console.log("Trusted Issuers Registry deployed at :", await tir.getAddress());
  console.log(`Contract version set to: ${(await tir.version()).toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
