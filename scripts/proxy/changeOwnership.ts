// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, deployments } from "hardhat";
import { OwnedUpgradeabilityProxy } from "src/types/OwnedUpgradeabilityProxy";

async function main() {
  // This can run only after Timestamp have been deployed with a proxy
  const [multiSig] = await ethers.getSigners();
  // We get contracts already deployed
  const dProxy = await deployments.get("OwnedUpgradeabilityProxy");
  console.log(`dProxy ${dProxy.address} `);
  const proxyfactory = await ethers.getContractFactory(
    "OwnedUpgradeabilityProxy"
  );

  const proxy: OwnedUpgradeabilityProxy = proxyfactory.attach(
    dProxy.address
  ) as OwnedUpgradeabilityProxy;

  const res = await (await proxy.changeAdmin(multiSig.address)).wait(1);
  console.log(
    `
    Proxy:${proxy.address}
    New admin:${multiSig.address}
    TransactionHash:${res.transactionHash}
    Status:${res.status === 1 ? "ok" : "error"}
    `
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
