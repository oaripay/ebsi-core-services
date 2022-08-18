import { ethers } from "hardhat";
import { LedgerSCRegistry, PolicyRegistry } from "../src/types";

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

  const ledgerLibFactory = await ethers.getContractFactory("LedgerLib", {});
  const ledgerLib = await ledgerLibFactory.deploy();

  const smartContractLibFactory = await ethers.getContractFactory(
    "SmartContractLib"
  );
  const smartContractLib = await smartContractLibFactory.deploy();

  const contractFactory = await ethers.getContractFactory("LedgerSCRegistry", {
    libraries: {
      LedgerLib: ledgerLib.address,
      SmartContractLib: smartContractLib.address,
    },
  });
  const ts = (await contractFactory.deploy()) as LedgerSCRegistry;
  await ts.initialize(16);
  await ts.setTrustedPoliciesRegistryAddress();

  console.log(
    "Trusted Ledgers and Smart Contracts Registry deployed at :",
    ts.address
  );
  console.log(`Contract version set to: ${await ts.version()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
