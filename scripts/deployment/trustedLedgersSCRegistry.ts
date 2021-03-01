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
  const optsPagination = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
    },
  };

  const ledgerLib = await deployments.deploy("LedgerLib", optsPagination);
  const scLib = await deployments.deploy("SmartContractLib", optsPagination);

  const ts = await deployments.deploy("LedgerSCRegistry", {
    from: deployer,
    libraries: {
      LedgerLib: ledgerLib.address,
      SmartContractLib: scLib.address,
    },
    log: true,
  });

  deployments.log(
    "Trusted Ledgers Smart Contracts Registry deployed at:",
    ts.address
  );
};
export default func;
func.tags = ["LedgerSCRegistry"];
