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
    contract: "contracts/bootstrap/utils/Pagination.sol/Pagination",
  });

  const ts = await deployments.deploy("Tir", {
    from: deployer,
    contract: "contracts/trusted-issuers-registry/tir/Tir.sol:Tir",
    libraries: {
      Pagination: pagination.address,
    },
    log: true,
  });

  deployments.log("Trusted Issuers Registry deployed at:", ts.address);
};
export default func;
func.tags = ["Tir"];
