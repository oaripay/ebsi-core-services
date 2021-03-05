import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  await deployments.deploy(
    "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
    opts
  );
};
export default func;
func.tags = ["Pagination"];
