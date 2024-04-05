import { task } from "hardhat/config";
import { Settings } from "../utils/settings";

task("trackAndTrace", "Deploy contract Track And Trace")
  .addParam("admin", "The admin address")
  .addParam("upgrader", "The upgrader address")
  .addParam("registry", "The address of didRegistry")
  .setAction(
    async (
      taskArgs: {
        admin: string;
        upgrader: string;
        registry: string;
      },
      { ethers, upgrades, run },
    ) => {
      // compile
      await run("compile", { quiet: true });

      const settings = new Settings("track-and-trace");

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
        [taskArgs.admin, taskArgs.upgrader, taskArgs.registry],
        { unsafeAllowLinkedLibraries: true },
      );

      settings.set("trackAndTraceAddress", trackAndTrace.address);
      settings.set("adminAddress", taskArgs.admin);
      settings.set("upgraderAddress", taskArgs.upgrader);
      settings.set("didRegistryAddress", taskArgs.registry);

      console.log(
        `TrackAndTrace contract deployed to ${trackAndTrace.address}`,
      );
    },
  );

task("trackAndTraceUpgrade", "Deploy contract Track And Trace").setAction(
  async (taskArgs: NonNullable<unknown>, { ethers, upgrades, run }) => {
    // compile
    await run("compile", { force: true });

    const settings = new Settings("track-and-trace");
    const proxyAddress = settings.mustGet("trackAndTraceAddress");
    console.log(proxyAddress);

    // get contract
    const trackAndTraceFactory = await ethers.getContractFactory(
      "TrackAndTrace",
      {},
    );

    console.log(`factory loaded`);

    // deploy
    const trackAndTrace = await upgrades.upgradeProxy(
      proxyAddress,
      trackAndTraceFactory,
    );

    console.log(
      `TrackAndTrace contract upgraded to ${trackAndTrace.getImplementation()}`,
    );
  },
);
