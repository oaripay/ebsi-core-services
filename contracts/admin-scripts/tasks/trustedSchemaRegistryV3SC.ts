import { task } from "hardhat/config";

import { Settings } from "../utils/settings";

task("trustedSchemaRegistryV3", "Deploy contract Track And Trace")
  .addParam("upgrader", "The upgrader address")
  .addParam("tpr", "The address of trusted policy registry")
  .setAction(
    async (
      taskArgs: {
        tpr: string;
        upgrader: string;
      },
      { ethers, network, run, upgrades },
    ) => {
      // compile
      await run("compile", { quiet: true });

      const settings = new Settings("trusted-schema-registry-v3", network.name);

      const tsrV3Factory = await ethers.getContractFactory(
        "contracts/trusted-schemas-registry-v3/trusted-schemas-registry/TrustedSchemasRegistry.sol:TrustedSchemasRegistry",
      );

      // deploy
      const tsrV3 = await upgrades.deployProxy(tsrV3Factory, [
        taskArgs.upgrader,
        taskArgs.tpr,
      ]);

      settings.set("trustedSchemaRegistryV3Proxy", await tsrV3.getAddress());
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("trustedPolicyRegistry", taskArgs.tpr);

      console.log(
        `TrustedSchemasRegistryV3 contract deployed to ${await tsrV3.getAddress()}`,
      );
    },
  );
