import type { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";

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
    },
  );

  const policyContract =
    (await policyRegistryFactory.deploy()) as PolicyRegistry;
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  const tirFactory = await ethers.getContractFactory("Tir", {});

  // FIXME
  // @ts-expect-error DIDR address is missing
  const tir = await tirFactory.deploy(policyContract.address);

  await tir.initialize(25);

  console.log("Trusted Issuers Registry deployed at :", tir.address);
  console.log(`Contract version set to: ${(await tir.version()).toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
