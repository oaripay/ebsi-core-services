const { describe, it, expect } = require("@jest/globals");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");
const encodeCall = require("./helpers/encodeCall");

contract.artifactsDir = "artifacts/contracts/test/Anchor.sol";
const Anchor = contract.fromArtifact("Anchor");

contract.artifactsDir = "artifacts/contracts/test/AnchorV1.sol";
const AnchorV1 = contract.fromArtifact("AnchorV1");

contract.artifactsDir =
  "artifacts/contracts/upgradeability/OwnedUpgradeabilityProxy.sol";
const OwnedUpgradeabilityProxy = contract.fromArtifact(
  "OwnedUpgradeabilityProxy"
);
let anchor;

describe("anchorV1", () => {
  describe("initialize", () => {
    it("can not be initialized twice", async () => {
      expect.assertions(0);
      const [proxyOwner, anchorOwner] = accounts;
      const implV0 = await Anchor.new();
      const proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner });
      const fs = [];
      for (let i = 0; i < 32; i += 1) {
        fs.push(web3.utils.fromAscii(`20160528${i}`));
      }
      const initializeData = encodeCall(
        "initialize",
        [
          {
            type: "bytes32[]",
            name: "fields",
          },
          {
            type: "string",
            name: "name",
          },
          {
            type: "string",
            name: "symbol",
          },
          {
            type: "uint8",
            name: "decimals",
          },
          {
            type: "address[]",
            name: "pausers",
          },
        ],
        [fs, "chameauCoin", "DTC", 10, [anchorOwner]]
      );
      // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
      await proxy.initialize(implV0.address, proxyOwner, initializeData, {
        from: proxyOwner,
      });

      const implV1 = await AnchorV1.new();
      await proxy.upgradeTo(implV1.address, { from: proxyOwner });

      anchor = await AnchorV1.at(proxy.address);
      await expectRevert.unspecified(
        anchor.initialize(
          [
            web3.utils.fromAscii("0"),
            web3.utils.fromAscii("yolo"),
            web3.utils.fromAscii("yeah"),
          ],
          "chameauCoin",
          "DTC",
          10,
          [anchorOwner]
        )
      );
    });
  });

  describe("owner", () => {
    it("has an owner", async () => {
      expect.assertions(32);
      const [proxyOwner, anchorOwner] = accounts;
      const implV0 = await Anchor.new();
      const proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner });
      const fs = [];
      for (let i = 0; i < 32; i += 1) {
        fs.push(web3.utils.fromAscii(`20160528${i}`));
      }
      const initializeData = encodeCall(
        "initialize",
        [
          {
            type: "bytes32[]",
            name: "fields",
          },
          {
            type: "string",
            name: "name",
          },
          {
            type: "string",
            name: "symbol",
          },
          {
            type: "uint8",
            name: "decimals",
          },
          {
            type: "address[]",
            name: "pausers",
          },
        ],
        [fs, "chameauCoin", "DTC", 10, [anchorOwner]]
      );
      // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
      await proxy.initialize(implV0.address, proxyOwner, initializeData, {
        from: proxyOwner,
      });

      const implV1 = await AnchorV1.new();
      await proxy.upgradeTo(implV1.address, { from: proxyOwner });

      anchor = await AnchorV1.at(proxy.address);
      const results = [];
      for (let i = 0; i < 32; i += 1) {
        results.push(anchor.fields(i));
      }
      const res = await Promise.all(results);
      res.map((owner, i) =>
        expect(web3.utils.hexToUtf8(owner)).toBe(`20160528${i}`)
      );
    });
  });

  describe("setrole", () => {
    it("get role", async () => {
      expect.assertions(32);
      const [proxyOwner, anchorOwner, owner] = accounts;
      const from = owner;
      const implV0 = await Anchor.new();
      const proxy = await OwnedUpgradeabilityProxy.new({ from: proxyOwner });
      const fs = [];
      for (let i = 0; i < 32; i += 1) {
        fs.push(web3.utils.fromAscii(`20160528${i}`));
      }
      const initializeData = encodeCall(
        "initialize",
        [
          {
            type: "bytes32[]",
            name: "fields",
          },
          {
            type: "string",
            name: "name",
          },
          {
            type: "string",
            name: "symbol",
          },
          {
            type: "uint8",
            name: "decimals",
          },
          {
            type: "address[]",
            name: "pausers",
          },
        ],
        [fs, "chameauCoin", "DTC", 10, [anchorOwner]]
      );
      // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
      await proxy.initialize(implV0.address, proxyOwner, initializeData, {
        from: proxyOwner,
      });

      const implV1 = await AnchorV1.new();
      await proxy.upgradeTo(implV1.address, { from: proxyOwner });

      anchor = await AnchorV1.at(proxy.address);
      const r = [];
      for (let i = 0; i < 32; i += 1) {
        r.push(web3.utils.fromAscii(`yolo${i}`));
      }

      await anchor.setRole(r, { from });
      const l = await anchor.getRole(0, { from });
      for (let i = 0; i < 32; i += 1) {
        expect(web3.utils.hexToUtf8(l[i])).toBe(`yolo${i}`);
      }
    });
  });
});
