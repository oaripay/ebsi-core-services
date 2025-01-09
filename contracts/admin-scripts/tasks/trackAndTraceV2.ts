import { task } from "hardhat/config";

import { Settings } from "../utils/settings";

task("trackAndTraceV2", "Deploy contract Track And Trace")
  .addParam("admin", "The admin address")
  .addParam("upgrader", "The upgrader address")
  .addParam("tpr", "The TrustedPolicyRegistry Proxy address")
  .addParam("registry", "The address of didRegistry")
  .setAction(
    async (
      taskArgs: {
        admin: string;
        registry: string;
        tpr: string;
        upgrader: string;
      },
      { ethers, network, run, upgrades },
    ) => {
      // compile
      await run("compile", { quiet: true });

      const settings = new Settings("track-and-trace-v2", network.name);

      // get contract
      const trackAndTraceLibFactory = await ethers.getContractFactory(
        "contracts/track-and-trace-v2/libraries/TrackAndTraceLib.sol:TrackAndTraceLib",
        {},
      );
      const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

      const trackAndTraceFactory = await ethers.getContractFactory(
        "contracts/track-and-trace-v2/TrackAndTrace.sol:TrackAndTrace",
        {
          libraries: {
            TrackAndTraceLib: await trackAndTraceLibContract.getAddress(),
          },
        },
      );

      // deploy
      const trackAndTrace = await upgrades.deployProxy(
        trackAndTraceFactory,
        [taskArgs.admin, taskArgs.upgrader, taskArgs.tpr, taskArgs.registry],
        { unsafeAllowLinkedLibraries: true },
      );

      settings.set("trackAndTraceAddress", await trackAndTrace.getAddress());
      settings.set("adminAddress", taskArgs.admin);
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("tprAddress", taskArgs.tpr);
      settings.set("didRegistryAddress", taskArgs.registry);

      console.log(
        `TrackAndTrace contract deployed to ${await trackAndTrace.getAddress()}`,
      );
    },
  );

// task("trackAndTraceUpgrade", "Deploy contract Track And Trace").setAction(
//   async (taskArgs: NonNullable<unknown>, { ethers, upgrades, run }) => {
//     // compile
//     await run("compile", { force: true });
//
//     const settings = new Settings("track-and-trace");
//     const proxyAddress = settings.mustGet("trackAndTraceAddress");
//     console.log(proxyAddress);
//
//     // get contract
//     const trackAndTraceLibFactory = await ethers.getContractFactory(
//       "TrackAndTraceLib",
//       {},
//     );
//     const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();
//
//     // get contract
//     const trackAndTraceFactory = await ethers.getContractFactory(
//       "TrackAndTrace",
//       { libraries: { TrackAndTraceLib: await trackAndTraceLibContract.getAddress() } },
//     );
//
//     // forceImport
//     await upgrades.forceImport(proxyAddress, trackAndTraceFactory);
//
//     console.log(`factory loaded`);
//
//     // deploy
//     const trackAndTrace = await upgrades.upgradeProxy(
//       proxyAddress,
//       trackAndTraceFactory,
//       { unsafeAllowLinkedLibraries: true, redeployImplementation: "always" },
//     );
//
//     console.log(
//       `TrackAndTrace contract upgraded to ${await trackAndTrace.getImplementation()}`,
//     );
//   },
// );
//
// task(
//   "trackAndTraceUpgradeReinitialize",
//   "Deploy contract Track And Trace and reinitialize with v2",
// )
//   .addParam("tpr", "Tpr Proxy Address")
//   .setAction(async (taskArgs: { tpr: string }, { ethers, upgrades, run }) => {
//     // compile
//     await run("compile", { force: true });
//
//     const settings = new Settings("track-and-trace");
//     const proxyAddress = settings.mustGet("trackAndTraceAddress");
//     settings.set("tprAddress", taskArgs.tpr);
//     console.log(proxyAddress);
//
//     // get contract
//     const trackAndTraceLibFactory = await ethers.getContractFactory(
//       "TrackAndTraceLib",
//       {},
//     );
//     const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();
//
//     // get contract
//     const trackAndTraceFactory = await ethers.getContractFactory(
//       "TrackAndTrace",
//       { libraries: { TrackAndTraceLib: await trackAndTraceLibContract.getAddress() } },
//     );
//
//     // forceImport
//     await upgrades.forceImport(proxyAddress, trackAndTraceFactory);
//
//     console.log(`factory loaded`);
//
//     // deploy
//     const trackAndTrace = await upgrades.upgradeProxy(
//       proxyAddress,
//       trackAndTraceFactory,
//       {
//         unsafeAllowLinkedLibraries: true,
//         redeployImplementation: "always",
//       },
//     );
//     console.log(
//       `new contract deployed, beginning reinit with tpr address ${taskArgs.tpr}`,
//     );
//     await (await trackAndTrace.initializeV2(taskArgs.tpr)).wait(1);
//
//     console.log(
//       `TrackAndTrace contract upgraded and reinitialized to ${await trackAndTrace.getImplementation()}`,
//     );
//   });
