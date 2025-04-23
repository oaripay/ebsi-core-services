import { ethers } from "hardhat";
import type { HardhatRuntimeEnvironment } from "hardhat/types/index.js";

import type { DeployFunction } from "hardhat-deploy/types";

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

  if (!("tprV2Address" in deps)) {
    throw new Error("tprV2Address does not exist");
  }

  let tprAddress = deps.tprV2Address;

  if (!ethers.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistryV2");
    tprAddress = (await deployments.get("PolicyRegistryV2")).address;
  }

  console.log(`Trusted Policy Registry Address is ${tprAddress}`);

  const schemaLib = await deployments.deploy("SchemaLib", {
    ...opts,
    contract:
      "contracts/trusted-schemas-registry-v2/trusted-schemas-registry/SchemaLib.sol:SchemaLib",
  });

  const ts = await deployments.deploy("SchemaSCRegistryV2", {
    ...opts,
    args: [tprAddress],
    contract:
      "contracts/trusted-schemas-registry-v2/trusted-schemas-registry/SchemaSCRegistry.sol:SchemaSCRegistry",
    libraries: {
      SchemaLib: schemaLib.address,
    },
  });

  deployments.log("Trusted Schema Registry v2 deployed at:", ts.address);
};

func.tags = ["SchemaSCRegistryV2"];

export default func;
