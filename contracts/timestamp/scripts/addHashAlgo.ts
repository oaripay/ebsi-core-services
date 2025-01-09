// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

import type { Timestamp } from "../src/types";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const proxyAddress = "0x37F2364856fCB8a4B2F70dB231D5791Ab6432248";
  const [deployer, admin] = await ethers.getSigners();
  const contractFactory = await ethers.getContractFactory("Timestamp", {
    libraries: {
      HashAlgoLib: "0x1e604CF94A6D9907CfceB0F61a753Dd7db98e702",
      RecordLib: "0xE65d87135cA2e45C705581CcACDe55CFD1A78AD4",
      TimestampLib: "0x0654fC6108A0C8C9aEB2E134414F161BBE8e1854",
    },
    signer: admin,
  });
  const ts = contractFactory.attach(proxyAddress) as Timestamp;

  console.log(
    `deployer:${deployer.address}
     admin:${admin.address}
     version:${(await ts.version()).toString()}`,
  );
  const initialVersion = await ts.version();
  console.log(initialVersion);
  console.log("initialVersion:", initialVersion.toString());

  // add hashAlgo
  await ts.insertHashAlgorithm(
    256,
    "sha-256",
    "2.16.840.1.101.3.4.2.1",
    1,
    "sha2-256",
  );
  await ts.insertHashAlgorithm(
    512,
    "sha-512",
    "2.16.840.1.101.3.4.2.3",
    1,
    "sha2-512",
  );
  await ts.insertHashAlgorithm(
    256,
    "sha3-256",
    "2.16.840.1.101.3.4.2.8",
    1,
    "sha3-256",
  );
  const algo = await ts.getHashAlgorithmById(1);
  console.log(
    `algorithm ${algo.ianaName} oid:${algo.oid} length:${algo.outputLength.toString()} status:${algo.status}`,
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
