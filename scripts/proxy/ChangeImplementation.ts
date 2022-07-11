import { ethers, deployments } from "hardhat";
import { BigNumber } from "ethers";
import { LedgerSCRegistry, OwnedUpgradeabilityProxy } from "../../src/types";

async function main() {
  const proxyDeployedAddr = `0x7FC3C7805095a6863243bFc73Da563A1E1CA2763`;

  const TSC_DIAMOND_STORAGE_SLOT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      "diamond.standard.trusted.ledger.smart.contracts.storage"
    )
  );
  const IMPLEMENTATION_SLOT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("diamond.standard.diamond.storage.proxy")
  );

  const [deployer, user] = await ethers.getSigners();
  console.log("deployer:", deployer.address, "user:", user.address);

  const proxyCtr: OwnedUpgradeabilityProxy = (await ethers.getContractAt(
    `OwnedUpgradeabilityProxy`,
    proxyDeployedAddr
  )) as OwnedUpgradeabilityProxy;

  // these infos are not easily accessible as they are restricted by an onlyAdmin modifier
  // to retrieve them we use the low level getStorage call
  const adminAddr = BigNumber.from(
    await ethers.provider.getStorageAt(proxyCtr.address, IMPLEMENTATION_SLOT)
  ).toHexString();
  console.log(`Proxy admin address: ${adminAddr}`);
  // the implementation is in the next storage slot as it is part of the same struct
  const implementationAddr = BigNumber.from(
    await ethers.provider.getStorageAt(
      proxyCtr.address,
      BigNumber.from(IMPLEMENTATION_SLOT).add(1)
    )
  ).toHexString();
  console.log(`Proxy implementation address: ${implementationAddr}`);

  const version = BigNumber.from(
    await ethers.provider.getStorageAt(
      proxyCtr.address,
      TSC_DIAMOND_STORAGE_SLOT
    )
  ).toHexString();
  console.log(`version : ${version}`);

  const ts = await deployments.get("LedgerSCRegistry");
  console.log(`Trusted Registry: ${ts.address} `);

  const tsfactory = await ethers.getContractFactory("LedgerSCRegistry");
  const trustedRegistryThroughProxy: LedgerSCRegistry = tsfactory.attach(
    proxyCtr.address
  ) as LedgerSCRegistry;

  const initializeData =
    trustedRegistryThroughProxy.interface.encodeFunctionData("setVersion", [
      BigNumber.from(version).add(1),
    ]);

  console.log("Initializing with:", initializeData);
  const receipt = await (
    await proxyCtr.upgradeToAndCall(ts.address, initializeData)
  ).wait(1);

  const newImplementationAddr = BigNumber.from(
    await ethers.provider.getStorageAt(
      proxyCtr.address,
      BigNumber.from(IMPLEMENTATION_SLOT).add(1)
    )
  ).toHexString();
  console.log(`Proxy new implementation address: ${newImplementationAddr}`);

  const newVersion = BigNumber.from(
    await ethers.provider.getStorageAt(
      proxyCtr.address,
      TSC_DIAMOND_STORAGE_SLOT
    )
  ).toHexString();
  console.log(`new version : ${newVersion}`);
  console.log("Initialization:", receipt.status === 1 ? "ok" : "error");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
