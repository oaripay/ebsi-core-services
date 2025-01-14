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

  // get Proxy of TPR and didr - deployed new ones for undefined vars
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

  if (!("didV2Address" in deps)) {
    throw new Error("didV2Address does not exist");
  }

  let didAddress = deps.didV2Address;

  if (!ethers.isAddress(didAddress)) {
    console.log(`Deploying DIDr for testnet`);
    // deploy for testnet
    await deployments.run("DidRegistry");
    didAddress = (await deployments.get("DidRegistry")).address;
  }

  console.log(`Registry addresses did: ${didAddress}, tpr: ${tprAddress}`);

  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract: "contracts/bootstrap/utils/Pagination.sol/Pagination",
  });

  const ts = await deployments.deploy("Tir", {
    args: [tprAddress, didAddress],
    contract: "contracts/trusted-issuers-registry/tir/Tir.sol:Tir",
    from: deployer,
    libraries: {
      Pagination: pagination.address,
    },
    log: true,
  });

  deployments.log("Trusted Issuers Registry deployed at:", ts.address);
};

func.tags = ["Tir"];

export default func;
