const {
  BN, // Big Number support
  time,
  constants,
  expectRevert,
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const { ethers } = require("ethers");

const Tar = contract.fromArtifact("Tar");
const Pagination = contract.fromArtifact("Pagination");
const PolicyLib = contract.fromArtifact("PolicyLib");
const PolicyStoreLib = contract.fromArtifact("PolicyStoreLib");

const AuthLib = contract.fromArtifact("AuthLib");
const AuthStoreLib = contract.fromArtifact("AuthStoreLib");

const RevocationLib = contract.fromArtifact("RevocationLib");
const RevocationStoreLib = contract.fromArtifact("RevocationStoreLib");

const AppLib = contract.fromArtifact("AppLib");
const AppStoreLib = contract.fromArtifact("AppStoreLib");

const AdminLib = contract.fromArtifact("AdminLib");
const AdminStoreLib = contract.fromArtifact("AdminStoreLib");
const AttributeStoreLib = contract.fromArtifact("AttributeStoreLib");

describe("trusted application registry", () => {
  let implV0;
  let acc1;
  beforeEach(async () => {
    [acc1] = accounts;
    const paginationLib = await Pagination.new();
    await AdminLib.detectNetwork();
    await AdminLib.link("Pagination", paginationLib.address);
    const adminLib = await AdminLib.new();
    const adminStoreLib = await AdminStoreLib.new();
    const attributeStoreLib = await AttributeStoreLib.new();
    await PolicyLib.detectNetwork();
    await PolicyLib.link("Pagination", paginationLib.address);
    const policyLib = await PolicyLib.new();
    const policyStoreLib = await PolicyStoreLib.new();

    await RevocationLib.detectNetwork();
    const revocationLib = await RevocationLib.new();
    const revocationStoreLib = await RevocationStoreLib.new();

    await AuthLib.detectNetwork();
    await AuthLib.link("Pagination", paginationLib.address);
    const authLib = await AuthLib.new();
    const authStoreLib = await AuthStoreLib.new();
    await AppLib.detectNetwork();
    await AppLib.link("Pagination", paginationLib.address);
    const appLib = await AppLib.new();
    const appStoreLib = await AppStoreLib.new();
    await Tar.detectNetwork();
    await Tar.link("RevocationLib", revocationLib.address);
    await Tar.link("RevocationStoreLib", revocationStoreLib.address);
    await Tar.link("AuthLib", authLib.address);
    await Tar.link("AuthStoreLib", authStoreLib.address);
    await Tar.link("AppLib", appLib.address);
    await Tar.link("AppStoreLib", appStoreLib.address);
    await Tar.link("PolicyLib", policyLib.address);
    await Tar.link("PolicyStoreLib", policyStoreLib.address);
    await Tar.link("AdminLib", adminLib.address);
    await Tar.link("AdminStoreLib", adminStoreLib.address);
    await Tar.link("AttributeStoreLib", attributeStoreLib.address);
    implV0 = await Tar.new({ from: acc1 });
  });

  describe("authorization CRUD", () => {
    describe("insert authorization", () => {
      it("should revert for an unknown name or authorizedAppName", async () => {
        expect.assertions(0);
        const appName = "appName";
        const authorizedApplicationName = "authorizedApplicationName";
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const publickeyBytes = web3.utils.toHex(publickey);
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        await expectRevert(
          implV0.insertAuthorization(
            appName,
            authorizedApplicationName,
            "iss",
            status,
            15,
            notBefore,
            notAfter,
            {
              from: acc1,
            }
          ),
          "name unknown"
        );
        const insertAppRcpt = await implV0.insertApp(
          appName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        expectEvent(insertAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(appName),
          appId: publicKeyId,
          publicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });
        await expectRevert(
          implV0.insertAuthorization(
            appName,
            authorizedApplicationName,
            "iss",
            status,
            15,
            notBefore,
            notAfter,
            {
              from: acc1,
            }
          ),
          "authapp unknown"
        );
      });
      it("should revert when inserting an already existing authorization", async () => {
        expect.assertions(0);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const authorizedApplicationName = "Storage API";
        const authorizedApplicationPublickey = "dStoreItMergEiIt564649798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.toHex(applicationPublickey);
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        // Create authorized app
        const authorizedPublickeyBytes = web3.utils.toHex(
          authorizedApplicationPublickey
        );
        await implV0.insertApp(
          authorizedApplicationName,
          domain,
          appAdministrator,
          authorizedPublickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const authPublicKeyId = ethers.utils.sha256(authorizedPublickeyBytes);

        const iss = "did:ebsi:0x424242116F4C145c47C47022565D79E4df50bE90cb";
        const permissions = 15;
        const receipt = await implV0.insertAuthorization(
          applicationName,
          authorizedApplicationName,
          iss,
          status,
          permissions,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );

        const newAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            [
              "bytes32",
              "bytes32",
              "string",
              "uint8",
              "uint8",
              "uint256",
              "uint256",
            ],
            [
              publicKeyId,
              authPublicKeyId,
              iss,
              status,
              permissions,
              new BN(notBefore).toString(),
              new BN(notAfter).toString(),
            ]
          )
        );
        expectEvent(receipt, "AddNewAuthorization", {
          appId: publicKeyId,
          authorizedAppName: web3.utils.keccak256(authorizedApplicationName),
          authorizedAppId: authPublicKeyId,
          newAuthorizationId,
          status: "0",
          permissions: new BN(permissions),
          notBefore,
          notAfter,
        });
        await expectRevert(
          implV0.insertAuthorization(
            applicationName,
            authorizedApplicationName,
            iss,
            status,
            permissions,
            notBefore,
            notAfter,
            {
              from: acc1,
            }
          ),
          "auth exists"
        );
      });
      it("should insert sucessfully", async () => {
        expect.assertions(9);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const authorizedApplicationName = "Storage API";
        const authorizedApplicationPublickey = "dStoreItMergEiIt564649798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.toHex(applicationPublickey);
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        const insertAppRcpt = await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        expectEvent(insertAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(applicationName),
          appId: publicKeyId,
          publicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });
        // Create authorized app
        const authorizedPublickeyBytes = web3.utils.toHex(
          authorizedApplicationPublickey
        );
        const insertAuthAppRcpt = await implV0.insertApp(
          authorizedApplicationName,
          domain,
          appAdministrator,
          authorizedPublickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const authPublicKeyId = ethers.utils.sha256(authorizedPublickeyBytes);
        expectEvent(insertAuthAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(authorizedApplicationName),
          appId: authPublicKeyId,
          publicKeyId: authPublicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });

        const iss = "did:ebsi:0x424242116F4C145c47C47022565D79E4df50bE90cb";
        const permissions = 15;
        const receipt = await implV0.insertAuthorization(
          applicationName,
          authorizedApplicationName,
          iss,
          status,
          permissions,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const newAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            [
              "bytes32",
              "bytes32",
              "string",
              "uint8",
              "uint8",
              "uint256",
              "uint256",
            ],
            [
              publicKeyId,
              authPublicKeyId,
              iss,
              status,
              permissions,
              new BN(notBefore).toString(),
              new BN(notAfter).toString(),
            ]
          )
        );
        expectEvent(receipt, "AddNewAuthorization", {
          appId: publicKeyId,
          authorizedAppName: web3.utils.keccak256(authorizedApplicationName),
          authorizedAppId: authPublicKeyId,
          newAuthorizationId,
          status: "0",
          permissions: new BN(permissions),
          notBefore,
          notAfter,
        });
        const res = await implV0.getAuthorizationById(newAuthorizationId, {
          from: acc1,
        });
        expect(res.applicationId).toStrictEqual(publicKeyId);
        expect(res.authorizedAppId).toStrictEqual(authPublicKeyId);
        expect(res.name).toStrictEqual(applicationName);
        expect(res.authorizedAppName).toStrictEqual(authorizedApplicationName);
        expect(res.iss).toStrictEqual(iss);
        expect(res.status.eq(new BN(0))).toBe(true);
        expect(res.permissions.eq(new BN(permissions))).toBe(true);
        expect(res.notBefore.eq(new BN(notBefore))).toBe(true);
        expect(res.notAfter.eq(new BN(notAfter))).toBe(true);
      });
    });
    describe("update authorization", () => {
      it("should revert for an unknown authorization", async () => {
        expect.assertions(0);
        // Create app
        const status = 0;
        const notAfter = (await time.latest()).add(time.duration.weeks(1));
        const permissions = 15;
        await expectRevert(
          implV0.updateAuthorization(
            constants.ZERO_BYTES32,
            status,
            permissions,
            notAfter,
            {
              from: acc1,
            }
          ),
          "auth null"
        );

        const publickeyBytes = web3.utils.toHex("dlkjdskljd");
        const publicKeyId = ethers.utils.sha256(publickeyBytes);
        const authPublicKeyIdBytes = web3.utils.toHex("dlkjssssdskljd");
        const authPublicKeyId = ethers.utils.sha256(authPublicKeyIdBytes);
        const newAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            ["bytes32", "bytes32"],
            [publicKeyId, authPublicKeyId]
          )
        );

        await expectRevert(
          implV0.updateAuthorization(
            newAuthorizationId,
            status,
            permissions,
            notAfter,
            {
              from: acc1,
            }
          ),
          "auth unknown"
        );
      });
      it("should update sucessfully", async () => {
        expect.assertions(18);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const authorizedApplicationName = "Storage API";
        const authorizedApplicationPublickey = "dStoreItMergEiIt564649798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.toHex(applicationPublickey);
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        const insertAppRcpt = await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        expectEvent(insertAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(applicationName),
          appId: publicKeyId,
          publicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });
        // Create authorized app
        const authorizedPublickeyBytes = web3.utils.toHex(
          authorizedApplicationPublickey
        );
        const insertAuthAppRcpt = await implV0.insertApp(
          authorizedApplicationName,
          domain,
          appAdministrator,
          authorizedPublickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const authPublicKeyId = ethers.utils.sha256(authorizedPublickeyBytes);
        expectEvent(insertAuthAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(authorizedApplicationName),
          appId: authPublicKeyId,
          publicKeyId: authPublicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });

        const iss = "did:ebsi:0x424242116F4C145c47C47022565D79E4df50bE90cb";
        const permissions = 15;
        const receipt = await implV0.insertAuthorization(
          applicationName,
          authorizedApplicationName,
          iss,
          status,
          permissions,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );

        const newAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            [
              "bytes32",
              "bytes32",
              "string",
              "uint8",
              "uint8",
              "uint256",
              "uint256",
            ],
            [
              publicKeyId,
              authPublicKeyId,
              iss,
              status,
              permissions,
              new BN(notBefore).toString(),
              new BN(notAfter).toString(),
            ]
          )
        );
        expectEvent(receipt, "AddNewAuthorization", {
          appId: publicKeyId,
          authorizedAppName: web3.utils.keccak256(authorizedApplicationName),
          authorizedAppId: authPublicKeyId,
          newAuthorizationId,
          status: "0",
          permissions: new BN(permissions),
          notBefore,
          notAfter,
        });
        const res = await implV0.getAuthorizationById(newAuthorizationId, {
          from: acc1,
        });

        expect(res.applicationId).toStrictEqual(publicKeyId);
        expect(res.authorizedAppId).toStrictEqual(authPublicKeyId);
        expect(res.name).toStrictEqual(applicationName);
        expect(res.authorizedAppName).toStrictEqual(authorizedApplicationName);
        expect(res.iss).toStrictEqual(iss);
        expect(res.status.eq(new BN(0))).toBe(true);
        expect(res.permissions.eq(new BN(permissions))).toBe(true);
        expect(res.notBefore.eq(new BN(notBefore))).toBe(true);
        expect(res.notAfter.eq(new BN(notAfter))).toBe(true);
        const newStatus = 2;
        const newPermissions = 8;
        const newNotAfter = notAfter.add(time.duration.years(1));

        const receiptUpdate = await implV0.updateAuthorization(
          newAuthorizationId,
          newStatus,
          newPermissions,
          newNotAfter,
          {
            from: acc1,
          }
        );
        expectEvent(receiptUpdate, "UpdateAuthorization", {
          authorizationId: newAuthorizationId,
          status: "2",
          permissions: new BN(newPermissions),
          notAfter: newNotAfter,
        });
        const updatedRes = await implV0.getAuthorizationById(
          newAuthorizationId,
          {
            from: acc1,
          }
        );

        expect(updatedRes.applicationId).toStrictEqual(publicKeyId);
        expect(updatedRes.authorizedAppId).toStrictEqual(authPublicKeyId);
        expect(updatedRes.name).toStrictEqual(applicationName);
        expect(updatedRes.authorizedAppName).toStrictEqual(
          authorizedApplicationName
        );
        expect(updatedRes.iss).toStrictEqual(iss);
        expect(updatedRes.status.eq(new BN(2))).toBe(true);
        expect(updatedRes.permissions.eq(new BN(newPermissions))).toBe(true);
        expect(updatedRes.notBefore.eq(new BN(notBefore))).toBe(true);
        expect(updatedRes.notAfter.eq(new BN(newNotAfter))).toBe(true);
      });
    });
    describe("get authorization", () => {
      it("should revert if auth unknown", async () => {
        expect.assertions(0);
        const authorizedApplicationPublickey = "dStoreItMergEiIt564649798";
        // Create authorized app
        const authorizedPublickeyBytes = web3.utils.toHex(
          authorizedApplicationPublickey
        );
        const authPublicKeyId = ethers.utils.sha256(authorizedPublickeyBytes);
        const unknownAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            ["bytes32", "bytes32"],
            [
              ethers.utils.sha256(
                web3.utils.hexToBytes(web3.utils.toHex("applicationPublickey"))
              ),
              authPublicKeyId,
            ]
          )
        );
        await expectRevert(
          implV0.getAuthorizationById(unknownAuthorizationId, {
            from: acc1,
          }),
          "auth unknown"
        );
      });
      it("by Id", async () => {
        expect.assertions(9);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const authorizedApplicationName = "Storage API";
        const authorizedApplicationPublickey = "dStoreItMergEiIt564649798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.toHex(applicationPublickey);
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        const insertAppRcpt = await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        expectEvent(insertAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(applicationName),
          appId: publicKeyId,
          publicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });
        // Create authorized app
        const authorizedPublickeyBytes = web3.utils.toHex(
          authorizedApplicationPublickey
        );
        const insertAuthAppRcpt = await implV0.insertApp(
          authorizedApplicationName,
          domain,
          appAdministrator,
          authorizedPublickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const authPublicKeyId = ethers.utils.sha256(authorizedPublickeyBytes);
        expectEvent(insertAuthAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(authorizedApplicationName),
          appId: authPublicKeyId,
          publicKeyId: authPublicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });

        const iss = "did:ebsi:0x424242116F4C145c47C47022565D79E4df50bE90cb";
        const permissions = 15;
        const receipt = await implV0.insertAuthorization(
          applicationName,
          authorizedApplicationName,
          iss,
          status,
          permissions,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );

        const newAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            [
              "bytes32",
              "bytes32",
              "string",
              "uint8",
              "uint8",
              "uint256",
              "uint256",
            ],
            [
              publicKeyId,
              authPublicKeyId,
              iss,
              status,
              permissions,
              new BN(notBefore).toString(),
              new BN(notAfter).toString(),
            ]
          )
        );
        expectEvent(receipt, "AddNewAuthorization", {
          appId: publicKeyId,
          authorizedAppName: web3.utils.keccak256(authorizedApplicationName),
          authorizedAppId: authPublicKeyId,
          newAuthorizationId,
          status: "0",
          permissions: new BN(permissions),
          notBefore,
          notAfter,
        });
        const res = await implV0.getAuthorizationById(newAuthorizationId, {
          from: acc1,
        });

        expect(res.applicationId).toStrictEqual(publicKeyId);
        expect(res.authorizedAppId).toStrictEqual(authPublicKeyId);
        expect(res.name).toStrictEqual(applicationName);
        expect(res.authorizedAppName).toStrictEqual(authorizedApplicationName);
        expect(res.iss).toStrictEqual(iss);
        expect(res.status.eq(new BN(0))).toBe(true);
        expect(res.permissions.eq(new BN(permissions))).toBe(true);
        expect(res.notBefore.eq(new BN(notBefore))).toBe(true);
        expect(res.notAfter.eq(new BN(notAfter))).toBe(true);
        const unknownAuthorizationId = ethers.utils.sha256(
          web3.eth.abi.encodeParameters(
            ["bytes32", "bytes32"],
            [
              ethers.utils.sha256(
                web3.utils.hexToBytes(web3.utils.toHex("applicationPublickey"))
              ),
              authPublicKeyId,
            ]
          )
        );
        await expectRevert(
          implV0.getAuthorizationById(unknownAuthorizationId, {
            from: acc1,
          }),
          "auth unknown"
        );
      });
      it("getauthorizations should throw if app is unknown or appId null", async () => {
        expect.assertions(0);
        const appPubKey = "dStoreItMergEiIt564649798";
        // Create authorized app
        const appPubKeyBytes = web3.utils.toHex(appPubKey);
        const unknownAppId = ethers.utils.sha256(appPubKeyBytes);
        await expectRevert(
          implV0.getAuthorizations(unknownAppId, unknownAppId, 1, 1, {
            from: acc1,
          }),
          "appId unknown"
        );
        await expectRevert(
          implV0.getAuthorizations(constants.ZERO_BYTES32, unknownAppId, 1, 1, {
            from: acc1,
          }),
          "appId empty"
        );
      });
      it("getauthorizations should return empty when no authorized app", async () => {
        expect.assertions(5);
        const publickey = `data0`;
        const publickeyBytes = web3.utils.toHex(publickey);
        const authPublickey = `auth-data0`;
        const authPublickeyBytes = web3.utils.toHex(authPublickey);
        const authorizedAppId = ethers.utils.sha256(authPublickeyBytes);

        const applicationName = "Ledger API";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        const r1 = await implV0.getAuthorizations(
          publicKeyId,
          authorizedAppId,
          1,
          1,
          {
            from: acc1,
          }
        );
        expect(r1).toMatchObject({
          items: [],
        });
        expect(r1.total.toString()).toStrictEqual("0");
        expect(r1.howMany.toString()).toStrictEqual("0");
        expect(r1.prev.toString()).toStrictEqual("1");
        expect(r1.next.toString()).toStrictEqual("1");
      });
      it("getauthorizations should failed with wrong page size", async () => {
        expect.assertions(0);
        const publickey = `data0`;
        const publickeyBytes = web3.utils.toHex(publickey);
        const authPublickey = `auth-data0`;
        const authPublickeyBytes = web3.utils.toHex(authPublickey);

        const applicationId = ethers.utils.sha256(publickeyBytes);
        const authorizedAppId = ethers.utils.sha256(authPublickeyBytes);

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getAuthorizations.call(applicationId, authorizedAppId, 1, 0, {
            from: acc1,
          }),
          "PSize not >0"
        );
        // page  = 0 should revert
        await expectRevert(
          implV0.getAuthorizations.call(applicationId, authorizedAppId, 0, 2, {
            from: acc1,
          }),
          "Page not >0"
        );
        // pagesize > 50 should revert
        await expectRevert(
          implV0.getAuthorizations.call(applicationId, authorizedAppId, 1, 52, {
            from: acc1,
          }),
          "PSize not <= 50"
        );
      });
      it("should work with page==X and pagesize less than total", async () => {
        expect.assertions(24);
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const resAuthIds = [];
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));
        const permissions = 15;

        const applicationName = `0`;
        const publickey = `data0`;
        const publickeyBytes = web3.utils.toHex(publickey);
        const authAppName = `auth-0`;
        const authPublickey = `auth-data0`;
        const authPublickeyBytes = web3.utils.toHex(authPublickey);
        await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        await implV0.insertApp(
          authAppName,
          domain,
          appAdministrator,
          authPublickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const applicationId = ethers.utils.sha256(publickeyBytes);
        const authorizedAppId = ethers.utils.sha256(authPublickeyBytes);
        for (let i = 0; i < 11; i += 1) {
          const curApplicationName = `0`;
          const curAuthAppName = `auth-0`;
          const curIss = `issdata-${i}`;
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertAuthorization(
            curApplicationName,
            curAuthAppName,
            curIss,
            status,
            permissions,
            notBefore,
            notAfter,
            {
              from: acc1,
            }
          );
          resAuthIds.push(
            ethers.utils.sha256(
              web3.eth.abi.encodeParameters(
                [
                  "bytes32",
                  "bytes32",
                  "string",
                  "uint8",
                  "uint8",
                  "uint256",
                  "uint256",
                ],
                [
                  applicationId,
                  authorizedAppId,
                  curIss,
                  status,
                  permissions,
                  new BN(notBefore).toString(),
                  new BN(notAfter).toString(),
                ]
              )
            )
          );
        }
        // page = 3 and pagesize 2
        const r1 = await implV0.getAuthorizations.call(
          applicationId,
          authorizedAppId,
          3,
          2,
          {
            from: acc1,
          }
        );
        expect(r1.items).toHaveLength(2);
        expect(r1).toMatchObject({
          items: resAuthIds.slice(4, 6),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.howMany.toString()).toStrictEqual("2");
        expect(r1.prev.toString()).toStrictEqual("2");
        expect(r1.next.toString()).toStrictEqual("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getAuthorizations.call(
          applicationId,
          authorizedAppId,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(r2.items).toHaveLength(10);
        expect(r2).toMatchObject({
          items: resAuthIds.slice(0, 10),
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.howMany.toString()).toStrictEqual("10");
        expect(r2.prev.toString()).toStrictEqual("1");
        expect(r2.next.toString()).toStrictEqual("2");

        // page = 65456465 and pagesize 564646545645
        const r7 = await implV0.getAuthorizations.call(
          applicationId,
          authorizedAppId,
          65456465,
          50,
          {
            from: acc1,
          }
        );
        expect(r7.items).toHaveLength(0);
        expect(r7).toMatchObject({
          items: [],
        });
        expect(r7.total.toString()).toStrictEqual("11");
        expect(r7.howMany.toString()).toStrictEqual("0");
        expect(r7.prev.toString()).toStrictEqual("1");
        expect(r7.next.toString()).toStrictEqual("1");

        // page = 3 and pagesize 3
        const r9 = await implV0.getAuthorizations.call(
          applicationId,
          authorizedAppId,
          4,
          3,
          {
            from: acc1,
          }
        );
        expect(r9.items).toHaveLength(2);
        expect(r9).toMatchObject({
          items: resAuthIds.slice(9, 11),
        });
        expect(r9.total.toString()).toStrictEqual("11");
        expect(r9.howMany.toString()).toStrictEqual("2");
        expect(r9.prev.toString()).toStrictEqual("3");
        expect(r9.next.toString()).toStrictEqual("4");
      });
      it("get authorized app ids should work with page==X and pagesize less than total", async () => {
        expect.assertions(24);
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const resAuthAppIds = [];
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));
        const permissions = 15;
        const applicationName = `0`;
        const publickey = `data0`;
        const publickeyBytes = web3.utils.toHex(publickey);
        await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );

        for (let i = 0; i < 11; i += 1) {
          const curAppName = `auth-${i}`;
          const curPublickey = `auth-data${i}`;
          const curPublickeyBytes = web3.utils.toHex(curPublickey);

          // eslint-disable-next-line no-await-in-loop
          await implV0.insertApp(
            curAppName,
            domain,
            appAdministrator,
            curPublickeyBytes,
            status,
            notBefore,
            notAfter,
            {
              from: acc1,
            }
          );
        }
        const applicationId = ethers.utils.sha256(publickeyBytes);
        for (let i = 0; i < 11; i += 1) {
          const curApplicationName = `0`;
          const curAuthAppName = `auth-${i}`;
          const curIss = `issdata-${i}`;
          const curPublickey = `auth-data${i}`;
          const authPublickeyBytes = web3.utils.toHex(curPublickey);
          const authorizedAppId = ethers.utils.sha256(authPublickeyBytes);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertAuthorization(
            curApplicationName,
            curAuthAppName,
            curIss,
            status,
            permissions,
            notBefore,
            notAfter,
            {
              from: acc1,
            }
          );

          resAuthAppIds.push(authorizedAppId);
        }
        // page = 3 and pagesize 2
        const r1 = await implV0.getAuthorizedAppsIds.call(applicationId, 3, 2, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(2);
        expect(r1).toMatchObject({
          items: resAuthAppIds.slice(4, 6),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.howMany.toString()).toStrictEqual("2");
        expect(r1.prev.toString()).toStrictEqual("2");
        expect(r1.next.toString()).toStrictEqual("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getAuthorizedAppsIds.call(
          applicationId,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(r2.items).toHaveLength(10);
        expect(r2).toMatchObject({
          items: resAuthAppIds.slice(0, 10),
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.howMany.toString()).toStrictEqual("10");
        expect(r2.prev.toString()).toStrictEqual("1");
        expect(r2.next.toString()).toStrictEqual("2");

        // page = 65456465 and pagesize 564646545645
        const r7 = await implV0.getAuthorizedAppsIds.call(
          applicationId,
          65456465,
          50,
          {
            from: acc1,
          }
        );
        expect(r7.items).toHaveLength(0);
        expect(r7).toMatchObject({
          items: [],
        });
        expect(r7.total.toString()).toStrictEqual("11");
        expect(r7.howMany.toString()).toStrictEqual("0");
        expect(r7.prev.toString()).toStrictEqual("1");
        expect(r7.next.toString()).toStrictEqual("1");

        // page = 3 and pagesize 3
        const r9 = await implV0.getAuthorizedAppsIds.call(applicationId, 4, 3, {
          from: acc1,
        });
        expect(r9.items).toHaveLength(2);
        expect(r9).toMatchObject({
          items: resAuthAppIds.slice(9, 11),
        });
        expect(r9.total.toString()).toStrictEqual("11");
        expect(r9.howMany.toString()).toStrictEqual("2");
        expect(r9.prev.toString()).toStrictEqual("3");
        expect(r9.next.toString()).toStrictEqual("4");
      });
      it("apps by id should throw if app is unknown or appId null", async () => {
        expect.assertions(0);
        const appPubKey = "dStoreItMergEiIt564649798";
        // Create authorized app
        const appPubKeyBytes = web3.utils.toHex(appPubKey);
        const unknownAppId = ethers.utils.sha256(appPubKeyBytes);
        await expectRevert(
          implV0.getAuthorizedAppsIds(unknownAppId, 1, 1, {
            from: acc1,
          }),
          "appId unknown"
        );
        await expectRevert(
          implV0.getAuthorizedAppsIds(constants.ZERO_BYTES32, 1, 1, {
            from: acc1,
          }),
          "appId empty"
        );
      });
      it("apps by Id should return empty no authorized app", async () => {
        expect.assertions(5);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.toHex(applicationPublickey);
        const status = 0;
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        const insertAppRcpt = await implV0.insertApp(
          applicationName,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        );
        const publicKeyId = ethers.utils.sha256(publickeyBytes);

        expectEvent(insertAppRcpt, "ApplicationRegistered", {
          name: web3.utils.keccak256(applicationName),
          appId: publicKeyId,
          publicKeyId,
          domain: "1",
          appAdministrator,
          status: "0",
          notBefore,
          notAfter,
        });

        const r1 = await implV0.getAuthorizedAppsIds(publicKeyId, 1, 1, {
          from: acc1,
        });
        expect(r1).toMatchObject({
          items: [],
        });
        expect(r1.total.toString()).toStrictEqual("0");
        expect(r1.howMany.toString()).toStrictEqual("0");
        expect(r1.prev.toString()).toStrictEqual("1");
        expect(r1.next.toString()).toStrictEqual("1");
      });
    });
  });
});
