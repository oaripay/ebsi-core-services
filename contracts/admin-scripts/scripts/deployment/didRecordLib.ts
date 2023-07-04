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
  const didTimestampLib = await deployments.deploy("DidTimestampLib", {
    ...opts,
    contract:
      "contracts/did-registry/did-registry/DidTimestampLib.sol:DidTimestampLib",
  });

  await deployments.deploy("DidRecordLib", {
    ...opts,
    contract:
      "contracts/did-registry/did-registry/DidRecordLib.sol/DidRecordLib",
    libraries: {
      Pagination: pagination.address,
      DidTimestampLib: didTimestampLib.address,
    },
  });
};

func.tags = ["DidRecordLib"];
func.dependencies = ["DidTimestampLib", "Pagination"];

export default func;
