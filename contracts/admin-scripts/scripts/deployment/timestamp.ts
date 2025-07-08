import { ethers } from "hardhat";
import type { HardhatRuntimeEnvironment } from "hardhat/types/index.js";

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

  if (!("tprV1Address" in deps)) {
    throw new Error("tprV1Address does not exist");
  }

  let tprAddress = deps.tprV1Address;

  if (tprAddress) {
    console.log(`reusing tpr address ${tprAddress}`);
  } else {
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
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
    libraries: {
      StringManip: stringManip.address,
    },
    log: true,
  });

  const ts = await deployments.deploy("Timestamp", {
    args: [tprAddress],
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

  deployments.log("Timestamp deployed at:", ts.address);
};

func.tags = ["Timestamp"];

export default func;
