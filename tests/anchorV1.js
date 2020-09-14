const Anchor = artifacts.require("Anchor");
const Anchor_V1 = artifacts.require("Anchor_V1");
const encodeCall = require("./helpers/encodeCall");
const shouldBehaveLikeAnchorV0 = require("./behaviors/anchor_v0");

const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");

contract(
  "Anchor_V1",
  ([_, proxyOwner, anchorOwner, owner, recipient, anotherAccount]) => {
    beforeEach(async function () {
      const impl_v0 = await Anchor.new();
      const proxy = await OwnedUpgradeabilityProxy.new({from: proxyOwner});
      const fs = [];
      for (let i = 0; i < 32; i++) {
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
      await proxy.initialize(impl_v0.address, proxyOwner, initializeData, {
        from: proxyOwner,
      });

      const impl_v1 = await Anchor_V1.new();
      await proxy.upgradeTo(impl_v1.address, {from: proxyOwner});

      this.anchor = await Anchor_V1.at(proxy.address);
    });

    shouldBehaveLikeAnchorV0(
      proxyOwner,
      anchorOwner,
      owner,
      recipient,
      anotherAccount
    );

    describe("setrole", function () {
      const from = owner;

      it("get role", async function () {
        const r = [];
        for (let i = 0; i < 32; i++) {
          r.push(web3.utils.fromAscii(`yolo${i}`));
        }

        await this.anchor.setRole(r, {from});
        const l = await this.anchor.getRole(0, {from});
        for (let i = 0; i < 32; i++) {
          console.log("***********-", web3.utils.hexToUtf8(l[i]));
          assert.equal(web3.utils.hexToUtf8(l[i]), `yolo${i}`);
        }
      });
    });
  }
);
