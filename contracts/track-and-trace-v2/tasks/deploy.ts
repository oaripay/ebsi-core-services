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
        {
          libraries: {
            TrackAndTraceLib: await trackAndTraceLibContract.getAddress(),
          },
        },
      );

      const didMockFactory = await ethers.getContractFactory("DidRegistryMock");
      const tprMockFactory =
        await ethers.getContractFactory("PolicyRegistryMock");
      const didRegistry = await didMockFactory.deploy();
      const tpr = await tprMockFactory.deploy();

      // deploy
      const trackAndTrace = await upgrades.deployProxy(
        trackAndTraceFactory,
        [
          taskArgs.admin,
          taskArgs.upgrader,
          await tpr.getAddress(),
          await didRegistry.getAddress(),
        ],
        { unsafeAllowLinkedLibraries: true },
      );
      console.log(
        `TrackAndTrace contract deployed to ${await trackAndTrace.getAddress()}`,
        `\n with tpr ${await tpr.getAddress()}`,
        `\n and didRegistry ${await didRegistry.getAddress()}`,
      );
    },
  );
