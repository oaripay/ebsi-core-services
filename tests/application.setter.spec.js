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

  describe("insert application administrator", () => {
    it("should revert for an empty appId or adminId", async () => {
      expect.assertions(0);

      await expectRevert(
        implV0.insertAppAdministrator([], "did:Administrator", {
          from: acc1,
        }),
        "appId empty"
      );
      await expectRevert(
        implV0.insertAppAdministrator([12], "", {
          from: acc1,
        }),
        "adminId empty"
      );
    });
    it("should revert when app is not found", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);

      await expectRevert(
        implV0.insertAppAdministrator(appId, "did:ebsi:0xadmin", {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should insert sucessfully", async () => {
      expect.assertions(4);

      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      const receipt = await implV0.insertApp(
        name,
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

      expectEvent(receipt, "ApplicationRegistered", {
        name: web3.utils.keccak256(name),
        appId,
        publicKeyId: appId,
        domain: "1",
        appAdministrator,
        status: "0",
        notBefore,
        notAfter,
      });
      const app = await implV0.getAppById(appId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);

      const rcptAdmin = await implV0.insertAppAdministrator(
        appId,
        "administratorId",
        {
          from: acc1,
        }
      );
      expectEvent(rcptAdmin, "ApplicationAdministratorAdded", {
        appId,
        adminHash: web3.utils.keccak256("administratorId"),
        administrator: "administratorId",
      });

      const rcptAppAdmins = await implV0.getAppAdministratorIds(appId, 1, 10, {
        from: acc1,
      });
      expect(rcptAppAdmins.items).toStrictEqual([
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb",
        "administratorId",
      ]);
      expect(rcptAppAdmins.total.eq(new BN(2))).toBe(true);
    });
  });
  describe("delete application administrator", () => {
    it("should revert for an appId or adminId", async () => {
      expect.assertions(0);

      await expectRevert(
        implV0.deleteAppAdministrator([], "did:Administrator", {
          from: acc1,
        }),
        "appId empty"
      );
      await expectRevert(
        implV0.deleteAppAdministrator([12], "", {
          from: acc1,
        }),
        "adminId empty"
      );
    });
    it("should revert when app is not found", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);

      await expectRevert(
        implV0.deleteAppAdministrator(appId, "did:ebsi:0xadmin", {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should revert when admin is not found", async () => {
      expect.assertions(4);

      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      await implV0.insertApp(
        name,
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

      const beginAppAdmins = await implV0.getAppAdministratorIds(appId, 1, 10, {
        from: acc1,
      });
      expect(beginAppAdmins.items).toStrictEqual([appAdministrator]);
      expect(beginAppAdmins.total.eq(new BN(1))).toBe(true);
      await expectRevert(
        implV0.deleteAppAdministrator(appId, "did:ebsi:0xDONOTEXIST", {
          from: acc1,
        }),
        "no admin"
      );

      const rcptAppAdmins = await implV0.getAppAdministratorIds(appId, 1, 10, {
        from: acc1,
      });
      expect(rcptAppAdmins.items).toStrictEqual([appAdministrator]);
      expect(rcptAppAdmins.total.eq(new BN(1))).toBe(true);
    });
    it("should delete sucessfully", async () => {
      expect.assertions(4);

      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      const receipt = await implV0.insertApp(
        name,
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

      expectEvent(receipt, "ApplicationRegistered", {
        name: web3.utils.keccak256(name),
        appId,
        publicKeyId: appId,
        domain: "1",
        appAdministrator,
        status: "0",
        notBefore,
        notAfter,
      });
      const app = await implV0.getAppById(appId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);

      const rcptAdmin = await implV0.deleteAppAdministrator(
        appId,
        appAdministrator,
        {
          from: acc1,
        }
      );
      expectEvent(rcptAdmin, "ApplicationAdministratorDeleted", {
        appId,
        adminHash: web3.utils.keccak256(appAdministrator),
        administrator: appAdministrator,
      });

      const rcptAppAdmins = await implV0.getAppAdministratorIds(appId, 1, 10, {
        from: acc1,
      });
      expect(rcptAppAdmins.items).toStrictEqual([]);
      expect(rcptAppAdmins.total.eq(new BN(0))).toBe(true);
    });
  });
  describe("insert application", () => {
    it("should revert for an empty name or publickKey", async () => {
      expect.assertions(0);
      const name = "";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      await expectRevert(
        implV0.insertApp(
          name,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        ),
        "name empty"
      );
      await expectRevert(
        implV0.insertApp(
          "the App",
          domain,
          appAdministrator,
          [],
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        ),
        "pubkey null"
      );
    });
    it("should revert if app is already registered", async () => {
      expect.assertions(0);

      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      await implV0.insertApp(
        name,
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

      await expectRevert(
        implV0.insertApp(
          name,
          domain,
          appAdministrator,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        ),
        "name exists"
      );
    });
    it("should insert sucessfully", async () => {
      expect.assertions(2);

      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));
      const receipt = await implV0.insertApp(
        name,
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

      expectEvent(receipt, "ApplicationRegistered", {
        name: web3.utils.keccak256(name),
        appId: publicKeyId,
        publicKeyId,
        domain: "1",
        appAdministrator,
        status: "0",
        notBefore,
        notAfter,
      });
      const app = await implV0.getAppById(publicKeyId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);
    });
  });
  describe("insert application info", () => {
    it("should revert for an empty appId or info", async () => {
      expect.assertions(0);
      const info = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const infoBytes = web3.utils.hexToBytes(web3.utils.toHex(info));

      const appId = ethers.utils.sha256(infoBytes);
      await expectRevert(
        implV0.insertAppInfo(appId, [], {
          from: acc1,
        }),
        "info empty"
      );
      await expectRevert(
        implV0.insertAppInfo([], infoBytes, {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should revert if info is already registered", async () => {
      expect.assertions(0);
      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      await implV0.insertApp(
        name,
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
      const info =
        "important info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss out ";
      const infoBytes = web3.utils.hexToBytes(web3.utils.toHex(info));
      await implV0.insertAppInfo(appId, infoBytes, {
        from: acc1,
      });

      await expectRevert(
        implV0.insertAppInfo(appId, infoBytes, {
          from: acc1,
        }),
        "info exists"
      );
    });
    it("should insert sucessfully", async () => {
      expect.assertions(1);
      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));
      await implV0.insertApp(
        name,
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
      const info =
        "important info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss outimportant info that you don't want to miss out ";
      const infoBytes = web3.utils.hexToBytes(web3.utils.toHex(info));
      const receipt = await implV0.insertAppInfo(appId, infoBytes, {
        from: acc1,
      });
      expectEvent(receipt, "ApplicationInfoUpdated", {
        appId,
        infoId: ethers.utils.sha256(infoBytes),
        info: web3.utils.toHex(info),
      });

      const res = await implV0.getAppInfo(appId, {
        from: acc1,
      });

      expect(res).toStrictEqual(web3.utils.toHex(info));
    });
  });
  describe("update application", () => {
    it("should revert for empty appid or name", async () => {
      expect.assertions(0);
      const name = "";
      const domain = 1;
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));

      const appId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.updateApp(appId, name, domain, {
          from: acc1,
        }),
        "name empty"
      );
      await expectRevert(
        implV0.updateApp([], "yoolo", domain, {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should revert if app is already registered", async () => {
      expect.assertions(0);

      const name = "Ledger API";
      const domain = 1;
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));

      const appId = ethers.utils.sha256(publickeyBytes);

      await expectRevert(
        implV0.updateApp(appId, name, domain, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should update sucessfully", async () => {
      expect.assertions(4);
      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      const receipt = await implV0.insertApp(
        name,
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

      expectEvent(receipt, "ApplicationRegistered", {
        name: web3.utils.keccak256(name),
        appId: publicKeyId,
        publicKeyId,
        domain: "1",
        appAdministrator,
        status: "0",
        notBefore,
        notAfter,
      });
      const app = await implV0.getAppById(publicKeyId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);
      const newName = "The Big Ledger API";
      const newDomain = 0;
      const receiptUpdate = await implV0.updateApp(
        publicKeyId,
        newName,
        newDomain,
        {
          from: acc1,
        }
      );

      const updatedApp = await implV0.getAppById(publicKeyId, {
        from: acc1,
      });
      expect(updatedApp.name).toStrictEqual(newName);
      expect(updatedApp.domain.eq(new BN(0))).toBe(true);
      expectEvent(receiptUpdate, "ApplicationUpdated", {
        newName: web3.utils.keccak256(newName),
        oldName: web3.utils.keccak256(name),
        appId: publicKeyId,
        oldDomain: "1",
        newDomain: "0",
      });
    });
  });
  describe("insert application publicKey", () => {
    it("should revert for an empty publickKey", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      await expectRevert(
        implV0.insertAppPublicKey(appId, [], status, notBefore, notAfter, {
          from: acc1,
        }),
        "pubkey null"
      );
    });
    it("should revert if app is already registered", async () => {
      expect.assertions(2);
      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      const receipt = await implV0.insertApp(
        name,
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

      expectEvent(receipt, "ApplicationRegistered", {
        name: web3.utils.keccak256(name),
        appId: publicKeyId,
        publicKeyId,
        domain: "1",
        appAdministrator,
        status: "0",
        notBefore,
        notAfter,
      });
      const app = await implV0.getAppById(publicKeyId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);

      await expectRevert(
        implV0.insertAppPublicKey(
          publicKeyId,
          publickeyBytes,
          status,
          notBefore,
          notAfter,
          {
            from: acc1,
          }
        ),
        "pubkey exists"
      );
    });
    it("should insert sucessfully", async () => {
      expect.assertions(10);
      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      const receipt = await implV0.insertApp(
        name,
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

      expectEvent(receipt, "ApplicationRegistered", {
        name: web3.utils.keccak256(name),
        appId: publicKeyId,
        publicKeyId,
        domain: "1",
        appAdministrator,
        status: "0",
        notBefore,
        notAfter,
      });
      const app = await implV0.getAppById(publicKeyId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);
      const newStatus = 1;
      const newNotBefore = (await time.latest()).add(time.duration.weeks(2));
      const newNotAfter = newNotBefore.add(time.duration.years(2));
      const newPublickey = "this is a brand new pubKey haters gonna hate";
      const newPublickeyBytes = web3.utils.hexToBytes(
        web3.utils.toHex(newPublickey)
      );
      const newPublicKeyId = ethers.utils.sha256(newPublickeyBytes);
      const receiptPubKey = await implV0.insertAppPublicKey(
        publicKeyId,
        newPublickeyBytes,
        newStatus,
        newNotBefore,
        newNotAfter,
        {
          from: acc1,
        }
      );
      expectEvent(receiptPubKey, "PublicKeyAdded", {
        appId: publicKeyId,
        publicKeyId: newPublicKeyId,
        status: "1",
        notBefore: newNotBefore,
        notAfter: newNotAfter,
      });

      const appBasedOnPubK = await implV0.getAppByPublicKeyId(newPublicKeyId, {
        from: acc1,
      });
      expect(appBasedOnPubK.name).toStrictEqual(name);
      expect(appBasedOnPubK.domain.eq(new BN(1))).toBe(true);
      expect(appBasedOnPubK.applicationId).toStrictEqual(publicKeyId);
      const newPubK = await implV0.getPublicKey(newPublicKeyId, {
        from: acc1,
      });

      expect(newPubK.appId).toStrictEqual(publicKeyId);
      expect(newPubK.publicKey).toStrictEqual(web3.utils.toHex(newPublickey));
      expect(newPubK.status.eq(new BN(1))).toBe(true);
      expect(newPubK.notBefore.eq(newNotBefore)).toBe(true);
      expect(newPubK.notAfter.eq(newNotAfter)).toBe(true);
    });
  });
  describe("update application publicKey", () => {
    it("should revert for an empty publickKey", async () => {
      expect.assertions(0);
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      await expectRevert(
        implV0.updateAppPublicKey([], status, notAfter, {
          from: acc1,
        }),
        "pubKeyId null"
      );
    });
    it("should revert if publickKey does not exist", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));
      const publicKeyId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.updateAppPublicKey(publicKeyId, status, notAfter, {
          from: acc1,
        }),
        "pubKeyId unknown"
      );
    });
    it("should update sucessfully", async () => {
      expect.assertions(7);
      const name = "Ledger API";
      const domain = 1;
      const appAdministrator =
        "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));
      await implV0.insertApp(
        name,
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

      const app = await implV0.getAppById(publicKeyId, {
        from: acc1,
      });
      expect(app.name).toStrictEqual(name);
      expect(app.domain.eq(new BN(1))).toBe(true);
      const newStatus = 1;
      const newNotBefore = (await time.latest()).add(time.duration.weeks(2));
      const newNotAfter = newNotBefore.add(time.duration.years(2));
      const receiptPubKey = await implV0.updateAppPublicKey(
        publicKeyId,
        newStatus,
        newNotAfter,
        {
          from: acc1,
        }
      );
      expectEvent(receiptPubKey, "PublicKeyUpdated", {
        publicKeyId,
        status: "1",
        notAfter: newNotAfter,
      });

      const newPubK = await implV0.getPublicKey(publicKeyId, {
        from: acc1,
      });
      expect(newPubK.appId).toStrictEqual(publicKeyId);
      expect(newPubK.publicKey).toStrictEqual(web3.utils.toHex(publickey));
      expect(newPubK.status.eq(new BN(1))).toBe(true);
      expect(newPubK.notBefore.eq(notBefore)).toBe(true);
      expect(newPubK.notAfter.eq(newNotAfter)).toBe(true);
    });
  });
});
