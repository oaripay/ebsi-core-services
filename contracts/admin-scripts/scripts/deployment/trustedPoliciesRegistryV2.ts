import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  const ts = await deployments.deploy("PolicyRegistryV2", {
    ...opts,
    contract:
      "contracts/trusted-policies-registry-v2/trusted-policies-registry/PolicyRegistry.sol:PolicyRegistry",
  });

  deployments.log("Trusted Policies Registry v2 deployed at:", ts.address);
};

func.tags = ["PolicyRegistryV2"];

export default func;
