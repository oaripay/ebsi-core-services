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

  const ts = await deployments.deploy("PolicyRegistryV2", {
    ...opts,
    contract:
      "contracts/trusted-policies-registry-v2/trusted-policies-registry/PolicyRegistry.sol:PolicyRegistry",
    libraries: {
      Pagination: pagination.address,
    },
  });

  deployments.log("Trusted Policies Registry v2 deployed at:", ts.address);
};

func.tags = ["PolicyRegistryV2"];
func.dependencies = ["Pagination"];

export default func;
