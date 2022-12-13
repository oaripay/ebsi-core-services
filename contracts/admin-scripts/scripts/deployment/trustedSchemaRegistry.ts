import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { dependencies } from "./dependencies";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };
  // get Proxy of TPR
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`chain id ${chainId}`);
  let tprAddress = dependencies[chainId]?.tprAddress;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  }
  console.log(`Trusted Policy Registry Address is ${tprAddress}`);
  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract: "contracts/bootstrap/utils/Pagination.sol/Pagination",
  });

  const schemaLib = await deployments.deploy("SchemaLib", {
    ...opts,
    libraries: { Pagination: pagination.address },
  });

  const ts = await deployments.deploy("SchemaSCRegistry", {
    ...opts,
    args: [tprAddress],
    libraries: {
      SchemaLib: schemaLib.address,
      Pagination: pagination.address,
    },
  });

  deployments.log("Trusted Schema Registry deployed at:", ts.address);
};

func.tags = ["SchemaSCRegistry"];
func.dependencies = ["SchemaLib", "Pagination"];

export default func;
