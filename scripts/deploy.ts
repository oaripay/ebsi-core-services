import { ethers } from "hardhat";
import { PolicyRegistry } from "../src/types";

async function main() {
  const policyRegistryFactory = await ethers.getContractFactory(
    "PolicyRegistry"
  );
  const policyContract =
    (await policyRegistryFactory.deploy()) as PolicyRegistry;
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  console.log(
    `Policy contract version set to: ${await policyContract.version()}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
