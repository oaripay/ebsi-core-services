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
    "contracts/trusted-apps-registry-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
    opts
  );
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
  const policyLib = await deployments.deploy("PolicyLib", optsPagination);
  const adminLib = await deployments.deploy("AdminLib", optsPagination);

  const ts = await deployments.deploy("Tar", {
    from: deployer,
    libraries: {
      AppLib: appLib.address,
      AuthLib: authLib.address,
      PolicyLib: policyLib.address,
      AdminLib: adminLib.address,
      RevocationLib: revocationLib.address,
    },
    log: true,
  });

  deployments.log("Trusted Apps Registry deployed at:", ts.address);
};
export default func;
func.tags = ["TrustedAppsRegistry"];
