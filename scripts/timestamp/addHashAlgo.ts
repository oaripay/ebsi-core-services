// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, deployments } from "hardhat";
import { OwnedUpgradeabilityProxy } from "src/types/OwnedUpgradeabilityProxy";
import { Timestamp } from "src/types/Timestamp";

async function main() {
  // This can run only after Timestamp have been deployed with a proxy
  const [deployer, admin] = await ethers.getSigners();
  // We get contracts already deployed
  const dProxy = await deployments.get("OwnedUpgradeabilityProxy");

  const proxyfactory = await ethers.getContractFactory(
    "OwnedUpgradeabilityProxy"
  );

  const proxy: OwnedUpgradeabilityProxy = proxyfactory.attach(
    dProxy.address
  ) as OwnedUpgradeabilityProxy;

  const dTs = await deployments.get("Timestamp");
  const tsfactory = await ethers.getContractFactory("Timestamp", {
    libraries: dTs.libraries,
    signer: admin,
  });
  const ts: Timestamp = tsfactory.attach(proxy.address) as Timestamp;

  console.log(
    `
    Proxy:${proxy.address}
    Timestamp:${ts.address}
    deployer:${deployer.address}
    admin:${admin.address} `
  );
  const initialVersion = await ts.version();
  console.log("Verification initialVersion:", initialVersion.toString());

  // add hashAlgo
  let res = await (await ts.insertHashAlgorithm(256, "SHA256", "oid", 1)).wait(
    1
  );

  console.log(res.transactionHash, res.status === 1 ? "ok" : "error");

  res = await (await ts.insertHashAlgorithm(512, "SHA512", "oid2", 1)).wait(1);
  console.log(res.transactionHash, res.status === 1 ? "ok" : "error");
  res = await (await ts.insertHashAlgorithm(256, "SHA3-256", "oid3", 1)).wait(
    1
  );
  console.log(res.transactionHash, res.status === 1 ? "ok" : "error");
  const halgo = await ts.getHashAlgorithmById(1);
  console.log(
    `halgorithm n°1 ${halgo.ianaName} oid:${
      halgo.oid
    } length:${halgo.outputLength.toString()} status:${halgo.status}`
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
