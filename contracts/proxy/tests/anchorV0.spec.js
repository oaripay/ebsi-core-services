const { expectRevert } = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");
const encodeCall = require("./helpers/encodeCall");

const OwnedUpgradeabilityProxy = contract.fromArtifact(
  "OwnedUpgradeabilityProxy"
);
const Anchor = contract.fromArtifact("Anchor");
let anchor;
describe("anchorV0", () => {
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

      anchor = await Anchor.at(proxy.address);
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

      anchor = await Anchor.at(proxy.address);
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
});
