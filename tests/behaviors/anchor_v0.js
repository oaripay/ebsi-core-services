function shouldBehaveLikeAnchorV0(anchorOwner) {
  const assertRevert = require("../helpers/assertRevert");

  describe("initialize", function () {
    it("can not be initialized twice", async function () {
      await assertRevert(
        this.anchor.initialize(
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

  describe("owner", function () {
    it("has an owner", async function () {
      for (let i = 0; i < 32; i++) {
        const owner = await this.anchor.fields(i);
        console.log("***********-", owner);
        assert.equal(web3.utils.hexToUtf8(owner), `20160528${i}`);
      }
    });
  });
}

module.exports = shouldBehaveLikeAnchorV0;
