import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
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
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`chain id ${chainId}`);
  let tprAddress = dependencies[chainId]?.tprAddress;
  let didAddress = dependencies[chainId]?.didAddress;
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
  const TarPolicyLib = await deployments.deploy("TarPolicyLib", {
    ...optsPagination,
    contract:
      "contracts/trusted-apps-registry/tar/TarPolicyLib.sol:TarPolicyLib",
  });

  const ts = await deployments.deploy("Tar", {
    from: deployer,
    args: [tprAddress, didAddress],
    libraries: {
      AppLib: appLib.address,
      AuthLib: authLib.address,
      TarPolicyLib: TarPolicyLib.address,
      RevocationLib: revocationLib.address,
    },
    log: true,
  });

  deployments.log("Trusted Apps Registry deployed at:", ts.address);
};
export default func;
func.tags = ["Tar"];
