import fs from "node:fs";
import path from "path";
import { ethers } from "hardhat";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { DidRegistry } from "../src/types";

async function main() {
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
  );
  const policyRegistryFactory = await ethers.getContractFactoryFromArtifact(
    artifact,
    {},
  );
  const policyContract =
    (await policyRegistryFactory.deploy()) as PolicyRegistry;
  await policyContract.deployed();

  console.log("Policy deployed at:", policyContract.address);

  await policyContract.initialize(ethers.BigNumber.from(1));

  const vRelationshipsFactory =
    await ethers.getContractFactory("VRelationshipsLib");
  const vRelationshipsLib = await vRelationshipsFactory.deploy();

  const didDocumentFactory = await ethers.getContractFactory("DidDocumentLib", {
    libraries: {
      VRelationshipsLib: vRelationshipsLib.address,
    },
  });
  const didDocumentLib = await didDocumentFactory.deploy();

  const controllersFactory = await ethers.getContractFactory(
    "ControllersLib",
    {},
  );
  const controllersLib = await controllersFactory.deploy();

  const contractFactory = await ethers.getContractFactory("DidRegistry", {
    libraries: {
      DidDocumentLib: didDocumentLib.address,
      ControllersLib: controllersLib.address,
    },
  });
  const ts = (await contractFactory.deploy()) as DidRegistry;
  await ts.initialize(16);

  console.log("DID Registry deployed at:", ts.address);
  console.log(`Contract version set to: ${await ts.version()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
