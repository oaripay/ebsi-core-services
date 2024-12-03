import type { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry";
import type { Artifact } from "hardhat/types";

import { ethers } from "hardhat";
import fs from "node:fs";
import path from "node:path";

const didRegistryV1Address = "0x0000000000000000000000000000000000000000";

async function main() {
  const paginationFactory = await ethers.getContractFactory("Pagination", {});
  const pagination = await paginationFactory.deploy();

  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        "../../",
        "trusted-policies-registry/artifacts",
        "contracts/trusted-policies-registry/PolicyRegistry.sol",
        "PolicyRegistry.json",
      ),
      { encoding: "utf8" },
    ),
  ) as unknown as Artifact;
  const policyRegistryFactory = (await ethers.getContractFactoryFromArtifact(
    artifact,
    {
      libraries: {
        Pagination: pagination.address,
      },
    },
  )) as PolicyRegistry__factory;
  const policyContract = await policyRegistryFactory.deploy();
  await policyContract.deployed();

  console.log("Policy deployed at :", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  const vRelationshipsFactory =
    await ethers.getContractFactory("VRelationshipsLib");
  const vRelationshipsLib = await vRelationshipsFactory.deploy();

  const didDocumentFactory = await ethers.getContractFactory("DidDocumentLib", {
    libraries: {
      Pagination: pagination.address,
      VRelationshipsLib: vRelationshipsLib.address,
    },
  });
  const didDocumentLib = await didDocumentFactory.deploy();

  const controllersFactory = await ethers.getContractFactory("ControllersLib", {
    libraries: {
      Pagination: pagination.address,
    },
  });
  const controllersLib = await controllersFactory.deploy();

  const contractFactory = await ethers.getContractFactory("DidRegistry", {
    libraries: {
      ControllersLib: controllersLib.address,
      DidDocumentLib: didDocumentLib.address,
      VRelationshipsLib: vRelationshipsLib.address,
    },
  });
  const ts = await contractFactory.deploy(
    policyContract.address,
    didRegistryV1Address,
  );
  await ts.initialize(16);
  await ts.setRegistryAddresses();

  console.log("DID Registry deployed at :", ts.address);
  console.log(`Contract version set to: ${(await ts.version()).toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
