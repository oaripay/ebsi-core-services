/* eslint-disable jest/no-hooks */
/* eslint-disable jest/require-top-level-describe */
/* eslint-disable no-undef */
const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");

const Issuer = artifacts.require("./test/Issuer");
const IssuerV1 = artifacts.require("./test/Issuer_V1");
const encodeCall = require("./helpers/encodeCall");
const assertRevert = require("./helpers/assertRevert");
const assertError = require("./helpers/assertError");

const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");

contract(
  "OwnedUpgradeabilityProxy",
  ([
    _,
    proxyOwner,
    IssuerOperator,
    proxyAdmin,
    anotherAccount,
    anchorOwner,
  ]) => {
    let proxy;
    let implV0;
    let implV1;
    let issuer;
    let issuerV1;

    const initializeData = encodeCall(
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
      ["1", IssuerOperator, [anchorOwner]]
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

    beforeEach(async () => {
      proxy = await OwnedUpgradeabilityProxy.new({from: proxyOwner});

      implV0 = await Issuer.new();
      implV1 = await IssuerV1.new();
      issuer = await Issuer.at(proxy.address);
      issuerV1 = await IssuerV1.at(proxy.address);
    });

    describe("admin", () => {
      beforeEach(async () => {
        // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
        await proxy.initialize(implV0.address, proxyAdmin, initializeData, {
          from: proxyOwner,
        });
      });
      it("has an admin", async () => {
        const owner = await proxy.admin.call({from: proxyAdmin});
        assert.equal(owner, proxyAdmin);
      });
    });

    describe("transferOwnership", () => {
      describe("when the new proposed owner is not the zero address", () => {
        const newOwner = anotherAccount;

        describe("when the sender is the owner", () => {
          const from = proxyAdmin;
          beforeEach(async () =>
            // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
            proxy.initialize(implV0.address, proxyAdmin, initializeData, {
              from: proxyOwner,
            })
          );
          it("transfers the ownership", async () => {
            const curowner = await proxy.admin.call({from});
            assert.equal(curowner, proxyAdmin);
            await proxy.changeAdmin(newOwner, {from: proxyAdmin}); // transfer admin to newOwner(anotherAccount)

            const owner = await proxy.admin.call({from: newOwner});
            assert.equal(owner, newOwner);
          });

          it("emits an event", async () => {
            const {logs} = await proxy.changeAdmin(newOwner, {
              from,
            });

            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, "AdminChanged");
            assert.equal(logs[0].args.previousAdmin, proxyAdmin);
            assert.equal(logs[0].args.newAdmin, newOwner);
          });
        });

        describe("when the sender is the token owner", () => {
          const from = IssuerOperator;

          beforeEach(async () =>
            proxy.upgradeToAndCall(implV1.address, initializeData, {
              from: proxyAdmin,
            })
          );

          it("reverts", async () => {
            await assertRevert(proxy.changeAdmin(newOwner, {from}));
          });
        });

        describe("when the sender is not the owner", () => {
          const from = anotherAccount;

          it("reverts", async () => {
            await assertRevert(proxy.changeAdmin(newOwner, {from}));
          });
        });
      });

      describe("when the new proposed owner is the zero address", () => {
        const newOwner = "0x0000000000000000000000000000000000000000";
        beforeEach(async () =>
          // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
          proxy.initialize(implV0.address, proxyAdmin, initializeData, {
            from: proxyOwner,
          })
        );
        it("reverts", async () => {
          await assertRevert(proxy.changeAdmin(newOwner, {from: proxyAdmin}));
        });
      });
    });

    describe("implementation", () => {
      describe("when an initial implementation was provided", () => {
        beforeEach(async () => {
          // Initiliaze proxy with token address and call initialize function 'inittoken' that replace the constructor
          await proxy.initialize(implV0.address, proxyAdmin, initializeData, {
            from: proxyOwner,
          });
          await proxy.upgradeTo(implV0.address, {from: proxyAdmin});
        });

        it("returns the given implementation", async () => {
          const implementation = await proxy.implementation.call({
            from: proxyAdmin,
          });
          assert.equal(implementation, implV0.address);
        });
      });
    });

    describe("upgrade", () => {
      describe("when the new implementation is not the zero address", () => {
        describe("when the sender is the proxy owner", () => {
          const from = proxyAdmin;

          describe("when no initial implementation was provided", () => {
            it("revert because no admin is defined", async () => {
              await assertRevert(proxy.upgradeTo(implV0.address, {from}));
            });
          });

          describe("when an initial implementation was provided", () => {
            beforeEach(async () => {
              await proxy.initialize(
                implV0.address,
                proxyAdmin,
                initializeData,
                {
                  from: proxyOwner,
                }
              );
              return proxy.upgradeTo(implV0.address, {from});
            });

            describe("when the given implementation is equal to the current one", () => {
              it("reverts", async () => {
                await assertRevert(proxy.upgradeTo(implV0.address, {from}));
              });
            });

            describe("when the given implementation is different than the current one", () => {
              it("upgrades to the new implementation", async () => {
                await proxy.upgradeTo(implV1.address, {from});

                const implementation = await proxy.implementation.call({
                  from,
                });
                assert.equal(implementation, implV1.address);
              });
            });
          });
        });

        describe("when the sender is not the proxy owner", () => {
          const from = anotherAccount;

          it("reverts", async () => {
            await assertRevert(proxy.upgradeTo(implV0.address, {from}));
          });
        });
      });

      describe("when the new implementation is the zero address", () => {
        it("reverts", async () => {
          await assertRevert(
            proxy.upgradeTo("0x0000000000000000000000000000000000000000", {
              from: proxyAdmin,
            })
          );
        });
      });
    });

    describe("upgrade and call", () => {
      describe("when the new implementation is not the zero address", () => {
        beforeEach(async () => {
          await proxy.initialize(implV0.address, proxyAdmin, initializeData, {
            from: proxyOwner,
          });
          const curVersion = await issuer.version.call({
            from: anotherAccount,
          });
        });
        describe("when the sender is the proxy owner", () => {
          const from = proxyAdmin;

          it("upgrades to the given implementation", async () => {
            adm = await proxy.admin.call({
              from,
            });

            console.log(`******************* proxy admin:${adm}`);
            // impl_v1 = await Anchor_V1.new();

            v0 = await issuer.version.call({from: anotherAccount});
            v1 = await issuerV1.version.call({from: anotherAccount});
            assert(v0.eq(v1));

            await proxy.upgradeTo(implV1.address, {from});

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
            const didAttributes = await issuerV1.getIssuerAttributesFirstHash(
              did,
              {
                from: anotherAccount,
              }
            );
            assert.equal(didAttributes, firstAttrHash);

            const attributeVersions = await issuerV1.getAttributeHistory(
              firstAttrHash,
              {
                from: anotherAccount,
              }
            );
            assert.equal(attributeVersions, firstAttrHash);

            const didFromAttrHash = await issuerV1.getDid(firstAttrHash, {
              from: anotherAccount,
            });

            assert.equal(didFromAttrHash, did);
          });

          it("calls the implementation using the given data as msg.data", async () => {
            implV1Prime = await IssuerV1.new();
            await proxy.upgradeToAndCall(
              implV1Prime.address,
              initializeDataV1,
              {
                from,
              }
            );

            const v2 = await issuerV1.version.call({from: anotherAccount});
            assert.equal(v2, initializeDataV1Version);
            const implementation = await proxy.implementation.call({from});
            assert.equal(implementation, implV1Prime.address);
          });
        });

        describe("when the sender is not the proxy owner", () => {
          const from = anotherAccount;

          it("reverts", async () => {
            await assertRevert(
              proxy.upgradeToAndCall(implV0.address, initializeData, {from})
            );
          });
        });
      });

      describe("when the new implementation is the zero address", () => {
        it("reverts", async () => {
          await assertRevert(
            proxy.upgradeToAndCall(
              "0x0000000000000000000000000000000000000000",
              initializeData,
              {from: proxyAdmin}
            )
          );
        });
      });
    });

    describe("delegatecall", () => {
      describe("when no implementation was given", () => {
        it("reverts", async () => {
          await assertError(
            issuer.version.call({from: anotherAccount}),
            "Returned values aren't valid, did it run Out of Gas?"
          );
        });
      });

      describe("when an initial implementation was given", () => {
        const sender = anotherAccount;
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        beforeEach(async () =>
          proxy.initialize(implV0.address, proxyAdmin, initializeData, {
            from: proxyOwner,
          })
        );

        describe("when there were no further upgrades", () => {
          it("delegates calls to the initial implementation", async () => {
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
            const didAttributes = await issuerV1.getIssuerAttributesFirstHash(
              did,
              {
                from: anotherAccount,
              }
            );
            assert.equal(didAttributes, firstAttrHash);

            const attributeVersions = await issuerV1.getAttributeHistory(
              firstAttrHash,
              {
                from: anotherAccount,
              }
            );
            assert.equal(attributeVersions, firstAttrHash);

            const didFromAttrHash = await issuerV1.getDid(firstAttrHash, {
              from: anotherAccount,
            });

            assert.equal(didFromAttrHash, did);
          });

          it("fails when trying to call an unknown function of the current implementation", async () => {
            await assertError(
              issuerV1.getDidLastAttribute(did, {from: IssuerOperator})
            );
          });
        });

        describe("when there was another upgrade", () => {
          beforeEach(async () => {
            await proxy.upgradeTo(implV1.address, {from: proxyAdmin});
          });

          it("delegates calls to the last upgraded implementation", async () => {
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
            const didAttributes = await issuerV1.getIssuerAttributesFirstHash(
              did,
              {
                from: anotherAccount,
              }
            );
            assert.equal(didAttributes, firstAttrHash);

            const attributeVersions = await issuerV1.getAttributeHistory(
              firstAttrHash,
              {
                from: anotherAccount,
              }
            );
            assert.equal(attributeVersions, firstAttrHash);

            const didFromAttrHash = await issuerV1.getDid(firstAttrHash, {
              from: anotherAccount,
            });

            assert.equal(didFromAttrHash, did);
            const lastAttribute = await issuerV1.getDidLastAttribute(did, {
              from: IssuerOperator,
            });

            assert.equal(lastAttribute, firstAttrHash);
          });
        });
      });
    });
  }
);
