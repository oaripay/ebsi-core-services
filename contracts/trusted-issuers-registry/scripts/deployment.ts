import { ethers } from "hardhat";
import { Tir } from "../src/types";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";

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
  const policyContract =
    (await policyRegistryFactory.deploy()) as PolicyRegistry;
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  const tirFactory = await ethers.getContractFactory("Tir", {});
  const tir = (await tirFactory.deploy()) as Tir;

  await tir.initialize(25);
  await tir.setRegistryAddresses();

  console.log("Trusted Issuers Registry deployed at :", tir.address);
  console.log(`Contract version set to: ${await tir.version()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
