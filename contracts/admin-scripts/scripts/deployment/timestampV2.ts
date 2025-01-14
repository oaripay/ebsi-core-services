import { ethers } from "hardhat";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

import type { DeployFunction } from "hardhat-deploy/types";

import dependencies from "./dependencies.json";

function validateChainId(
  chainId: string,
): asserts chainId is keyof typeof dependencies {
  if (!(chainId in dependencies)) throw new Error(`Invalid chainId ${chainId}`);
}

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  // get chain Id
  const chainId = `${(await ethers.provider.getNetwork()).chainId}`;

  validateChainId(chainId);

  console.log(`chain id ${chainId}`);

  const deps = dependencies[chainId];

  if (!("tprV2Address" in deps)) {
    throw new Error("tprV2Address does not exist");
  }

  let tprAddress = deps.tprV2Address;

  if (tprAddress) {
    console.log(`re-using tpr address ${tprAddress}`);
  } else {
    await deployments.run("PolicyRegistryV2");
    tprAddress = (await deployments.get("PolicyRegistryV2")).address;
  }

  const { deployer } = await getNamedAccounts();
  const hashAlgoLib = await deployments.deploy("HashAlgoLib", {
    contract: "contracts/timestamp-v2/timestamp/HashAlgoLib.sol:HashAlgoLib",
    from: deployer,
    log: true,
  });
  const timestampLib = await deployments.deploy("TimestampLib", {
    contract: "contracts/timestamp-v2/timestamp/TimestampLib.sol:TimestampLib",
    from: deployer,
    log: true,
  });
  const stringManip = await deployments.deploy("StringManip", {
    contract: "contracts/bootstrap-v2/utils/StringManip.sol:StringManip",
    from: deployer,
    log: true,
  });
  const recordLib = await deployments.deploy("RecordLib", {
    contract: "contracts/timestamp-v2/timestamp/RecordLib.sol:RecordLib",
    from: deployer,
    libraries: {
      StringManip: stringManip.address,
    },
    log: true,
  });

  const ts = await deployments.deploy("TimestampV2", {
    args: [tprAddress],
    contract: "contracts/timestamp-v2/timestamp/Timestamp.sol:Timestamp",
    from: deployer,
    libraries: {
      HashAlgoLib: hashAlgoLib.address,
      RecordLib: recordLib.address,
      TimestampLib: timestampLib.address,
    },
    log: true,
  });
  deployments.log("HashAlgoLib deployed at: ", hashAlgoLib.address);
  deployments.log("TimestampLib deployed at: ", timestampLib.address);
  deployments.log("RecordLib deployed at: ", recordLib.address);

  deployments.log("Timestamp v2 deployed at:", ts.address);
};

func.tags = ["TimestampV2"];

export default func;
