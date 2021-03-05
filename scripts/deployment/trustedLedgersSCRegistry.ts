import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  const ledgerLib = await deployments.deploy("LedgerLib", opts);
  const scLib = await deployments.deploy("SmartContractLib", opts);

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
func.dependencies = ["LedgerLib", "SmartContractLib", "Pagination"];
