import { ethers } from "hardhat";
import type { HardhatRuntimeEnvironment } from "hardhat/types/index.js";

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

  if (!("didV1Address" in deps)) {
    throw new Error("tprV1Address does not exist");
  }

  let didV1Address = deps.didV1Address;

  if (!ethers.isAddress(didV1Address)) {
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
    libraries: {
      Pagination: pagination.address,
    },
    log: true,
  };

  const controller = await deployments.deploy("ControllersLib", {
    contract:
      "contracts/did-registry-v2/did-registry/ControllersLib.sol:ControllersLib",
    ...optsPagination,
  });
  console.log(`Controller deployed;`);

  const customPagination = await deployments.deploy("CustomPagination", {
    contract:
      "contracts/did-registry-v2/did-registry/CustomPagination.sol:CustomPagination",
    ...optsPagination,
  });

  console.log(`Custom Pagination deployed;`);
  const optsv = {
    from: deployer,
    libraries: {
      CustomPagination: customPagination.address,
      Pagination: pagination.address,
    },
    log: true,
  };
  const vRelation = await deployments.deploy("VRelationshipsLib", {
    ...optsv,
    contract:
      "contracts/did-registry-v2/did-registry/VRelationshipsLib.sol/VRelationshipsLib",
  });
  console.log(`VRelationships lib deployed`);
  const optsPagVrel = {
    from: deployer,
    libraries: {
      Pagination: pagination.address,
      VRelationshipsLib: vRelation.address,
    },
    log: true,
  };
  const didDocument = await deployments.deploy("DidDocumentLib", {
    contract:
      "contracts/did-registry-v2/did-registry/DidDocumentLib.sol:DidDocumentLib",
    ...optsPagVrel,
  });

  console.log(`Did Document deployed;`);

  const ts = await deployments.deploy("DidRegistryV2", {
    args: [tprAddress, didV1Address],
    contract:
      "contracts/did-registry-v2/did-registry/DidRegistry.sol:DidRegistry",
    from: deployer,
    libraries: {
      ControllersLib: controller.address,
      CustomPagination: customPagination.address,
      DidDocumentLib: didDocument.address,
      Pagination: pagination.address,
      VRelationshipsLib: vRelation.address,
    },
  });

  deployments.log("Did Registry V2 deployed at:", ts.address);
};

func.tags = ["DidRegistryV2"];

export default func;
