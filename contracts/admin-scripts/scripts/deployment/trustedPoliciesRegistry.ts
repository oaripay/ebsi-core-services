import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };
  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract: "contracts/bootstrap/utils/Pagination.sol/Pagination",
  });

  const ts = await deployments.deploy("PolicyRegistry", {
    ...opts,
    contract:
      "contracts/trusted-policies-registry/trusted-policies-registry/PolicyRegistry.sol:PolicyRegistry",
    libraries: {
      Pagination: pagination.address,
    },
  });

  deployments.log("Trusted Policies Registry deployed at:", ts.address);
};

func.tags = ["PolicyRegistry"];
func.dependencies = ["Pagination"];

export default func;
