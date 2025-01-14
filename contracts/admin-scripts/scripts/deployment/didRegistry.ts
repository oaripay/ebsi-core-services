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

  const { deployer } = await getNamedAccounts();

  const opts = {
    from: deployer,
    log: true,
  };

  // get Proxy of TPR
  const chainId = `${(await ethers.provider.getNetwork()).chainId}`;

  validateChainId(chainId);

  console.log(`chain id ${chainId}`);

  const deps = dependencies[chainId];

  if (!("tprV1Address" in deps)) {
    throw new Error("tprV1Address does not exist");
  }

  let tprAddress = deps.tprV1Address;

  if (!ethers.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  }
  console.log(`Trusted Policy Registry Address is ${tprAddress}`);

  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract: "contracts/bootstrap/utils/Pagination.sol/Pagination",
  });
  const optsPagination = {
    from: deployer,
    libraries: {
      Pagination: pagination.address,
    },
    log: true,
  };
  const didTimestampLib = await deployments.deploy("DidTimestampLib", {
    ...optsPagination,
    contract:
      "contracts/did-registry/did-registry/DidTimestampLib.sol:DidTimestampLib",
  });
  const didRecordLib = await deployments.deploy("DidRecordLib", {
    contract:
      "contracts/did-registry/did-registry/DidRecordLib.sol/DidRecordLib",
    from: deployer,
    libraries: {
      DidTimestampLib: didTimestampLib.address,
      Pagination: pagination.address,
    },
    log: true,
  });

  const hashAlgoLib = await deployments.deploy("HashAlgoLib", {
    ...optsPagination,
    contract: "contracts/did-registry/did-registry/HashAlgoLib.sol:HashAlgoLib",
  });

  const ts = await deployments.deploy("DidRegistry", {
    args: [tprAddress],
    contract: "contracts/did-registry/did-registry/DidRegistry.sol:DidRegistry",
    from: deployer,
    libraries: {
      DidRecordLib: didRecordLib.address,
      DidTimestampLib: didTimestampLib.address,
      HashAlgoLib: hashAlgoLib.address,
      Pagination: pagination.address,
    },
    log: true,
  });

  deployments.log("Did Registry deployed at:", ts.address);
};

func.tags = ["DidRegistry"];
func.dependencies = [
  "AdministratorLib",
  "PolicyLib",
  "HashAlgoLib",
  "DidTimestampLib",
  "DidRecordLib",
  "Pagination",
];

export default func;
