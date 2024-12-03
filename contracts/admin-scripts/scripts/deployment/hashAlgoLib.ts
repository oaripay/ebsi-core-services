import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };

  await deployments.deploy("HashAlgoLib", {
    ...opts,
    contract: "contracts/did-registry/did-registry/HashAlgoLib.sol:HashAlgoLib",
  });
};

func.tags = ["HashAlgoLib"];

export default func;
