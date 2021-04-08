import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };
  const pagination = await deployments.deploy(
    "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
    opts
  );
  const didTimestampLib = await deployments.deploy("DidTimestampLib", opts);

  await deployments.deploy("DidRecordLib", {
    ...opts,
    libraries: {
      Pagination: pagination.address,
      DidTimestampLib: didTimestampLib.address,
    },
  });
};
export default func;
func.tags = ["DidRecordLib"];
func.dependencies = ["DidTimestampLib", "Pagination"];
