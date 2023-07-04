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

  // get Proxy of TPR
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`chain id ${chainId}`);
  let tprAddress = dependencies[chainId]?.tprAddress;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  }
  console.log(`Trusted Policy Registry Address is ${tprAddress}`);

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
  const didTimestampLib = await deployments.deploy("DidTimestampLib", {
    ...optsPagination,
    contract:
      "contracts/did-registry/did-registry/DidTimestampLib.sol:DidTimestampLib",
  });
  const didRecordLib = await deployments.deploy("DidRecordLib", {
    from: deployer,
    log: true,
    contract:
      "contracts/did-registry/did-registry/DidRecordLib.sol/DidRecordLib",
    libraries: {
      Pagination: pagination.address,
      DidTimestampLib: didTimestampLib.address,
    },
  });

  // const didControllersLib = await deployments.deploy("ControllersLib", {
  //   ...opts,
  //   libraries: {
  //     Pagination: pagination.address,
  //   },
  // });
  // const didDocumentLib = await deployments.deploy("DidDocumentLib", {
  //   ...opts,
  //   libraries: {
  //     Pagination: pagination.address,
  //   },
  // });

  const hashAlgoLib = await deployments.deploy("HashAlgoLib", {
    ...optsPagination,
    contract: "contracts/did-registry/did-registry/HashAlgoLib.sol:HashAlgoLib",
  });

  const ts = await deployments.deploy("DidRegistry", {
    from: deployer,
    contract: "contracts/did-registry/did-registry/DidRegistry.sol:DidRegistry",
    args: [tprAddress],
    libraries: {
      DidRecordLib: didRecordLib.address,
      HashAlgoLib: hashAlgoLib.address,
      DidTimestampLib: didTimestampLib.address,
      Pagination: pagination.address,
      // ControllersLib: didControllersLib.address,
      // DidDocumentLib: didDocumentLib.address,
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
