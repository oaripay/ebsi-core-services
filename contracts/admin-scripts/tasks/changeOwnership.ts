import { BigNumber } from "ethers";
import "@nomiclabs/hardhat-waffle";
import { task, types } from "hardhat/config";

import { OwnedUpgradeabilityProxy } from "../src/types";

task("changeOwnership", "change proxy implementation")
  .addParam("proxy", "The proxy address")
  .addOptionalParam(
    "from",
    "from signer account to will execute the transaction it should be the Proxy current admin",
    0,
    types.int,
  )
  .addOptionalParam(
    "admin",
    "new admin address if not provided will default to ebsi admin multisig",
    "",
    types.string,
  )
  .setAction(
    async (
      taskArgs: { admin: string; from: number; proxy: string },
      { ethers },
    ) => {
      const proxyDeployedAddr = taskArgs.proxy;
      const accounts = await ethers.getSigners();
      const curAdmin = accounts[taskArgs.from];
      const multiSig = "0x28774ee74a79e27af87f4a7668542be43e2f742b";
      const newAdmin = taskArgs.admin.length > 0 ? taskArgs.admin : multiSig;

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

      console.log(
        `Current proxy admin address from SC: ${adminAddr} from script: ${curAdmin.address}`,
      );
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

      console.log(`will change Admin to: ${newAdmin}`);
      const receipt = await (
        await proxyCtr.connect(curAdmin).changeAdmin(newAdmin)
      ).wait(1);

      const newAdminAddr = BigNumber.from(
        await ethers.provider.getStorageAt(
          proxyCtr.address,
          IMPLEMENTATION_SLOT,
        ),
      ).toHexString();
      console.log(`NEW proxy admin address: ${newAdminAddr}`);

      console.log(
        "Change Ownership:",
        (receipt as { status: number }).status === 1 ? "ok" : "error",
      );
    },
  );
