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

  // get Proxy of TPR and didr - deployed new ones for undefined vars
  const chainId = `${(await ethers.provider.getNetwork()).chainId}`;

  validateChainId(chainId);

  console.log(`chain id ${chainId}`);

  const deps = dependencies[chainId];

  if (!("tprV2Address" in deps)) {
    throw new Error("tprV2Address does not exist");
  }

  let tprAddress = deps.tprV2Address;

  if (!ethers.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistryV2");
    tprAddress = (await deployments.get("PolicyRegistryV2")).address;
  }

  if (!("didV3Address" in deps)) {
    throw new Error("didV3Address does not exist");
  }

  let didAddress = deps.didV3Address;

  if (!ethers.isAddress(didAddress)) {
    console.log(`Deploying DIDr for testnet`);
    // deploy for testnet
    await deployments.run("DidRegistryV3");
    didAddress = (await deployments.get("DidRegistryV3")).address;
  }

  console.log(`Registry addresses did: ${didAddress}, tpr: ${tprAddress}`);

  const ts = await deployments.deploy("TirV3", {
    args: [tprAddress, didAddress],
    contract: "contracts/trusted-issuers-registry-v3/tir/Tir.sol:Tir",
    from: deployer,
    log: true,
  });

  deployments.log("Trusted Issuers Registry v3 deployed at:", ts.address);
};

func.tags = ["TirV3"];

export default func;
