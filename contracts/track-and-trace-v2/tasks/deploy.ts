import { task } from "hardhat/config";

task("deploy", "Deploy contract Track And Trace")
  .addParam("admin", "The admin address")
  .addParam("upgrader", "The upgrader address")
  .setAction(
    async (
      taskArgs: {
        admin: string;
        upgrader: string;
      },
      { ethers, run, upgrades },
    ) => {
      // compile
      await run("compile", { quiet: true });

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

      const didMockFactory = await ethers.getContractFactory("DidRegistryMock");
      const tprMockFactory =
        await ethers.getContractFactory("PolicyRegistryMock");
      const didRegistry = await didMockFactory.deploy();
      const tpr = await tprMockFactory.deploy();

      // deploy
      const trackAndTrace = await upgrades.deployProxy(
        trackAndTraceFactory,
        [taskArgs.admin, taskArgs.upgrader, tpr.address, didRegistry.address],
        { unsafeAllowLinkedLibraries: true },
      );
      console.log(
        `TrackAndTrace contract deployed to ${trackAndTrace.address}`,
        `\n with tpr ${tpr.address}`,
        `\n and didRegistry ${didRegistry.address}`,
      );
    },
  );
