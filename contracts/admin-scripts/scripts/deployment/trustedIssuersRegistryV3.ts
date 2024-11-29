import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import dependencies from "./dependencies.json";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();

  // get Proxy of TPR and didr - deployed new ones for undefined vars
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`chain id ${chainId}`);
  let tprAddress = dependencies[chainId]?.tprV2Address;
  let didAddress = dependencies[chainId]?.didV3Address;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistryV2");
    tprAddress = (await deployments.get("PolicyRegistryV2")).address;
  }

  if (!ethers.utils.isAddress(didAddress)) {
    console.log(`Deploying DIDr for testnet`);
    // deploy for testnet
    await deployments.run("DidRegistryV3");
    didAddress = (await deployments.get("DidRegistryV3")).address;
  }

  console.log(`Registry addresses did: ${didAddress}, tpr: ${tprAddress}`);

  const ts = await deployments.deploy("TirV3", {
    from: deployer,
    args: [tprAddress, didAddress],
    contract: "contracts/trusted-issuers-registry-v3/tir/Tir.sol:Tir",
    log: true,
  });

  deployments.log("Trusted Issuers Registry v3 deployed at:", ts.address);
};

func.tags = ["TirV3"];

export default func;
