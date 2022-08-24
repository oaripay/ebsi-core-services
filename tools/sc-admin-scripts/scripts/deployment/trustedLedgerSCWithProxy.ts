import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { LedgerSCRegistry } from "@ebsiint-sc/trusted-ledgers-registry";
import { OwnedUpgradeabilityProxy } from "@ebsiint-sc/proxy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;

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
  const optsPagination = {
    ...opts,
    libraries: {
      Pagination: pagination.address,
    },
  };

  const ledgerLib = await deployments.deploy("LedgerLib", optsPagination);
  const scLib = await deployments.deploy("SmartContractLib", optsPagination);
  const op = await deployments.deploy("TrustedLedgerProxy", {
    ...opts,
    contract: "OwnedUpgradeabilityProxy",
  });
  const proxyfactory = await ethers.getContractFactory(
    "OwnedUpgradeabilityProxy"
  );

  const proxyCtr: OwnedUpgradeabilityProxy = proxyfactory.attach(
    op.address
  ) as OwnedUpgradeabilityProxy;

  deployments.log("proxyCtr:", proxyCtr.address);
  const ts = await deployments.deploy("LedgerSCRegistry", {
    ...opts,
    libraries: {
      LedgerLib: ledgerLib.address,
      SmartContractLib: scLib.address,
    },
  });

  const tsfactory = await ethers.getContractFactory("LedgerSCRegistry", {
    libraries: {
      LedgerLib: ledgerLib.address,
      SmartContractLib: scLib.address,
    },
  });
  const tsCtr: LedgerSCRegistry = tsfactory.attach(
    op.address
  ) as LedgerSCRegistry;

  deployments.log("LedgerSCRegistry Contract:", tsCtr.address);
  let initialVersion = ethers.BigNumber.from(1);
  try {
    initialVersion = await tsCtr.version();
  } catch {
    try {
      deployments.log("InitialVersion:", initialVersion);
      // encode the initialize function of the SC to setup some variables
      const initializeData = tsCtr.interface.encodeFunctionData("initialize", [
        ethers.utils.hexlify(1),
      ]);
      deployments.log("Initializing with:", initializeData);
      const receipt = await proxyCtr["initialize(address,address,bytes)"](
        ts.address,
        deployer,
        initializeData
      );
      deployments.log("Initialization receipt hash:", receipt.hash);
    } catch (e) {
      console.log(e);
    }
  } finally {
    deployments.log("Proxy initialized");
  }
};
export default func;
func.tags = ["LedgerSCRegistryWithProxy"];
