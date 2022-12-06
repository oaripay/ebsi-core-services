import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { dependencies } from "./dependencies";
import { ethers } from "hardhat";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  // get chain Id

  const chainId = (await ethers.provider.getNetwork()).chainId;
  let tprAddress = dependencies[chainId]?.tprAddress;

  if (!tprAddress) {
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  } else {
    console.log(`re-using tpr address ${tprAddress}`);
  }

  const { deployer } = await getNamedAccounts();
  const hashAlgoLib = await deployments.deploy("HashAlgoLib", {
    contract: "contracts/timestamp/timestamp/HashAlgoLib.sol:HashAlgoLib",
    from: deployer,
    log: true,
  });
  const timestampLib = await deployments.deploy("TimestampLib", {
    from: deployer,
    log: true,
  });
  const stringManip = await deployments.deploy("StringManip", {
    contract: "contracts/bootstrap/utils/StringManip.sol:StringManip",
    from: deployer,
    log: true,
  });
  const recordLib = await deployments.deploy("RecordLib", {
    from: deployer,
    log: true,
    libraries: {
      StringManip: stringManip.address,
    },
  });

  const ts = await deployments.deploy("Timestamp", {
    from: deployer,
    args: [tprAddress],
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      TimestampLib: timestampLib.address,
      RecordLib: recordLib.address,
    },
    log: true,
  });
  deployments.log("HashAlgoLib deployed at: ", hashAlgoLib.address);
  deployments.log("TimestampLib deployed at: ", timestampLib.address);
  deployments.log("RecordLib deployed at: ", recordLib.address);

  deployments.log("Timestamp deployed at:", ts.address);
};
export default func;
func.tags = ["Timestamp"];
