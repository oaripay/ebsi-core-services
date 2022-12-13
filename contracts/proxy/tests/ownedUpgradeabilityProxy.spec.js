const { describe, it, expect } = require("@jest/globals");
const { constants, expectRevert } = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");
const PaginationArtifact = require("@ebsiint-sc/bootstrap/artifacts/contracts/utils/Pagination.sol/Pagination.json");

contract.artifactsDir = "artifacts/contracts/test/tir/Tir.sol";
const Tir = contract.fromArtifact("Tir");
contract.artifactsDir = "artifacts/contracts/test/TirV1.sol";
const TirV1 = contract.fromArtifact("TirV1");
const encodeCall = require("./helpers/encodeCall");

const Pagination = contract.fromABI(
  PaginationArtifact.abi,
  PaginationArtifact.bytecode
);

contract.artifactsDir =
  "artifacts/contracts/upgradeability/OwnedUpgradeabilityProxy.sol";
const OwnedUpgradeabilityProxy = contract.fromArtifact(
  "OwnedUpgradeabilityProxy"
);
const initializeData = (pauser) =>
  encodeCall(
    "initialize",
    [
      {
        type: "uint256",
        name: "version",
      },
      {
        type: "address[]",
        name: "pausers",
      },
    ],
    ["1", [pauser]]
  );
const initializeDataV1Version = "42";
const initializeDataV1 = encodeCall(
  "init2",
  [
    {
      type: "uint256",
      name: "newVersion",
    },
  ],
  [initializeDataV1Version]
);
const setupProxy = async (initializeDataString, proxyOwner, proxyAdmin) => {
  const proxy = await OwnedUpgradeabilityProxy.new({
    from: proxyOwner,
  });
  const myLibrary = await Pagination.new();
  await Tir.detectNetwork();
  await Tir.link("Pagination", myLibrary.address);
  await TirV1.detectNetwork();
  await TirV1.link("Pagination", myLibrary.address);
  const implV0 = await Tir.new();
  const implV1 = await TirV1.new();
  const tir = await Tir.at(proxy.address);
  const tirV1 = await TirV1.at(proxy.address);

  await proxy.initialize(implV0.address, proxyAdmin, initializeDataString, {
    from: proxyOwner,
  });
  return { proxy, implV0, implV1, tir, tirV1 };
};

describe("ownedUpgradeabilityProxy", () => {
  describe("admin", () => {
    it("has an admin", async () => {
      expect.assertions(1);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );
      const owner = await proxy.admin.call({ from: proxyAdmin });
      expect(owner).toStrictEqual(proxyAdmin);
    });
  });
});

describe("transferOwnership", () => {
  describe("when the new proposed owner is not the zero address", () => {
    describe("when the sender is the owner", () => {
      it("transfers the ownership", async () => {
        expect.assertions(2);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );
        const newOwner = anotherAccount;
        const from = proxyAdmin;
        const curowner = await proxy.admin.call({ from });
        expect(curowner).toStrictEqual(proxyAdmin);
        await proxy.changeAdmin(newOwner, { from: proxyAdmin }); // transfer admin to newOwner(anotherAccount)

        const owner = await proxy.admin.call({ from: newOwner });
        expect(owner).toStrictEqual(newOwner);
      });

      it("emits an event", async () => {
        expect.assertions(4);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );
        const newOwner = anotherAccount;
        const from = proxyAdmin;
        const { logs } = await proxy.changeAdmin(newOwner, {
          from,
        });

        expect(logs).toHaveLength(1);
        expect(logs[0].event).toBe("AdminChanged");
        expect(logs[0].args.previousAdmin).toStrictEqual(proxyAdmin);
        expect(logs[0].args.newAdmin).toStrictEqual(newOwner);
      });
    });

    describe("when the sender is the tir owner", () => {
      it("reverts", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, implV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );
        await proxy.upgradeTo(implV1.address, {
          from: proxyAdmin,
        });

        await expectRevert.unspecified(
          proxy.changeAdmin(anotherAccount, { from: tirOperator })
        );
      });
    });

    describe("when the sender is not the owner", () => {
      it("reverts", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, implV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );

        await proxy.upgradeTo(implV1.address, {
          from: proxyAdmin,
        });
        await expectRevert.unspecified(
          proxy.changeAdmin(anotherAccount, { from: anotherAccount })
        );
      });
    });
  });

  describe("when the new proposed owner is the zero address", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );
      const newOwner = constants.ZERO_ADDRESS;
      await expectRevert.unspecified(
        proxy.changeAdmin(newOwner, { from: proxyAdmin })
      );
    });
  });
});

describe("implementation", () => {
  describe("when an initial implementation was provided", () => {
    it("returns the given implementation", async () => {
      expect.assertions(1);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy, implV0 } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );

      const implementation = await proxy.implementation.call({
        from: proxyAdmin,
      });
      expect(implementation).toStrictEqual(implV0.address);
    });
    it("can't be initialized twice", async () => {
      expect.assertions(1);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy, implV0, implV1 } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );

      const implementation = await proxy.implementation.call({
        from: proxyAdmin,
      });
      expect(implementation).toStrictEqual(implV0.address);

      await expectRevert(
        proxy.initialize(
          implV1.address,
          proxyAdmin,
          initializeData(anchorOwner),
          {
            from: proxyOwner,
          }
        ),
        "implementation must be zero"
      );
    });
  });
});

describe("upgrade", () => {
  describe("when the new implementation is not the zero address", () => {
    describe("when the sender is the proxy owner", () => {
      describe("when no initial implementation was provided", () => {
        it("revert because no admin is defined", async () => {
          expect.assertions(0);
          const [proxyOwner, proxyAdmin] = accounts;
          const proxy = await OwnedUpgradeabilityProxy.new({
            from: proxyOwner,
          });
          const myLibrary = await Pagination.new();
          await Tir.detectNetwork();
          await Tir.link("Pagination", myLibrary.address);
          const implV0 = await Tir.new();

          await expectRevert(
            proxy.upgradeTo(implV0.address, { from: proxyAdmin }),
            "Can't fallback admin not set"
          );
        });
      });

      describe("when an initial implementation was provided", () => {
        describe("when the given implementation is equal to the current one", () => {
          it("reverts", async () => {
            expect.assertions(0);
            const [proxyOwner, tirOperator, proxyAdmin, , anchorOwner] =
              accounts;
            const { proxy, implV1 } = await setupProxy(
              initializeData(anchorOwner),
              proxyOwner,
              proxyAdmin,
              tirOperator,
              anchorOwner
            );
            await proxy.upgradeTo(implV1.address, { from: proxyAdmin });
            await expectRevert(
              proxy.upgradeTo(implV1.address, { from: proxyAdmin }),
              "implementation is the same"
            );
          });
        });

        describe("when the given implementation is different than the current one", () => {
          it("upgrades to the new implementation", async () => {
            expect.assertions(1);
            const [proxyOwner, tirOperator, proxyAdmin, , anchorOwner] =
              accounts;
            const { proxy, implV1 } = await setupProxy(
              initializeData(anchorOwner),
              proxyOwner,
              proxyAdmin,
              tirOperator,
              anchorOwner
            );
            await proxy.upgradeTo(implV1.address, { from: proxyAdmin });

            const implementation = await proxy.implementation.call({
              from: proxyAdmin,
            });

            expect(implementation).toStrictEqual(implV1.address);
          });
        });
      });
    });

    describe("when the sender is not the proxy owner", () => {
      it("reverts", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, implV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );

        await expectRevert.unspecified(
          proxy.upgradeTo(implV1.address, { from: anotherAccount })
        );
      });
    });
  });

  describe("when the new implementation is the zero address", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy, implV1 } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );

      await proxy.upgradeTo(implV1.address, { from: proxyAdmin });
      await expectRevert(
        proxy.upgradeTo(constants.ZERO_ADDRESS, {
          from: proxyAdmin,
        }),
        "implementation must be contract"
      );
    });
  });
});

describe("upgrade and call", () => {
  describe("when the new implementation is not the zero address", () => {
    describe("when the sender is the proxy owner", () => {
      it("upgrades to the given implementation", async () => {
        expect.assertions(3);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, tir, tirV1, implV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );

        const adm = await proxy.admin.call({
          from: proxyAdmin,
        });
        expect(adm).toStrictEqual(proxyAdmin);
        const v0 = await tir.version.call({ from: anotherAccount });
        const v1 = await tirV1.version.call({ from: anotherAccount });

        expect(v0).toStrictEqual(v1);

        await proxy.upgradeTo(implV1.address, { from: proxyAdmin });

        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        await tir.pushDid(did, {
          from: anotherAccount,
        });

        const attributeVersions = await tirV1.getDids({
          from: anotherAccount,
        });

        expect(attributeVersions).toStrictEqual([did]);
      });

      it("calls the implementation using the given data as msg.data", async () => {
        expect.assertions(2);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, implV1, tirV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );

        await proxy.upgradeToAndCall(implV1.address, initializeDataV1, {
          from: proxyAdmin,
        });

        const v2 = await tirV1.version.call({ from: anotherAccount });

        expect(web3.utils.toDecimal(v2).toString()).toStrictEqual(
          initializeDataV1Version
        );
        const implementation = await proxy.implementation.call({
          from: proxyAdmin,
        });
        expect(implementation).toStrictEqual(implV1.address);
      });
    });

    describe("when the sender is not the proxy owner", () => {
      it("reverts", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, implV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );

        await expectRevert.unspecified(
          proxy.upgradeToAndCall(implV1.address, initializeDataV1, {
            from: anotherAccount,
          })
        );
      });
    });
  });

  describe("when the new implementation is the zero address", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );

      await expectRevert(
        proxy.upgradeToAndCall(
          constants.ZERO_ADDRESS,
          initializeData(anchorOwner),
          { from: proxyAdmin }
        ),
        "newImp. address can't be zero"
      );
    });
  });

  describe("when the new implementation is not a contract", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, tirOperator, proxyAdmin, anchorOwner] = accounts;
      const { proxy } = await setupProxy(
        initializeData(anchorOwner),
        proxyOwner,
        proxyAdmin,
        tirOperator,
        anchorOwner
      );

      await expectRevert(
        // it is used proxyOwner just to use an address that is not a contract but also non-zero
        proxy.upgradeToAndCall(proxyOwner, initializeData(anchorOwner), {
          from: proxyAdmin,
        }),
        "implementation must be contract"
      );
    });
  });
});

describe("delegatecall", () => {
  describe("when no implementation was given", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, anotherAccount] = accounts;

      const proxy = await OwnedUpgradeabilityProxy.new({
        from: proxyOwner,
      });

      const tir = await Tir.at(proxy.address);

      await expectRevert(
        tir.version.call({ from: anotherAccount }),
        "Can't fallback admin not set"
      );
    });
  });

  describe("when an initial implementation was given", () => {
    describe("when there were no further upgrades", () => {
      it("delegates calls to the initial implementation", async () => {
        expect.assertions(1);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { tir, tirV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        await tir.pushDid(did, {
          from: anotherAccount,
        });
        const dids = await tirV1.getDids({
          from: anotherAccount,
        });
        expect(dids).toStrictEqual([did]);
      });

      it("fails when trying to call an unknown function of the current implementation", async () => {
        expect.assertions(0);
        const [proxyOwner, tirOperator, proxyAdmin, , anchorOwner] = accounts;
        const { tirV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );
        await expectRevert.unspecified(tirV1.getDidLast({ from: tirOperator }));
      });
    });
    describe("when there was another upgrade", () => {
      it("delegates calls to the last upgraded implementation", async () => {
        expect.assertions(2);
        const [
          proxyOwner,
          tirOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const { proxy, implV1, tir, tirV1 } = await setupProxy(
          initializeData(anchorOwner),
          proxyOwner,
          proxyAdmin,
          tirOperator,
          anchorOwner
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        await proxy.upgradeTo(implV1.address, { from: proxyAdmin });

        await tir.pushDid(did, {
          from: anotherAccount,
        });

        const dids = await tirV1.getDids({
          from: anotherAccount,
        });
        expect(dids).toStrictEqual([did]);
        await tirV1.pushDid("did2", {
          from: anotherAccount,
        });

        const lastDid = await tirV1.getDidLast({
          from: tirOperator,
        });

        expect(lastDid).toBe("did2");
      });
    });
  });
});
