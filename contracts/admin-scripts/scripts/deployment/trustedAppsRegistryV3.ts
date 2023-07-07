import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { dependencies } from "./dependencies";

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

  const pagination = await deployments.deploy("Pagination", {
    ...opts,
    contract: "contracts/bootstrap-v2/utils/Pagination.sol/Pagination",
  });
  const optsPagination = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
    },
  };

  const appLib = await deployments.deploy("AppLib", optsPagination);
  const authLib = await deployments.deploy("AuthLib", opts);
  const revocationLib = await deployments.deploy("RevocationLib", opts);

  const ts = await deployments.deploy("TarV3", {
    from: deployer,
    args: [tprAddress, didAddress],
    contract: "contracts/trusted-apps-registry-v3/tar/Tar.sol:Tar",
    libraries: {
      AppLib: appLib.address,
      AuthLib: authLib.address,
      RevocationLib: revocationLib.address,
    },
    log: true,
  });

  deployments.log("Trusted Apps Registry v3 deployed at:", ts.address);
};

func.tags = ["TarV3"];

export default func;
