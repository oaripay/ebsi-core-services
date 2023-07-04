import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };
  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract: "contracts/bootstrap-v2/utils/Pagination.sol/Pagination",
  });

  await deployments.deploy("HashAlgoLib", {
    ...opts,
    contract: "contracts/did-registry/did-registry/HashAlgoLib.sol:HashAlgoLib",
    libraries: {
      Pagination: pagination.address,
    },
  });
};

func.tags = ["HashAlgoLib"];
func.dependencies = ["Pagination"];

export default func;
