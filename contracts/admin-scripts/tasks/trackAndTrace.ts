import { task } from "hardhat/config";

import type { TrackAndTrace } from "../src/types/contracts/track-and-trace";

import { Settings } from "../utils/settings";

task("trackAndTrace", "Deploy contract Track And Trace")
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

      const settings = new Settings("track-and-trace", network.name);

      // get contract
      const trackAndTraceLibFactory = await ethers.getContractFactory(
        "TrackAndTraceLib",
        {},
      );
      const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

      const trackAndTraceFactory = await ethers.getContractFactory(
        "TrackAndTrace",
        { libraries: { TrackAndTraceLib: trackAndTraceLibContract.address } },
      );

      // deploy
      const trackAndTrace = await upgrades.deployProxy(
        trackAndTraceFactory,
        [taskArgs.admin, taskArgs.upgrader, taskArgs.tpr, taskArgs.registry],
        { unsafeAllowLinkedLibraries: true },
      );

      settings.set("trackAndTraceAddress", trackAndTrace.address);
      settings.set("adminAddress", taskArgs.admin);
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("tprAddress", taskArgs.tpr);
      settings.set("didRegistryAddress", taskArgs.registry);

      console.log(
        `TrackAndTrace contract deployed to ${trackAndTrace.address}`,
      );
    },
  );

task("trackAndTraceUpgrade", "Deploy contract Track And Trace").setAction(
  async (_, { ethers, network, run, upgrades }) => {
    // compile
    await run("compile", { force: true });

    const settings = new Settings("track-and-trace", network.name);
    const proxyAddress = settings.mustGet("trackAndTraceAddress");
    console.log(proxyAddress);

    // get contract
    const trackAndTraceLibFactory = await ethers.getContractFactory(
      "TrackAndTraceLib",
      {},
    );
    const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

    // get contract
    const trackAndTraceFactory = await ethers.getContractFactory(
      "TrackAndTrace",
      { libraries: { TrackAndTraceLib: trackAndTraceLibContract.address } },
    );

    // forceImport
    await upgrades.forceImport(proxyAddress, trackAndTraceFactory);

    console.log(`factory loaded`);

    // deploy
    const trackAndTrace = (await upgrades.upgradeProxy(
      proxyAddress,
      trackAndTraceFactory,
      { redeployImplementation: "always", unsafeAllowLinkedLibraries: true },
    )) as TrackAndTrace;

    console.log(
      `TrackAndTrace contract upgraded to ${await trackAndTrace.getImplementation()}`,
    );
  },
);

task(
  "trackAndTraceUpgradeReinitialize",
  "Deploy contract Track And Trace and reinitialize with v2",
)
  .addParam("tpr", "Tpr Proxy Address")
  .setAction(
    async (taskArgs: { tpr: string }, { ethers, network, run, upgrades }) => {
      // compile
      await run("compile", { force: true });

      const settings = new Settings("track-and-trace", network.name);
      const proxyAddress = settings.mustGet("trackAndTraceAddress");
      settings.set("tprAddress", taskArgs.tpr);
      console.log(proxyAddress);

      // get contract
      const trackAndTraceLibFactory = await ethers.getContractFactory(
        "TrackAndTraceLib",
        {},
      );
      const trackAndTraceLibContract = await trackAndTraceLibFactory.deploy();

      // get contract
      const trackAndTraceFactory = await ethers.getContractFactory(
        "TrackAndTrace",
        { libraries: { TrackAndTraceLib: trackAndTraceLibContract.address } },
      );

      // forceImport
      await upgrades.forceImport(proxyAddress, trackAndTraceFactory);

      console.log(`factory loaded`);

      // deploy
      const trackAndTrace = (await upgrades.upgradeProxy(
        proxyAddress,
        trackAndTraceFactory,
        {
          redeployImplementation: "always",
          unsafeAllowLinkedLibraries: true,
        },
      )) as TrackAndTrace;
      console.log(
        `new contract deployed, beginning reinit with tpr address ${taskArgs.tpr}`,
      );
      await (await trackAndTrace.initializeV2(taskArgs.tpr)).wait(1);

      console.log(
        `TrackAndTrace contract upgraded and reinitialized to ${await trackAndTrace.getImplementation()}`,
      );
    },
  );
