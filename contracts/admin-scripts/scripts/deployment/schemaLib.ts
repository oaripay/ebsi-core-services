import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };

  await deployments.deploy("SchemaLib", {
    ...opts,
    contract:
      "contracts/trusted-schemas-registry-v2/trusted-schemas-registry/SchemaLib.sol:SchemaLib",
  });
};

func.tags = ["SchemaLib"];

export default func;
