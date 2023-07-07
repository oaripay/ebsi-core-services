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
  let tprAddress = dependencies[chainId]?.tprV1Address;
  let didV1Address = dependencies[chainId]?.didV1Address;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistry");
    tprAddress = (await deployments.get("PolicyRegistry")).address;
  }
  console.log(`Trusted Policy Registry Address is ${tprAddress}`);

  if (!ethers.utils.isAddress(didV1Address)) {
    console.log(`Deploying DidRegistry for testnet`);
    // deploy for testnet
    await deployments.run("DidRegistry");
    didV1Address = (await deployments.get("DidRegistry")).address;
  }
  console.log(`DidRegistry Address is ${didV1Address}`);

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

  const controller = await deployments.deploy("ControllersLib", {
    ...optsPagination,
  });
  console.log(`Controller deployed;`);

  const customPagination = await deployments.deploy("CustomPagination", {
    ...optsPagination,
  });

  console.log(`Custom Pagination deployed;`);
  const optsv = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
      CustomPagination: customPagination.address,
    },
  };
  const vRelation = await deployments.deploy("VRelationshipsLib", {
    ...optsv,
    contract:
      "contracts/did-registry-v2/did-registry/VRelationshipsLib.sol/VRelationshipsLib",
  });
  console.log(`VRelationships lib deployed`);
  const optsPagVrel = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
      VRelationshipsLib: vRelation.address,
    },
  };
  const didDocument = await deployments.deploy("DidDocumentLib", {
    ...optsPagVrel,
  });

  console.log(`Did Document deployed;`);

  const ts = await deployments.deploy("DidRegistryV2", {
    from: deployer,
    contract:
      "contracts/did-registry-v2/did-registry/DidRegistry.sol:DidRegistry",
    args: [tprAddress, didV1Address],
    libraries: {
      ControllersLib: controller.address,
      CustomPagination: customPagination.address,
      DidDocumentLib: didDocument.address,
      VRelationshipsLib: vRelation.address,
      Pagination: pagination.address,
    },
  });

  deployments.log("Did Registry V2 deployed at:", ts.address);
};

func.tags = ["DidRegistryV2"];

export default func;
