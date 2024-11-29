import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import dependencies from "./dependencies.json";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const opts = {
    from: deployer,
    log: true,
  };

  // get Proxy of TPR and didr - deployed new ones for undefined vars
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`chain id ${chainId}`);
  let tprAddress = dependencies[chainId]?.tprV1Address;
  let didAddress = dependencies[chainId]?.didV2Address;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  }

  if (!ethers.utils.isAddress(didAddress)) {
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
    from: deployer,
    args: [tprAddress, didAddress],
    contract: "contracts/trusted-issuers-registry/tir/Tir.sol:Tir",
    libraries: {
      Pagination: pagination.address,
    },
    log: true,
  });

  deployments.log("Trusted Issuers Registry deployed at:", ts.address);
};

func.tags = ["Tir"];

export default func;
