import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };

  await deployments.deploy("DidTimestampLib", {
    ...opts,
    contract:
      "contracts/did-registry-v3/did-registry/DidTimestampLib.sol/DidTimestampLib",
  });
};

func.tags = ["DidTimestampLib"];

export default func;
