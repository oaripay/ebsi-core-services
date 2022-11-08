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
    // contract:
    //   "contracts/bootstrap/utils/Pagination.sol/Pagination",
  });
  const optsPagination = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
    },
  };

  const appLib = await deployments.deploy("AppLib", optsPagination);
  const authLib = await deployments.deploy("AuthLib", opts);
  const revocationLib = await deployments.deploy("RevocationLib", opts);
  const TarPolicyLib = await deployments.deploy("TarPolicyLib", {
    ...optsPagination,
    // contract:
    //   "contracts/trusted-apps-registry-ethereum-sc/contracts/tar/TarPolicyLib.sol:TarPolicyLib",
  });

  const ts = await deployments.deploy("Tar", {
    from: deployer,
    libraries: {
      AppLib: appLib.address,
      AuthLib: authLib.address,
      TarPolicyLib: TarPolicyLib.address,
      RevocationLib: revocationLib.address,
    },
    log: true,
  });

  deployments.log("Trusted Apps Registry deployed at:", ts.address);
};
export default func;
func.tags = ["Tar"];
