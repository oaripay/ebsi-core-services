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
  let tprAddress = dependencies[chainId]?.tprV2Address;
  if (!ethers.utils.isAddress(tprAddress)) {
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
    contract:
      "contracts/trusted-schemas-registry-v2/trusted-schemas-registry/SchemaSCRegistry.sol:SchemaSCRegistry",
    args: [tprAddress],
    libraries: {
      SchemaLib: schemaLib.address,
    },
  });

  deployments.log("Trusted Schema Registry v2 deployed at:", ts.address);
};

func.tags = ["SchemaSCRegistryV2"];

export default func;
