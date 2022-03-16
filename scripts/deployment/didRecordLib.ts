import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };
  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract:
      "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
  });
  const didTimestampLib = await deployments.deploy("DidTimestampLib", {
    ...opts,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/DidTimestampLib.sol:DidTimestampLib",
  });

  await deployments.deploy("DidRecordLib", {
    ...opts,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/DidRecordLib.sol:DidRecordLib",
    libraries: {
      Pagination: pagination.address,
      DidTimestampLib: didTimestampLib.address,
    },
  });
};
export default func;
func.tags = ["DidRecordLib"];
func.dependencies = ["DidTimestampLib", "Pagination"];
