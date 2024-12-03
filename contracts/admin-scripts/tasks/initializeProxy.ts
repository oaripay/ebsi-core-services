import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-waffle";
import { task } from "hardhat/config";

import { OwnedUpgradeabilityProxy } from "../src/types";
import { getDiamondStorage } from "../utils/getDiamondStorage";

task("initProxy", "init proxy with implementation")
  .addParam("proxy", "The proxy address")
  .addParam("implementation", "The implementation contract name")
  .addOptionalParam("scversion", "Version of the contract")
  .setAction(
    async (
      taskArgs: {
        implementation: string;
        proxy: string;
        scversion: string;
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
      let adminAddr = "0x0";
      try {
        console.log("ASD2");
        adminAddr = BigNumber.from(
          await ethers.provider.getStorageAt(
            proxyCtr.address,
            IMPLEMENTATION_SLOT,
          ),
        ).toHexString();
        console.log("ASD3");
        // eslint-disable-next-line no-empty
      } catch {}
      console.log(`Proxy admin address: ${adminAddr}`);
      // the implementation is in the next storage slot as it is part of the same struct
      let implementationAddr = "0x0";
      try {
        implementationAddr = BigNumber.from(
          await ethers.provider.getStorageAt(
            proxyCtr.address,
            BigNumber.from(IMPLEMENTATION_SLOT).add(1),
          ),
        ).toHexString();
        // eslint-disable-next-line no-empty
      } catch {}
      console.log(
        `Proxy current implementation address: ${implementationAddr}`,
      );
      let version = "0x0";
      try {
        version = BigNumber.from(
          await ethers.provider.getStorageAt(
            proxyCtr.address,
            TSC_DIAMOND_STORAGE_SLOT,
          ),
        ).toHexString();
        // eslint-disable-next-line no-empty
      } catch {}
      console.log(`current version : ${version}`);

      await deployments.run(taskArgs.implementation);
      const ts = await deployments.get(taskArgs.implementation);
      console.log(`${taskArgs.implementation} deployed at ${ts.address} `);

      const ifaceSetVersion = new ethers.utils.Interface([
        "function initialize(uint256 version)",
      ]);
      const setVersionData = ifaceSetVersion.encodeFunctionData("initialize", [
        BigNumber.from(1),
      ]);
      const accounts = await ethers.getSigners();

      console.log(`will init and set version with data: ${setVersionData}`);
      const receipt = await (
        await proxyCtr["initialize(address,address,bytes)"](
          ts.address,
          accounts[0].address,
          setVersionData,
        )
      ).wait(1);
      console.log(receipt);

      const newImplementationAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          BigNumber.from(IMPLEMENTATION_SLOT).add(1),
        ),
      ).toHexString();
      console.log(`Proxy implementation address: ${newImplementationAddr}`);

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
