import { task } from "hardhat/config";

import type { Timestamp } from "../src/types/contracts/timestamp-v3/timestamp";

import { Settings } from "../utils/settings";

task("timestampV3", "Deploy contract Track And Trace")
  .addParam("upgrader", "The upgrader address")
  .addParam("tpr", "The TrustedPolicyRegistry Proxy address")
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

      const settings = new Settings("timestamp-v3", network.name);

      const hashAlgoLibFactory = await ethers.getContractFactory(
        "contracts/timestamp-v3/timestamp/HashAlgoLib.sol:HashAlgoLib",
      );
      const stringManipFactory = await ethers.getContractFactory(
        "@ebsiint-sc/bootstrap-v2/contracts/utils/StringManip.sol:StringManip",
      );
      const stringManipContract = await stringManipFactory.deploy();
      const recordLibFactory = await ethers.getContractFactory(
        "contracts/timestamp-v3/timestamp/RecordLib.sol:RecordLib",
        { libraries: { StringManip: await stringManipContract.getAddress() } },
      );
      const timestampLibFactory = await ethers.getContractFactory(
        "contracts/timestamp-v3/timestamp/TimestampLib.sol:TimestampLib",
      );
      const hashAlgoLib = await hashAlgoLibFactory.deploy();
      const recordLib = await recordLibFactory.deploy();
      const timestampLib = await timestampLibFactory.deploy();

      const timestampFactory = await ethers.getContractFactory(
        "contracts/timestamp-v3/timestamp/Timestamp.sol:Timestamp",
        {
          libraries: {
            HashAlgoLib: await hashAlgoLib.getAddress(),
            RecordLib: await recordLib.getAddress(),
            TimestampLib: await timestampLib.getAddress(),
          },
        },
      );

      // deploy
      const timestamp = await upgrades.deployProxy(
        timestampFactory,
        [taskArgs.upgrader, taskArgs.tpr],
        { unsafeAllowLinkedLibraries: true },
      );

      settings.set("timestamp", await timestamp.getAddress());
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("tprAddress", taskArgs.tpr);

      console.log(
        `TrackAndTrace contract deployed to ${await timestamp.getAddress()}`,
      );
    },
  );

task("timestampV3Upgrade", "Upgrade Timestamp").setAction(
  async (_, { ethers, network, run, upgrades }) => {
    // compile
    await run("compile", { force: true });

    const settings = new Settings("timestamp-v3", network.name);
    const proxyAddress = settings.mustGet("timestamp");
    console.log(proxyAddress);

    const hashAlgoLibFactory = await ethers.getContractFactory(
      "contracts/timestamp-v3/timestamp/HashAlgoLib.sol:HashAlgoLib",
    );
    const stringManipFactory = await ethers.getContractFactory(
      "@ebsiint-sc/bootstrap-v2/contracts/utils/StringManip.sol:StringManip",
    );
    const stringManipContract = await stringManipFactory.deploy();
    const recordLibFactory = await ethers.getContractFactory(
      "contracts/timestamp-v3/timestamp/RecordLib.sol:RecordLib",
      { libraries: { StringManip: await stringManipContract.getAddress() } },
    );
    const timestampLibFactory = await ethers.getContractFactory(
      "contracts/timestamp-v3/timestamp/TimestampLib.sol:TimestampLib",
    );
    const hashAlgoLib = await hashAlgoLibFactory.deploy();
    const recordLib = await recordLibFactory.deploy();
    const timestampLib = await timestampLibFactory.deploy();

    const timestampFactory = await ethers.getContractFactory(
      "contracts/timestamp-v3/timestamp/Timestamp.sol:Timestamp",
      {
        libraries: {
          HashAlgoLib: await hashAlgoLib.getAddress(),
          RecordLib: await recordLib.getAddress(),
          TimestampLib: await timestampLib.getAddress(),
        },
      },
    );

    // forceImport
    await upgrades.forceImport(proxyAddress, timestampFactory);

    console.log(`factory loaded`);

    // deploy
    const timestamp = (await upgrades.upgradeProxy(
      proxyAddress,
      timestampFactory,
      { redeployImplementation: "always", unsafeAllowLinkedLibraries: true },
    )) as unknown as Timestamp;

    console.log(
      `TrackAndTrace contract upgraded to ${await timestamp.getImplementation()}`,
    );
  },
);
