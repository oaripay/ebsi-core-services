import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

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

  const ts = await deployments.deploy("Timestamp", {
    from: deployer,
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      TimestampLib: timestampLib.address,
      RecordLib: recordLib.address,
    },
    log: true,
  });

  deployments.log("Timestamp deployed at:", ts.address);
};
export default func;
func.tags = ["Timestamp"];
