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
  let tprAddress = dependencies[chainId]?.tprV2Address;
  if (!ethers.utils.isAddress(tprAddress)) {
    console.log(`Deploying TPR for testnet`);
    // deploy for testnet
    await deployments.run("PolicyRegistryV2");
    tprAddress = (await deployments.get("PolicyRegistryV2")).address;
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

  const controller = await deployments.deploy("ControllersLib", {
    ...optsPagination,
  });
  console.log(`Controller deployed;`);

  const optsv = {
    from: deployer,
    log: true,
    libraries: {
      Pagination: pagination.address,
    },
  };
  const vRelation = await deployments.deploy("VRelationshipsLib", {
    ...optsv,
    contract:
      "contracts/did-registry-v3/did-registry/VRelationshipsLib.sol/VRelationshipsLib",
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

  const ts = await deployments.deploy("DidRegistryV3", {
    from: deployer,
    contract:
      "contracts/did-registry-v3/did-registry/DidRegistry.sol:DidRegistry",
    args: [tprAddress],
    libraries: {
      ControllersLib: controller.address,
      DidDocumentLib: didDocument.address,
      VRelationshipsLib: vRelation.address,
      Pagination: pagination.address,
    },
  });

  deployments.log("Did Registry V3 deployed at:", ts.address);
};

func.tags = ["DidRegistryV3"];

export default func;
