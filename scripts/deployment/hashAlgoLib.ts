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

  await deployments.deploy("HashAlgoLib", {
    ...opts,
    contract:
      "contracts/did-registry-ethereum-sc/contracts/did-registry/HashAlgoLib.sol:HashAlgoLib",
    libraries: {
      Pagination: pagination.address,
    },
  });
};
export default func;
func.tags = ["HashAlgoLib"];
func.dependencies = ["Pagination"];
