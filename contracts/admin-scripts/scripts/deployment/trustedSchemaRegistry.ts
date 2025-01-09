import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import { ethers } from "hardhat";

import dependencies from "./dependencies.json";

function validateChainId(
  chainId: string,
): asserts chainId is keyof typeof dependencies {
  if (!(chainId in dependencies)) throw new Error(`Invalid chainId ${chainId}`);
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };
  // get Proxy of TPR
  const chainId = `${(await ethers.provider.getNetwork()).chainId}`;

  validateChainId(chainId);

  console.log(`chain id ${chainId}`);

  const deps = dependencies[chainId];

  if (!("tprV1Address" in deps)) {
    throw new Error("tprV1Address does not exist");
  }

  let tprAddress = deps.tprV1Address;

  if (!ethers.isAddress(tprAddress)) {
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
      Pagination: pagination.address,
      SchemaLib: schemaLib.address,
    },
  });

  deployments.log("Trusted Schema Registry deployed at:", ts.address);
};

func.tags = ["SchemaSCRegistry"];
func.dependencies = ["SchemaLib", "Pagination"];

export default func;
