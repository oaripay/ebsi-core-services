import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { dependencies } from "./dependencies";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  // get Proxy of TPR
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`chain id ${chainId}`);
  let tprAddress = dependencies[chainId]?.tprAddress;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  }
  console.log(`Trusted Policy Registry Address is ${tprAddress}`);

  const ledgerLib = await deployments.deploy("LedgerLib", opts);
  const scLib = await deployments.deploy("SmartContractLib", opts);

  const ts = await deployments.deploy("LedgerSCRegistry", {
    from: deployer,
    args: [tprAddress],
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
