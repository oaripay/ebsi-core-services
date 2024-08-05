import { task } from "hardhat/config";
import { Settings } from "../utils/settings";

task("timestampV3", "Deploy contract Track And Trace")
  .addParam("upgrader", "The upgrader address")
  .addParam("tpr", "The TrustedPolicyRegistry Proxy address")
  .setAction(
    async (
      taskArgs: {
        upgrader: string;
        tpr: string;
      },
      { ethers, upgrades, run },
    ) => {
      // compile
      await run("compile", { quiet: true });

      const settings = new Settings("timestamp-v3");

      const hashAlgoLibFactory = await ethers.getContractFactory(
        "contracts/timestamp-v3/timestamp/HashAlgoLib.sol:HashAlgoLib",
      );
      const stringManipFactory = await ethers.getContractFactory(
        "@ebsiint-sc/bootstrap-v2/contracts/utils/StringManip.sol:StringManip",
      );
      const stringManipContract = await stringManipFactory.deploy();
      const recordLibFactory = await ethers.getContractFactory(
        "contracts/timestamp-v3/timestamp/RecordLib.sol:RecordLib",
        { libraries: { StringManip: stringManipContract.address } },
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
            HashAlgoLib: hashAlgoLib.address,
            RecordLib: recordLib.address,
            TimestampLib: timestampLib.address,
          },
        },
      );

      // deploy
      const timestamp = await upgrades.deployProxy(
        timestampFactory,
        [taskArgs.upgrader, taskArgs.tpr],
        { unsafeAllowLinkedLibraries: true },
      );

      settings.set("timestamp", timestamp.address);
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("tprAddress", taskArgs.tpr);

      console.log(`TrackAndTrace contract deployed to ${timestamp.address}`);
    },
  );

task("timestampV3Upgrade", "Upgrade Timestamp").setAction(
  async (taskArgs: NonNullable<unknown>, { ethers, upgrades, run }) => {
    // compile
    await run("compile", { force: true });

    const settings = new Settings("timestamp-v3");
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
      { libraries: { StringManip: stringManipContract.address } },
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
          HashAlgoLib: hashAlgoLib.address,
          RecordLib: recordLib.address,
          TimestampLib: timestampLib.address,
        },
      },
    );

    // forceImport
    await upgrades.forceImport(proxyAddress, timestampFactory);

    console.log(`factory loaded`);

    // deploy
    const timestamp = await upgrades.upgradeProxy(
      proxyAddress,
      timestampFactory,
      { unsafeAllowLinkedLibraries: true, redeployImplementation: "always" },
    );

    console.log(
      `TrackAndTrace contract upgraded to ${await timestamp.getImplementation()}`,
    );
  },
);
