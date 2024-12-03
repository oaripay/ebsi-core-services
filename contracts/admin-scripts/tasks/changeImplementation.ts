import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-waffle";
import { task } from "hardhat/config";

import { OwnedUpgradeabilityProxy } from "../src/types";
import { getDiamondStorage } from "../utils/getDiamondStorage";

task("changeImplementation", "change proxy implementation")
  .addParam("proxy", "The proxy address")
  .addParam("implementation", "The implementation contract name")
  .setAction(
    async (
      taskArgs: {
        implementation: string;
        proxy: string;
      },
      { deployments, ethers },
    ) => {
      const proxyDeployedAddr = taskArgs.proxy;
      const storage = getDiamondStorage(taskArgs.implementation);
      const TSC_DIAMOND_STORAGE_SLOT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(storage),
      );

      const IMPLEMENTATION_SLOT = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("diamond.standard.diamond.storage.proxy"),
      );

      const proxyCtr = (await ethers.getContractAt(
        `OwnedUpgradeabilityProxy`,
        proxyDeployedAddr,
      )) as OwnedUpgradeabilityProxy;

      // these infos are not easily accessible as they are restricted by an onlyAdmin modifier
      // to retrieve them we use the low level getStorage call
      const adminAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          IMPLEMENTATION_SLOT,
        ),
      ).toHexString();
      console.log(`Proxy admin address: ${adminAddr}`);
      const [signers] = await ethers.getSigners();
      console.log(`Deployer address: ${signers.address}`);
      if (signers.address.toLowerCase() !== adminAddr.toLowerCase()) {
        console.log(`Transaction will fail because not the correct admin`);
        process.exit(0);
      }
      // the implementation is in the next storage slot as it is part of the same struct
      const implementationAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          BigNumber.from(IMPLEMENTATION_SLOT).add(1),
        ),
      ).toHexString();
      console.log(
        `Proxy current implementation address: ${implementationAddr}`,
      );

      const version = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          TSC_DIAMOND_STORAGE_SLOT,
        ),
      ).toHexString();
      console.log(`current version : ${version}`);

      await deployments.run(taskArgs.implementation, {
        writeDeploymentsToFiles: true,
      });
      const ts = await deployments.get(taskArgs.implementation);
      console.log(`${taskArgs.implementation} deployed at ${ts.address} `);
      console.log(`will upgrade to: ${ts.address}`);
      const receipt = await (await proxyCtr.upgradeTo(ts.address)).wait(1);

      const newImplementationAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          BigNumber.from(IMPLEMENTATION_SLOT).add(1),
        ),
      ).toHexString();
      console.log(`Proxy new implementation address: ${newImplementationAddr}`);

      const newVersion = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          TSC_DIAMOND_STORAGE_SLOT,
        ),
      ).toHexString();
      console.log(`new version : ${newVersion}`);
      console.log(
        "Initialization:",
        (receipt as { status: number }).status === 1 ? "ok" : "error",
      );
    },
  );
