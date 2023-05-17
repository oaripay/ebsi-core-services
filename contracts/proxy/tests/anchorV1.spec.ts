import { expect, assert } from "chai";
import { ethers } from "hardhat";

const { formatBytes32String, parseBytes32String } = ethers.utils;

describe("anchorV1", () => {
  describe("initialize", () => {
    it("can not be initialized twice", async () => {
      const [proxyOwner, anchorOwner] = await ethers.getSigners();
      const anchorFactory = await ethers.getContractFactory("Anchor");
      const implV0 = await anchorFactory.deploy();
      await implV0.deployed();
      const proxyFactory = await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
      );
      const proxy = await proxyFactory.connect(proxyOwner).deploy();
      await proxy.deployed();

      const fs: string[] = [];
      for (let i = 0; i < 32; i += 1) {
        fs.push(formatBytes32String(`20160528${i}`));
      }

      const initializeData = implV0.interface.encodeFunctionData(
        "initialize(bytes32[],string,string,uint8,address[])",
        [fs, "chameauCoin", "DTC", 10, [anchorOwner.address]]
      );

      // Initialize proxy with token address and call initialize function 'inittoken' that replace the constructor
      await proxy["initialize(address,address,bytes)"](
        implV0.address,
        proxyOwner.address,
        initializeData
      );

      const anchorV1Factory = await ethers.getContractFactory("AnchorV1");
      const implV1 = await anchorV1Factory.deploy();
      await proxy.upgradeTo(implV1.address);

      const anchor = anchorV1Factory.attach(proxy.address).connect(anchorOwner);

      await expect(
        anchor["initialize(bytes32[],string,string,uint8,address[])"](
          [
            formatBytes32String("0"),
            formatBytes32String("yolo"),
            formatBytes32String("yeah"),
          ],
          "chameauCoin",
          "DTC",
          10,
          [anchorOwner.address]
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("owner", () => {
    it("has an owner", async () => {
      const [proxyOwner, anchorOwner] = await ethers.getSigners();
      const anchorFactory = await ethers.getContractFactory("Anchor");
      const implV0 = await anchorFactory.deploy();
      await implV0.deployed();
      const proxyFactory = await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
      );
      const proxy = await proxyFactory.connect(proxyOwner).deploy();
      await proxy.deployed();

      const fs: string[] = [];
      for (let i = 0; i < 32; i += 1) {
        fs.push(formatBytes32String(`20160528${i}`));
      }

      const initializeData = implV0.interface.encodeFunctionData(
        "initialize(bytes32[],string,string,uint8,address[])",
        [fs, "chameauCoin", "DTC", 10, [anchorOwner.address]]
      );

      // Initialize proxy with token address and call initialize function 'inittoken' that replace the constructor
      await proxy["initialize(address,address,bytes)"](
        implV0.address,
        proxyOwner.address,
        initializeData
      );

      const anchorV1Factory = await ethers.getContractFactory("AnchorV1");
      const implV1 = await anchorV1Factory.deploy();
      await proxy.upgradeTo(implV1.address);

      const anchor = anchorV1Factory.attach(proxy.address).connect(anchorOwner);

      const results: Promise<string>[] = [];
      for (let i = 0; i < 32; i += 1) {
        results.push(anchor.fields(i));
      }

      const res = await Promise.all(results);
      res.map((owner, i) =>
        assert.equal(parseBytes32String(owner), `20160528${i}`)
      );
    });
  });

  describe("setRole", () => {
    it("get role", async () => {
      const [proxyOwner, anchorOwner, owner] = await ethers.getSigners();
      const anchorFactory = await ethers.getContractFactory("Anchor");
      const implV0 = await anchorFactory.deploy();
      await implV0.deployed();
      const proxyFactory = await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
      );
      const proxy = await proxyFactory.connect(proxyOwner).deploy();
      await proxy.deployed();

      const fs: string[] = [];
      for (let i = 0; i < 32; i += 1) {
        fs.push(formatBytes32String(`20160528${i}`));
      }

      const initializeData = implV0.interface.encodeFunctionData(
        "initialize(bytes32[],string,string,uint8,address[])",
        [fs, "chameauCoin", "DTC", 10, [anchorOwner.address]]
      );

      // Initialize proxy with token address and call initialize function 'inittoken' that replace the constructor
      await proxy["initialize(address,address,bytes)"](
        implV0.address,
        proxyOwner.address,
        initializeData
      );

      const anchorV1Factory = await ethers.getContractFactory("AnchorV1");
      const implV1 = await anchorV1Factory.deploy();
      await proxy.upgradeTo(implV1.address);

      const anchor = anchorV1Factory.attach(proxy.address).connect(owner);

      const r: string[] = [];
      for (let i = 0; i < 32; i += 1) {
        r.push(formatBytes32String(`yolo${i}`));
      }

      await anchor.setRole(r);
      const l = await anchor.getRole(0);
      for (let i = 0; i < 32; i += 1) {
        assert.equal(parseBytes32String(l[i]), `yolo${i}`);
      }
    });
  });
});
