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

  // get Proxy of TPR
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
  console.log(`Trusted Policy Registry Address is ${tprAddress}`);

  const optsPagination = {
    from: deployer,
    log: true,
  };

  const controller = await deployments.deploy("ControllersLib", {
    ...optsPagination,
    contract:
      "contracts/did-registry-v3/did-registry/ControllersLib.sol:ControllersLib",
  });
  console.log(`Controller deployed;`);

  const optsv = {
    from: deployer,
    log: true,
  };
  const vRelation = await deployments.deploy("VRelationshipsLib", {
    ...optsv,
    contract:
      "contracts/did-registry-v3/did-registry/VRelationshipsLib.sol/VRelationshipsLib",
  });
  console.log(`VRelationships lib deployed`);
  const optsPagVrel = {
    from: deployer,
    libraries: {
      VRelationshipsLib: vRelation.address,
    },
    log: true,
  };
  const didDocument = await deployments.deploy("DidDocumentLib", {
    ...optsPagVrel,
    contract:
      "contracts/did-registry-v3/did-registry/DidDocumentLib.sol:DidDocumentLib",
  });

  console.log(`Did Document deployed;`);

  const ts = await deployments.deploy("DidRegistryV3", {
    args: [tprAddress],
    contract:
      "contracts/did-registry-v3/did-registry/DidRegistry.sol:DidRegistry",
    from: deployer,
    libraries: {
      ControllersLib: controller.address,
      DidDocumentLib: didDocument.address,
      VRelationshipsLib: vRelation.address,
    },
  });

  deployments.log("Did Registry V3 deployed at:", ts.address);
};

func.tags = ["DidRegistryV3"];

export default func;
