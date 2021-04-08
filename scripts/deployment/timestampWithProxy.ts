import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

import { Timestamp } from "../../src/types/Timestamp";
import { OwnedUpgradeabilityProxy } from "../../src/types/OwnedUpgradeabilityProxy";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;

  const { deployer } = await getNamedAccounts();
  const hashAlgoLib = await deployments.deploy(
    "contracts/timestamp-ethereum-sc/contracts/timestamp/HashAlgoLib.sol:HashAlgoLib",
    {
      from: deployer,
      log: true,
    }
  );
  const timestampLib = await deployments.deploy("TimestampLib", {
    from: deployer,
    log: true,
  });
  const stringManip = await deployments.deploy(
    "contracts/bootstrap-ethereum-sc/contracts/utils/StringManip.sol:StringManip",
    {
      from: deployer,
      log: true,
    }
  );
  const recordLib = await deployments.deploy("RecordLib", {
    from: deployer,
    log: true,
    libraries: {
      StringManip: stringManip.address,
    },
  });
  const op = await deployments.deploy("OwnedUpgradeabilityProxy", {
    from: deployer,
    log: true,
  });

  const proxyfactory = await ethers.getContractFactory(
    "OwnedUpgradeabilityProxy"
  );

  const proxyCtr: OwnedUpgradeabilityProxy = proxyfactory.attach(
    op.address
  ) as OwnedUpgradeabilityProxy;

  deployments.log("proxyCtr:", proxyCtr.address);
  const ts = await deployments.deploy("Timestamp", {
    from: deployer,
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      TimestampLib: timestampLib.address,
      RecordLib: recordLib.address,
    },
    log: true,
  });

  const tsfactory = await ethers.getContractFactory("Timestamp", {
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      TimestampLib: timestampLib.address,
      RecordLib: recordLib.address,
    },
  });
  const tsCtr: Timestamp = tsfactory.attach(op.address) as Timestamp;

  deployments.log("tsCtr:", tsCtr.address);
  let initialVersion = ethers.BigNumber.from(0);
  try {
    initialVersion = await tsCtr.version();
  } catch {
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
  } finally {
    deployments.log("Proxy initialized");
  }
};
export default func;
func.tags = ["TimestampWithProxy"];
