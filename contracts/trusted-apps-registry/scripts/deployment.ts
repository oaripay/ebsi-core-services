import { ethers } from "hardhat";
import type { FactoryOptions } from "hardhat/types";
import { Tar } from "../src/types";

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
  const ts = (await contractFactory.deploy()) as Tar;
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
