import { ethers } from "hardhat";

async function main() {
  const paginationFactory = await ethers.getContractFactory("Pagination");
  const pagination = await paginationFactory.deploy();
  const policyRegistryFactory = await ethers.getContractFactory(
    "PolicyRegistry",
    {
      libraries: {
        Pagination: pagination.address,
      },
    },
  );
  const policyContract = await policyRegistryFactory.deploy();
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  console.log(
    `Policy contract version set to: ${(await policyContract.version()).toString()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
