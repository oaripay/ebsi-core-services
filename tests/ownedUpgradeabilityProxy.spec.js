const {
  BN, // Big Number support
  constants,
  expectEvent, // Assertions for emitted events
  expectRevert,
} = require("@openzeppelin/test-helpers");

const {accounts, contract, web3} = require("@openzeppelin/test-environment");

const Tir = contract.fromArtifact("Tir");
const TirV1 = contract.fromArtifact("TirV1");
const encodeCall = require("./helpers/encodeCall");

const OwnedUpgradeabilityProxy = contract.fromArtifact(
  "OwnedUpgradeabilityProxy"
);
const initializeData = (issuerOperator, anchorOwner) =>
  encodeCall(
    "initialize",
    [
      {
        type: "uint256",
        name: "version",
      },
      {
        type: "address",
        name: "operator",
      },
      {
        type: "address[]",
        name: "pausers",
      },
    ],
    ["1", issuerOperator, [anchorOwner]]
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
  const implV0 = await Tir.new();
  const implV1 = await TirV1.new();
  const tir = await Tir.at(proxy.address);
  const tirV1 = await TirV1.at(proxy.address);

  await proxy.initialize(implV0.address, proxyAdmin, initializeDataString, {
    from: proxyOwner,
  });
  return {proxy, implV0, implV1, issuer: tir, issuerV1: tirV1};
};

describe("ownedUpgradeabilityProxy", () => {
  describe("admin", () => {
    it("has an admin", async () => {
      expect.assertions(1);
      const [proxyOwner, issuerOperator, proxyAdmin, anchorOwner] = accounts;
      const {proxy} = await setupProxy(
        initializeData(issuerOperator, anchorOwner),
        proxyOwner,
        proxyAdmin,
        issuerOperator,
        anchorOwner
      );
      const owner = await proxy.admin.call({from: proxyAdmin});
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
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );
        const newOwner = anotherAccount;
        const from = proxyAdmin;
        const curowner = await proxy.admin.call({from});
        expect(curowner).toStrictEqual(proxyAdmin);
        await proxy.changeAdmin(newOwner, {from: proxyAdmin}); // transfer admin to newOwner(anotherAccount)

        const owner = await proxy.admin.call({from: newOwner});
        expect(owner).toStrictEqual(newOwner);
      });

      it("emits an event", async () => {
        expect.assertions(4);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );
        const newOwner = anotherAccount;
        const from = proxyAdmin;
        const {logs} = await proxy.changeAdmin(newOwner, {
          from,
        });

        expect(logs).toHaveLength(1);
        expect(logs[0].event).toStrictEqual("AdminChanged");
        expect(logs[0].args.previousAdmin).toStrictEqual(proxyAdmin);
        expect(logs[0].args.newAdmin).toStrictEqual(newOwner);
      });
    });

    describe("when the sender is the issuer owner", () => {
      it("reverts", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, implV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );
        await proxy.upgradeTo(implV1.address, {
          from: proxyAdmin,
        });

        await expectRevert.unspecified(
          proxy.changeAdmin(anotherAccount, {from: issuerOperator})
        );
      });
    });

    describe("when the sender is not the owner", () => {
      it("reverts", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, implV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );

        await proxy.upgradeTo(implV1.address, {
          from: proxyAdmin,
        });
        await expectRevert.unspecified(
          proxy.changeAdmin(anotherAccount, {from: anotherAccount})
        );
      });
    });
  });

  describe("when the new proposed owner is the zero address", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, issuerOperator, proxyAdmin, anchorOwner] = accounts;
      const {proxy} = await setupProxy(
        initializeData(issuerOperator, anchorOwner),
        proxyOwner,
        proxyAdmin,
        issuerOperator,
        anchorOwner
      );
      const newOwner = constants.ZERO_ADDRESS;
      await expectRevert.unspecified(
        proxy.changeAdmin(newOwner, {from: proxyAdmin})
      );
    });
  });
});

describe("implementation", () => {
  describe("when an initial implementation was provided", () => {
    it("returns the given implementation", async () => {
      expect.assertions(1);
      const [proxyOwner, issuerOperator, proxyAdmin, anchorOwner] = accounts;
      const {proxy, implV0} = await setupProxy(
        initializeData(issuerOperator, anchorOwner),
        proxyOwner,
        proxyAdmin,
        issuerOperator,
        anchorOwner
      );

      const implementation = await proxy.implementation.call({
        from: proxyAdmin,
      });
      expect(implementation).toStrictEqual(implV0.address);
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
          const implV0 = await Tir.new();

          await expectRevert(
            proxy.upgradeTo(implV0.address, {from: proxyAdmin}),
            "Can't fallback if admin is not set"
          );
        });
      });

      describe("when an initial implementation was provided", () => {
        describe("when the given implementation is equal to the current one", () => {
          it("reverts", async () => {
            expect.assertions(0);
            const [
              proxyOwner,
              issuerOperator,
              proxyAdmin,
              ,
              anchorOwner,
            ] = accounts;
            const {proxy, implV1} = await setupProxy(
              initializeData(issuerOperator, anchorOwner),
              proxyOwner,
              proxyAdmin,
              issuerOperator,
              anchorOwner
            );
            await proxy.upgradeTo(implV1.address, {from: proxyAdmin});
            await expectRevert(
              proxy.upgradeTo(implV1.address, {from: proxyAdmin}),
              "Proxy implementation is already set to this address"
            );
          });
        });

        describe("when the given implementation is different than the current one", () => {
          it("upgrades to the new implementation", async () => {
            expect.assertions(1);
            const [
              proxyOwner,
              issuerOperator,
              proxyAdmin,
              ,
              anchorOwner,
            ] = accounts;
            const {proxy, implV1} = await setupProxy(
              initializeData(issuerOperator, anchorOwner),
              proxyOwner,
              proxyAdmin,
              issuerOperator,
              anchorOwner
            );
            await proxy.upgradeTo(implV1.address, {from: proxyAdmin});

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
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, implV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );

        await expectRevert.unspecified(
          proxy.upgradeTo(implV1.address, {from: anotherAccount})
        );
      });
    });
  });

  describe("when the new implementation is the zero address", () => {
    it("reverts", async () => {
      expect.assertions(0);
      const [proxyOwner, issuerOperator, proxyAdmin, anchorOwner] = accounts;
      const {proxy, implV1} = await setupProxy(
        initializeData(issuerOperator, anchorOwner),
        proxyOwner,
        proxyAdmin,
        issuerOperator,
        anchorOwner
      );

      await proxy.upgradeTo(implV1.address, {from: proxyAdmin});
      await expectRevert(
        proxy.upgradeTo(constants.ZERO_ADDRESS, {
          from: proxyAdmin,
        }),
        "Cannot set a proxy implementation to a non-contract address"
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
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, issuer, issuerV1, implV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );

        const adm = await proxy.admin.call({
          from: proxyAdmin,
        });
        expect(adm).toStrictEqual(proxyAdmin);
        const v0 = await issuer.version.call({from: anotherAccount});
        const v1 = await issuerV1.version.call({from: anotherAccount});

        expect(v0).toStrictEqual(v1);

        await proxy.upgradeTo(implV1.address, {from: proxyAdmin});

        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);
        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await issuer.insertIssuer(did, inputdata, {
          from: anotherAccount,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await issuerV1.getIssuerAttributeRevisions(
          firstAttrHash,
          {
            from: anotherAccount,
          }
        );

        expect(attributeVersions[0]).toStrictEqual(firstAttrHash);
      });

      it("calls the implementation using the given data as msg.data", async () => {
        expect.assertions(2);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, implV1, issuerV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );

        await proxy.upgradeToAndCall(implV1.address, initializeDataV1, {
          from: proxyAdmin,
        });

        const v2 = await issuerV1.version.call({from: anotherAccount});

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
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, implV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
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
      const [proxyOwner, issuerOperator, proxyAdmin, anchorOwner] = accounts;
      const {proxy} = await setupProxy(
        initializeData(issuerOperator, anchorOwner),
        proxyOwner,
        proxyAdmin,
        issuerOperator,
        anchorOwner
      );

      await expectRevert(
        proxy.upgradeToAndCall(
          constants.ZERO_ADDRESS,
          initializeData(issuerOperator, anchorOwner),
          {from: proxyAdmin}
        ),
        "Cannot set a proxy implementation to a non-contract address"
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

      const issuer = await Tir.at(proxy.address);

      await expectRevert(
        issuer.version.call({from: anotherAccount}),
        "Can't fallback if admin is not set"
      );
    });
  });

  describe("when an initial implementation was given", () => {
    describe("when there were no further upgrades", () => {
      it("delegates calls to the initial implementation", async () => {
        expect.assertions(1);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {issuer, issuerV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);
        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await issuer.insertIssuer(did, inputdata, {
          from: anotherAccount,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await issuerV1.getIssuerAttributeRevisions(
          firstAttrHash,
          {
            from: anotherAccount,
          }
        );
        expect(attributeVersions[0]).toStrictEqual(firstAttrHash);
      });

      it("fails when trying to call an unknown function of the current implementation", async () => {
        expect.assertions(0);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          ,
          anchorOwner,
        ] = accounts;
        const {issuerV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        await expectRevert.unspecified(
          issuerV1.getDidLastAttribute(did, {from: issuerOperator})
        );
      });
    });
    describe("when there was another upgrade", () => {
      it("delegates calls to the last upgraded implementation", async () => {
        expect.assertions(2);
        const [
          proxyOwner,
          issuerOperator,
          proxyAdmin,
          anotherAccount,
          anchorOwner,
        ] = accounts;
        const {proxy, implV1, issuer, issuerV1} = await setupProxy(
          initializeData(issuerOperator, anchorOwner),
          proxyOwner,
          proxyAdmin,
          issuerOperator,
          anchorOwner
        );
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        await proxy.upgradeTo(implV1.address, {from: proxyAdmin});
        const didHash = web3.utils.sha3(did);
        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await issuer.insertIssuer(did, inputdata, {
          from: anotherAccount,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await issuerV1.getIssuerAttributeRevisions(
          firstAttrHash,
          {
            from: anotherAccount,
          }
        );
        expect(attributeVersions[0]).toStrictEqual(firstAttrHash);

        const lastAttribute = await issuerV1.getDidLastAttribute(did, {
          from: issuerOperator,
        });

        expect(lastAttribute).toStrictEqual(firstAttrHash);
      });
    });
  });
});
