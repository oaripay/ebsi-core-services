import { deployments } from "hardhat";

describe("deployments", () => {
  beforeEach(async () => {
    await deployments.fixture();
  });
  it("timestamp and proxy", async () => {
    const ts = await deployments.get("Timestamp"); // Token is available because the fixture was executed
    console.log(`Timestamp:${ts.address}`);
    const proxy = await deployments.get("OwnedUpgradeabilityProxy");
    console.log(`OwnedUpgradeabilityProxy:${proxy.address}`);
  });
});
