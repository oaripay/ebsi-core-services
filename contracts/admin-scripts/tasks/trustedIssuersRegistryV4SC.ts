import { task } from "hardhat/config";
import { Settings } from "../utils/settings";

task("trustedIssuersRegistryV4", "Deploy contract Track And Trace")
  .addParam("upgrader", "The upgrader address")
  .addParam("tpr", "The address of trusted policy registry")
  .addParam("did", "The address of trusted did registry")
  .setAction(
    async (
      taskArgs: {
        upgrader: string;
        tpr: string;
        did: string;
      },
      { ethers, upgrades, run },
    ) => {
      // compile
      await run("compile", { quiet: true });

      const settings = new Settings("trusted-issuers-registry-v4");

      const tirV4Factory = await ethers.getContractFactory(
        "contracts/trusted-issuers-registry-v4/tir/TrustedIssuersRegistry.sol:TrustedIssuersRegistry",
      );

      // deploy
      const tirV4 = await upgrades.deployProxy(tirV4Factory, [
        taskArgs.upgrader,
        taskArgs.tpr,
        taskArgs.did,
      ]);

      settings.set("trustedIssuersRegistryV4Address", tirV4.address);
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("trustedPolicyRegistryAddress", taskArgs.tpr);
      settings.set("didRegistryAddress", taskArgs.did);

      console.log(
        `TrustedSchemasRegistryV3 contract deployed to ${tirV4.address}`,
      );
    },
  );
