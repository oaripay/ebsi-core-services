import { assert, expect } from "chai";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const { parseUnits } = ethers.utils;

const initializeData = async (pauser: SignerWithAddress) => {
  const tirFactory = await ethers.getContractFactory("Tir");
  return tirFactory.interface.encodeFunctionData(
    "initialize(uint256,address[])",
    ["1", [pauser.address]]
  );
};

const setupProxy = async (
  initializeDataString: string,
  proxyOwner: SignerWithAddress,
  proxyAdmin: SignerWithAddress
) => {
  const proxyFactory = await ethers.getContractFactory(
    "OwnedUpgradeabilityProxy"
  );
  const proxy = await proxyFactory.connect(proxyOwner).deploy();
  await proxy.deployed();

  const implV0 = await (await ethers.getContractFactory("Tir")).deploy();
  const implV1 = await (await ethers.getContractFactory("TirV1")).deploy();

  const tir = await (
    await ethers.getContractFactory("Tir")
  ).attach(proxy.address);
  const tirV1 = await (
    await ethers.getContractFactory("TirV1")
  ).attach(proxy.address);

  await proxy["initialize(address,address,bytes)"](
    implV0.address,
    proxyAdmin.address,
    initializeDataString
  );

  return {
    proxy,
    implV0,
    implV1,
    tir,
    tirV1,
  };
};

describe("ownedUpgradeabilityProxy", () => {
  describe("admin", () => {
    it("has an admin", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );

      const owner = await proxy.connect(proxyAdmin).callStatic.admin();

      assert.equal(owner, proxyAdmin.address);
    });
  });
});

describe("transferOwnership", () => {
  describe("when the new proposed owner is not the zero address", () => {
    describe("when the sender is the owner", () => {
      it("transfers the ownership", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );
        const newOwner = anotherAccount;

        const currentOwner = await proxy.connect(proxyAdmin).callStatic.admin();
        assert.equal(currentOwner, proxyAdmin.address);

        // transfer admin to newOwner(anotherAccount)
        await proxy.connect(proxyAdmin).changeAdmin(newOwner.address);

        const owner = await proxy.connect(newOwner).callStatic.admin();

        assert.equal(owner, newOwner.address);
      });

      it("emits an event", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );
        const newOwner = anotherAccount;

        const { logs } = await (
          await proxy.connect(proxyAdmin).changeAdmin(newOwner.address)
        ).wait();

        assert.lengthOf(logs, 1);

        const parsedLog = proxy.interface.parseLog(logs[0]);
        assert.equal(parsedLog.name, "AdminChanged");
        assert.equal(parsedLog.args.previousAdmin, proxyAdmin.address);
        assert.equal(parsedLog.args.newAdmin, newOwner.address);
      });
    });

    describe("when the sender is the tir owner", () => {
      it("reverts", async () => {
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = await ethers.getSigners();
        const { proxy, implV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );

        await proxy.connect(proxyAdmin).upgradeTo(implV1.address);

        await expect(
          proxy.connect(tirOperator).changeAdmin(anotherAccount.address)
        ).to.be.reverted;
      });
    });

    describe("when the sender is not the owner", () => {
      it("reverts", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy, implV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );

        await proxy.connect(proxyAdmin).upgradeTo(implV1.address);
        await expect(
          proxy.connect(anotherAccount).changeAdmin(anotherAccount.address)
        ).to.be.reverted;
      });
    });
  });

  describe("when the new proposed owner is the zero address", () => {
    it("reverts", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );
      const newOwner = ZERO_ADDRESS;
      await expect(proxy.connect(proxyAdmin).changeAdmin(newOwner)).to.be
        .reverted;
    });
  });
});

describe("implementation", () => {
  describe("when an initial implementation was provided", () => {
    it("returns the given implementation", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy, implV0 } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );

      const implementation = await proxy
        .connect(proxyAdmin)
        .callStatic.implementation();

      assert.equal(implementation, implV0.address);
    });

    it("can't be initialized twice", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy, implV0, implV1 } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );

      const implementation = await proxy
        .connect(proxyAdmin)
        .callStatic.implementation();

      assert.equal(implementation, implV0.address);

      await expect(
        proxy
          .connect(proxyOwner)
          ["initialize(address,address,bytes)"](
            implV1.address,
            proxyAdmin.address,
            initializeData(anchorOwner)
          )
      ).to.be.revertedWith("implementation must be zero");
    });
  });
});

describe("upgrade", () => {
  describe("when the new implementation is not the zero address", () => {
    describe("when the sender is the proxy owner", () => {
      describe("when no initial implementation was provided", () => {
        it("revert because no admin is defined", async () => {
          const [proxyOwner, proxyAdmin] = await ethers.getSigners();

          const proxyFactory = await ethers.getContractFactory(
            "OwnedUpgradeabilityProxy"
          );
          const proxy = await proxyFactory.connect(proxyOwner).deploy();
          await proxy.deployed();

          const implV0 = await (
            await ethers.getContractFactory("Tir")
          ).deploy();

          await expect(
            proxy.connect(proxyAdmin).upgradeTo(implV0.address)
          ).to.be.revertedWith("Can't fallback admin not set");
        });
      });

      describe("when an initial implementation was provided", () => {
        describe("when the given implementation is equal to the current one", () => {
          it("reverts", async () => {
            const [proxyOwner, proxyAdmin, anchorOwner] =
              await ethers.getSigners();

            const { proxy, implV1 } = await setupProxy(
              await initializeData(anchorOwner),
              proxyOwner,
              proxyAdmin
            );

            await proxy.connect(proxyAdmin).upgradeTo(implV1.address);
            await expect(
              proxy.connect(proxyAdmin).upgradeTo(implV1.address)
            ).to.be.revertedWith("implementation is the same");
          });
        });

        describe("when the given implementation is different than the current one", () => {
          it("upgrades to the new implementation", async () => {
            const [proxyOwner, proxyAdmin, anchorOwner] =
              await ethers.getSigners();
            const { proxy, implV1 } = await setupProxy(
              await initializeData(anchorOwner),
              proxyOwner,
              proxyAdmin
            );
            await proxy.connect(proxyAdmin).upgradeTo(implV1.address);

            const implementation = await proxy
              .connect(proxyAdmin)
              .callStatic.implementation();

            assert.equal(implementation, implV1.address);
          });
        });
      });
    });

    describe("when the sender is not the proxy owner", () => {
      it("reverts", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy, implV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );

        await expect(proxy.connect(anotherAccount).upgradeTo(implV1.address)).to
          .be.reverted;
      });
    });
  });

  describe("when the new implementation is the zero address", () => {
    it("reverts", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy, implV1 } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );

      await proxy.connect(proxyAdmin).upgradeTo(implV1.address);
      await expect(
        proxy.connect(proxyAdmin).upgradeTo(ZERO_ADDRESS, {})
      ).to.be.revertedWith("implementation must be contract");
    });
  });
});

describe("upgrade and call", () => {
  describe("when the new implementation is not the zero address", () => {
    let initializeDataV1: string;
    const initializeDataV1Version = "42";

    before(async () => {
      const tirV1Factory = await ethers.getContractFactory("TirV1");
      initializeDataV1 = tirV1Factory.interface.encodeFunctionData("init2", [
        initializeDataV1Version,
      ]);
    });

    describe("when the sender is the proxy owner", () => {
      it("upgrades to the given implementation", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy, tir, tirV1, implV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );

        const adm = await proxy.connect(proxyAdmin).callStatic.admin();

        assert.equal(adm, proxyAdmin.address);

        const v0 = await tir.version.call({ from: anotherAccount });
        const v1 = await tirV1.version.call({ from: anotherAccount });

        assert.deepStrictEqual(v0, v1);

        await proxy.connect(proxyAdmin).upgradeTo(implV1.address);

        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        await tir.connect(anotherAccount).pushDid(did);

        const attributeVersions = await tirV1.connect(anotherAccount).getDids();

        assert.deepStrictEqual(attributeVersions, [did]);
      });

      it("calls the implementation using the given data as msg.data", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy, implV1, tirV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );

        await proxy
          .connect(proxyAdmin)
          .upgradeToAndCall(implV1.address, initializeDataV1);

        const v2 = await tirV1.version.call({ from: anotherAccount });

        assert.equal(
          parseUnits(v2.toString(), 0).toString(),
          initializeDataV1Version
        );

        const implementation = await proxy
          .connect(proxyAdmin)
          .callStatic.implementation();

        assert.equal(implementation, implV1.address);
      });
    });

    describe("when the sender is not the proxy owner", () => {
      it("reverts", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { proxy, implV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );

        await expect(
          proxy
            .connect(anotherAccount)
            .upgradeToAndCall(implV1.address, initializeDataV1)
        ).to.be.reverted;
      });
    });
  });

  describe("when the new implementation is the zero address", () => {
    it("reverts", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );

      await expect(
        proxy
          .connect(proxyAdmin)
          .upgradeToAndCall(ZERO_ADDRESS, initializeData(anchorOwner))
      ).to.be.revertedWith("newImp. address can't be zero");
    });
  });

  describe("when the new implementation is not a contract", () => {
    it("reverts", async () => {
      const [proxyOwner, proxyAdmin, anchorOwner] = await ethers.getSigners();
      const { proxy } = await setupProxy(
        await initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin
      );

      await expect(
        // it is used proxyOwner just to use an address that is not a contract but also non-zero
        proxy
          .connect(proxyAdmin)
          .upgradeToAndCall(
            proxyOwner.address,
            await initializeData(anchorOwner)
          )
      ).to.be.revertedWith("implementation must be contract");
    });
  });
});

describe("delegatecall", () => {
  describe("when no implementation was given", () => {
    it("reverts", async () => {
      const [proxyOwner, anotherAccount] = await ethers.getSigners();

      const proxyFactory = await ethers.getContractFactory(
        "OwnedUpgradeabilityProxy"
      );
      const proxy = await proxyFactory.connect(proxyOwner).deploy();
      await proxy.deployed();

      const tir = await (
        await ethers.getContractFactory("Tir")
      ).attach(proxy.address);

      await expect(tir.version.call({ from: anotherAccount })).to.be.reverted;
    });
  });

  describe("when an initial implementation was given", () => {
    describe("when there were no further upgrades", () => {
      it("delegates calls to the initial implementation", async () => {
        const [proxyOwner, proxyAdmin, anotherAccount, anchorOwner] =
          await ethers.getSigners();
        const { tir, tirV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        await tir.connect(anotherAccount).pushDid(did);
        const dids = await tirV1.connect(anotherAccount).getDids();
        assert.deepStrictEqual(dids, [did]);
      });

      it("fails when trying to call an unknown function of the current implementation", async () => {
        const [proxyOwner, tirOperator, proxyAdmin, , anchorOwner] =
          await ethers.getSigners();
        const { tirV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );
        await expect(tirV1.connect(tirOperator).getDidLast()).to.be.reverted;
      });
    });

    describe("when there was another upgrade", () => {
      it("delegates calls to the last upgraded implementation", async () => {
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = await ethers.getSigners();
        const { proxy, implV1, tir, tirV1 } = await setupProxy(
          await initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        await proxy.connect(proxyAdmin).upgradeTo(implV1.address);

        await tir.connect(anotherAccount).pushDid(did);

        const dids = await tirV1.connect(anotherAccount).getDids();

        assert.deepStrictEqual(dids, [did]);

        await tirV1.connect(anotherAccount).pushDid("did2");

        const lastDid = await tirV1.connect(tirOperator).getDidLast();

        assert.equal(lastDid, "did2");
      });
    });
  });
});
