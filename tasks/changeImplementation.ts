import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { BigNumber } from "ethers";
import { OwnedUpgradeabilityProxy } from "../src/types/OwnedUpgradeabilityProxy";

task("changeImplementation", "change proxy implementation")
  .addParam("proxy", "The proxy address")
  .addParam("implementation", "The implementation contract name")
  .addOptionalParam(
    "storage",
    "The storage slot string for the smart contract. required if increment is true"
  )
  .addOptionalParam(
    "increment",
    "Call the set version on the implementation to increase the version",
    false,
    types.boolean
  )
  .setAction(
    async (
      taskArgs: {
        proxy: string;
        implementation: string;
        storage?: string;
        increment?: boolean;
      },
      { ethers, deployments }
    ) => {
      const proxyDeployedAddr = taskArgs.proxy;
      // i.e "diamond.standard.trusted.ledger.smart.contracts.storage"
      const TSC_DIAMOND_STORAGE_SLOT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(taskArgs.storage)
      );

      const IMPLEMENTATION_SLOT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("diamond.standard.diamond.storage.proxy")
      );

      const proxyCtr: OwnedUpgradeabilityProxy = (await ethers.getContractAt(
        `OwnedUpgradeabilityProxy`,
        proxyDeployedAddr
      )) as OwnedUpgradeabilityProxy;

      // these infos are not easily accessible as they are restricted by an onlyAdmin modifier
      // to retrieve them we use the low level getStorage call
      const adminAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          IMPLEMENTATION_SLOT
        )
      ).toHexString();
      console.log(`Proxy admin address: ${adminAddr}`);
      // the implementation is in the next storage slot as it is part of the same struct
      const implementationAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          BigNumber.from(IMPLEMENTATION_SLOT).add(1)
        )
      ).toHexString();
      console.log(
        `Proxy current implementation address: ${implementationAddr}`
      );

      const version = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          TSC_DIAMOND_STORAGE_SLOT
        )
      ).toHexString();
      console.log(`current version : ${version}`);

      await deployments.run(taskArgs.implementation);
      const ts = await deployments.get(taskArgs.implementation);
      console.log(`${taskArgs.implementation} deployed at ${ts.address} `);
      let receipt;
      if (taskArgs.increment) {
        const iface = new ethers.utils.Interface([
          "function setVersion(uint version)",
        ]);
        const initializeData = iface.encodeFunctionData("setVersion", [
          BigNumber.from(version).add(1),
        ]);
        console.log(
          `will upgrade and increment version with data: ${initializeData}`
        );
        receipt = await (
          await proxyCtr["upgradeToAndCall(address,bytes)"](
            ts.address,
            initializeData
          )
        ).wait(1);
      } else {
        console.log(`will upgrade to: ${ts.address}`);
        receipt = await (await proxyCtr["upgradeTo(address)"](ts.address)).wait(
          1
        );
      }

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
      console.log(
        "Initialization:",
        (receipt as { status: number }).status === 1 ? "ok" : "error"
      );
    }
  );
