const {
  BN, // Big Number support
  time,
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

  describe("revocation CRUD", () => {
    describe("insert revocation", () => {
      it("should revert for an unknown app", async () => {
        expect.assertions(0);
        const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const publickeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(publickey)
        );
        const appId = ethers.utils.sha256(publickeyBytes);
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        await expectRevert(
          implV0.insertRevocation(appId, "did:Administrator", notBefore, {
            from: acc1,
          }),
          "appId unknown"
        );
      });
      it("should revert for an empty appId or revokedBy", async () => {
        expect.assertions(0);
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        await expectRevert(
          implV0.insertRevocation([], "did:Administrator", notBefore, {
            from: acc1,
          }),
          "appId empty"
        );
        await expectRevert(
          implV0.insertRevocation([12], "", notBefore, {
            from: acc1,
          }),
          "revokedBy empty"
        );
      });
      it("should revert if revocation already exists", async () => {
        expect.assertions(0);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(applicationPublickey)
        );
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
        const appId = ethers.utils.sha256(publickeyBytes);

        // Create a revocation

        const receipt = await implV0.insertRevocation(
          appId,
          appAdministrator,
          notBefore,
          {
            from: acc1,
          }
        );

        expectEvent(receipt, "AddNewRevocation", {
          appId,
          revokedByHash: web3.utils.keccak256(appAdministrator),
          revokedBy: appAdministrator,

          notBefore,
        });

        await expectRevert(
          implV0.insertRevocation(appId, appAdministrator, notBefore, {
            from: acc1,
          }),
          "appId revoked"
        );
      });
      it("should succeed", async () => {
        expect.assertions(2);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(applicationPublickey)
        );
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
        const appId = ethers.utils.sha256(publickeyBytes);

        // Create a revocation
        const receipt = await implV0.insertRevocation(
          appId,
          appAdministrator,
          notBefore,
          {
            from: acc1,
          }
        );
        expectEvent(receipt, "AddNewRevocation", {
          appId,
          revokedByHash: web3.utils.keccak256(appAdministrator),
          revokedBy: appAdministrator,
          notBefore,
        });

        const rev = await implV0.getRevocation(appId, {
          from: acc1,
        });
        expect(rev.revokedBy).toStrictEqual(appAdministrator);
        expect(rev.notBefore.eq(new BN(notBefore))).toBe(true);
      });
    });
    describe("get revocation", () => {
      it("should revert for an empty appId or unknown revocation", async () => {
        expect.assertions(0);

        await expectRevert(
          implV0.getRevocation([], {
            from: acc1,
          }),
          "appId empty"
        );
        await expectRevert(
          implV0.getRevocation([12], {
            from: acc1,
          }),
          "revocation unknown"
        );
      });
      it("should succeed", async () => {
        expect.assertions(4);
        const applicationName = "Ledger API";
        const applicationPublickey =
          "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        // Create app
        const domain = 1;
        const appAdministrator =
          "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const publickeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(applicationPublickey)
        );
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
        const appId = ethers.utils.sha256(publickeyBytes);

        // Create a revocation
        const receipt = await implV0.insertRevocation(
          appId,
          appAdministrator,
          notBefore,
          {
            from: acc1,
          }
        );
        expectEvent(receipt, "AddNewRevocation", {
          appId,
          revokedByHash: web3.utils.keccak256(appAdministrator),
          revokedBy: appAdministrator,
          notBefore,
        });

        const rev = await implV0.getRevocation(appId, {
          from: acc1,
        });
        expect(rev.revokedBy).toStrictEqual(appAdministrator);
        expect(rev.notBefore.eq(new BN(notBefore))).toBe(true);

        const app2Name = "Timestamp API";
        const app2Publickey = "1231fd321fs31f3ds13f1ds31f3sd1f3s21";
        // Create app
        const app2Administrator = "did:ebsi:0xapp2admin";

        const app2pubkeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(app2Publickey)
        );
        const notBefore2 = (await time.latest()).add(time.duration.weeks(1));
        const notAfter2 = notBefore.add(time.duration.years(1));

        await implV0.insertApp(
          app2Name,
          domain,
          app2Administrator,
          app2pubkeyBytes,
          status,
          notBefore2,
          notAfter2,
          {
            from: acc1,
          }
        );
        const app2Id = ethers.utils.sha256(app2pubkeyBytes);
        const revoker = "did:ebsi:0xIrevokethereforeIam";
        // Create a revocation
        const receipt2 = await implV0.insertRevocation(
          app2Id,
          revoker,
          notBefore2,
          {
            from: acc1,
          }
        );
        expectEvent(receipt2, "AddNewRevocation", {
          appId: app2Id,
          revokedByHash: web3.utils.keccak256(revoker),
          revokedBy: revoker,
          notBefore: notBefore2,
        });

        const rev2 = await implV0.getRevocation(app2Id, {
          from: acc1,
        });
        expect(rev2.revokedBy).toStrictEqual(revoker);
        expect(rev2.notBefore.eq(new BN(notBefore2))).toBe(true);
      });
    });
  });
});
