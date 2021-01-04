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
    await AuthLib.detectNetwork();
    await AuthLib.link("Pagination", paginationLib.address);
    const authLib = await AuthLib.new();
    const authStoreLib = await AuthStoreLib.new();

    await RevocationLib.detectNetwork();
    const revocationLib = await RevocationLib.new();
    const revocationStoreLib = await RevocationStoreLib.new();

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
  describe("getAppAdministratorIds", () => {
    it("should failed if app not registered", async () => {
      expect.assertions(0);
      const publickey = `publickey0`;
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getAppAdministratorIds.call(appId, 1, 1, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should failed if appId is empty", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppAdministratorIds.call([], 1, 1, {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should failed with wrong page size", async () => {
      expect.assertions(0);
      const name = `Ledger API`;
      const domain = 1;
      const appAdministrator = `did:ebsi:0xadmin`;

      const publickey = `publickey0`;
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

      // pagesize = 0 should revert
      await expectRevert(
        implV0.getAppAdministratorIds.call(appId, 1, 0, {
          from: acc1,
        }),
        "PSize not >0"
      );
      // page  = 0 should revert
      await expectRevert(
        implV0.getAppAdministratorIds.call(appId, 0, 10, {
          from: acc1,
        }),
        "Page not >0"
      );

      // pagesize > 50 should revert
      await expectRevert(
        implV0.getAppAdministratorIds.call(appId, 1, 52, {
          from: acc1,
        }),
        "PSize not <= 50"
      );
    });
    it("should work with page==X and pagesize eq total", async () => {
      expect.assertions(24);
      const name = `Ledger API`;
      const domain = 1;
      const appAdministrator = `did:ebsi:0xadmin`;

      const publickey = `publickey0`;
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
      let resAdmins = [appAdministrator];
      // page = 1 and pagesize is equal to the total
      const r0 = await implV0.getAppAdministratorIds.call(appId, 1, 11, {
        from: acc1,
      });
      expect(r0.items).toHaveLength(1);
      expect(r0).toMatchObject({
        items: resAdmins,
      });
      expect(r0.total.toString()).toStrictEqual("1");
      expect(r0.howMany.toString()).toStrictEqual("1");
      expect(r0.prev.toString()).toStrictEqual("1");
      expect(r0.next.toString()).toStrictEqual("1");

      for (let i = 0; i < 11; i += 1) {
        const administrator = `did:Admin-${i}`;
        // INSERT SHOULD BE DONE IN ORDER !!!
        // eslint-disable-next-line no-await-in-loop
        const receiptAdd = await implV0.insertAppAdministrator(
          appId,
          administrator,
          {
            from: acc1,
          }
        );
        expectEvent(receiptAdd, "ApplicationAdministratorAdded", {
          appId,
          adminHash: web3.utils.keccak256(administrator),
          administrator,
        });
        resAdmins = [...resAdmins, administrator];
      }
      // page = 1 and pagesize is less to the total
      const r = await implV0.getAppAdministratorIds.call(appId, 1, 11, {
        from: acc1,
      });
      expect(r.items).toHaveLength(11);
      expect(r).toMatchObject({
        items: resAdmins.slice(0, 11),
      });
      expect(r.total.toString()).toStrictEqual("12");
      expect(r.howMany.toString()).toStrictEqual("11");

      expect(r.prev.toString()).toStrictEqual("1");
      expect(r.next.toString()).toStrictEqual("2");

      // page = 1 and pagesize is equal to the total
      const r1 = await implV0.getAppAdministratorIds.call(appId, 1, 12, {
        from: acc1,
      });
      expect(r1.items).toHaveLength(12);
      expect(r1).toMatchObject({
        items: resAdmins,
      });
      expect(r1.total.toString()).toStrictEqual("12");

      expect(r1.howMany.toString()).toStrictEqual("12");

      expect(r1.prev.toString()).toStrictEqual("1");
      expect(r1.next.toString()).toStrictEqual("1");

      const r2 = await implV0.getAppAdministratorIds.call(appId, 5, 11, {
        from: acc1,
      });
      expect(r2.items).toHaveLength(0);
      expect(r2).toMatchObject({
        items: [],
      });
      expect(r2.total.toString()).toStrictEqual("12");
      expect(r2.howMany.toString()).toStrictEqual("0");
      expect(r2.prev.toString()).toStrictEqual("2");
      expect(r2.next.toString()).toStrictEqual("2");
    });
  });
  describe("getAppInfoByInfoId", () => {
    it("should revert for an empty infoId", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppInfoByInfoId([], {
          from: acc1,
        }),
        "infoId empty"
      );
    });
    it("should revert for a not existing info", async () => {
      expect.assertions(0);
      const info = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const infoBytes = web3.utils.hexToBytes(web3.utils.toHex(info));
      const infoId = ethers.utils.sha256(infoBytes);
      await expectRevert(
        implV0.getAppInfoByInfoId(infoId, {
          from: acc1,
        }),
        "info empty"
      );
    });
    it("should revert when there is no info for an app", async () => {
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
      await expectRevert(
        implV0.getAppInfoByInfoId(appId, {
          from: acc1,
        }),
        "info empty"
      );
    });
    it("should succeed", async () => {
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
      const infoId = ethers.utils.sha256(infoBytes);
      await implV0.insertAppInfo(appId, infoBytes, {
        from: acc1,
      });
      const res = await implV0.getAppInfoByInfoId(infoId, {
        from: acc1,
      });
      expect(res).toStrictEqual(web3.utils.toHex(info));
    });
  });
  describe("getAppInfoIds", () => {
    it("should failed if app not registered", async () => {
      expect.assertions(0);
      const publickey = `publickey0`;
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getAppInfoIds.call(appId, 1, 1, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should failed if appId is empty", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppInfoIds.call([], 1, 1, {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should failed with wrong page size", async () => {
      expect.assertions(0);
      const name = `Ledger API`;
      const domain = 1;
      const appAdministrator = `did:ebsi:0xadmin`;

      const publickey = `publickey0`;
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

      // pagesize = 0 should revert
      await expectRevert(
        implV0.getAppInfoIds.call(appId, 1, 0, {
          from: acc1,
        }),
        "PSize not >0"
      );
      // page  = 0 should revert
      await expectRevert(
        implV0.getAppInfoIds.call(appId, 0, 10, {
          from: acc1,
        }),
        "Page not >0"
      );

      // pagesize > 50 should revert
      await expectRevert(
        implV0.getAppInfoIds.call(appId, 1, 52, {
          from: acc1,
        }),
        "PSize not <= 50"
      );
    });
    it("should work with page==X and pagesize eq total", async () => {
      expect.assertions(18);
      const name = `Ledger API`;
      const domain = 1;
      const appAdministrator = `did:ebsi:0xadmin`;

      const publickey = `publickey0`;
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
      let resInfoIds = [];
      for (let i = 0; i < 11; i += 1) {
        const info = `info-${i}`;
        const infoBytes = web3.utils.hexToBytes(web3.utils.toHex(info));
        const infoId = ethers.utils.sha256(infoBytes);

        // INSERT SHOULD BE DONE IN ORDER !!!
        // eslint-disable-next-line no-await-in-loop
        const receiptAddInfo = await implV0.insertAppInfo(appId, infoBytes, {
          from: acc1,
        });
        expectEvent(receiptAddInfo, "ApplicationInfoUpdated", {
          appId,
          infoId,
          info: web3.utils.toHex(info),
        });
        resInfoIds = [...resInfoIds, infoId];
      }
      // page = 1 and pagesize is equal to the total
      const r = await implV0.getAppInfoIds.call(appId, 1, 11, {
        from: acc1,
      });
      expect(r.items).toHaveLength(11);
      expect(r).toMatchObject({
        items: resInfoIds,
      });
      expect(r.total.toString()).toStrictEqual("11");
      expect(r.howMany.toString()).toStrictEqual("11");
      expect(r.prev.toString()).toStrictEqual("1");
      expect(r.next.toString()).toStrictEqual("1");

      // page = 1 and pagesize is less to the total
      const r1 = await implV0.getAppInfoIds.call(appId, 1, 6, {
        from: acc1,
      });
      expect(r1.items).toHaveLength(6);
      expect(r1).toMatchObject({
        items: resInfoIds.slice(0, 6),
      });
      expect(r1.total.toString()).toStrictEqual("11");
      expect(r1.howMany.toString()).toStrictEqual("6");
      expect(r1.prev.toString()).toStrictEqual("1");
      expect(r1.next.toString()).toStrictEqual("2");

      const r2 = await implV0.getAppInfoIds.call(appId, 5, 11, {
        from: acc1,
      });
      expect(r2.items).toHaveLength(0);
      expect(r2).toMatchObject({
        items: [],
      });
      expect(r2.total.toString()).toStrictEqual("11");
      expect(r2.howMany.toString()).toStrictEqual("0");
      expect(r2.prev.toString()).toStrictEqual("1");
      expect(r2.next.toString()).toStrictEqual("1");
    });
  });
  describe("getAppPublicKeyIds", () => {
    it("should failed if appid is empty", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppPublicKeyIds.call([], 1, 1, {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should failed if app not registered", async () => {
      expect.assertions(0);
      const publickey = `publickey0`;
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getAppPublicKeyIds.call(appId, 1, 1, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should failed with wrong page size", async () => {
      expect.assertions(0);
      const name = `Ledger API`;
      const domain = 1;
      const appAdministrator = `did:ebsi:0xadmin`;

      const publickey = `publickey0`;
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
      // pagesize = 0 should revert
      await expectRevert(
        implV0.getAppPublicKeyIds.call(appId, 1, 0, {
          from: acc1,
        }),
        "PSize not >0"
      );
      // page  = 0 should revert
      await expectRevert(
        implV0.getAppPublicKeyIds.call(appId, 0, 10, {
          from: acc1,
        }),
        "Page not >0"
      );

      // pagesize > 50 should revert
      await expectRevert(
        implV0.getAppPublicKeyIds.call(appId, 1, 52, {
          from: acc1,
        }),
        "PSize not <= 50"
      );
    });
    it("should work with page==X and pagesize eq total", async () => {
      expect.assertions(24);
      const name = `Ledger API`;
      const domain = 1;
      const appAdministrator = `did:ebsi:0xadmin`;

      const publickey = `publickey0`;
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const status = 0;
      const notBefore = (await time.latest()).add(time.duration.weeks(1));
      const notAfter = notBefore.add(time.duration.years(1));

      const appReceipt = await implV0.insertApp(
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
      expectEvent(appReceipt, "PublicKeyAdded", {
        appId,
        publicKeyId: appId,
        status: "0",
        notBefore,
        notAfter,
      });
      let resPubKeys = [appId];

      // page = 1 and pagesize is equal to the total
      const r0 = await implV0.getAppPublicKeyIds.call(appId, 1, 11, {
        from: acc1,
      });
      expect(r0.items).toHaveLength(1);
      expect(r0).toMatchObject({
        items: resPubKeys,
      });
      expect(r0.total.toString()).toStrictEqual("1");
      expect(r0.howMany.toString()).toStrictEqual("1");
      expect(r0.prev.toString()).toStrictEqual("1");
      expect(r0.next.toString()).toStrictEqual("1");

      for (let i = 0; i < 11; i += 1) {
        const newStatus = 1;
        // eslint-disable-next-line no-await-in-loop
        const newNotBefore = (await time.latest()).add(time.duration.weeks(2));
        const newNotAfter = newNotBefore.add(time.duration.years(2));
        const newPublickey = `pubkey${i}`;
        const newPublickeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(newPublickey)
        );
        const newPublicKeyId = ethers.utils.sha256(newPublickeyBytes);

        // INSERT SHOULD BE DONE IN ORDER !!!
        // eslint-disable-next-line no-await-in-loop
        const receiptPubKey = await implV0.insertAppPublicKey(
          appId,
          newPublickeyBytes,
          newStatus,
          newNotBefore,
          newNotAfter,
          {
            from: acc1,
          }
        );
        expectEvent(receiptPubKey, "PublicKeyAdded", {
          appId,
          publicKeyId: newPublicKeyId,
          status: "1",
          notBefore: newNotBefore,
          notAfter: newNotAfter,
        });

        resPubKeys = [...resPubKeys, newPublicKeyId];
      }
      // page = 1 and pagesize is less to the total
      const r = await implV0.getAppPublicKeyIds.call(appId, 1, 11, {
        from: acc1,
      });
      expect(r.items).toHaveLength(11);
      expect(r).toMatchObject({
        items: resPubKeys.slice(0, 11),
      });
      expect(r.total.toString()).toStrictEqual("12");
      expect(r.howMany.toString()).toStrictEqual("11");

      expect(r.prev.toString()).toStrictEqual("1");
      expect(r.next.toString()).toStrictEqual("2");

      // page = 1 and pagesize is equal to the total
      const r1 = await implV0.getAppPublicKeyIds.call(appId, 1, 12, {
        from: acc1,
      });
      expect(r1.items).toHaveLength(12);
      expect(r1).toMatchObject({
        items: resPubKeys,
      });
      expect(r1.total.toString()).toStrictEqual("12");

      expect(r1.howMany.toString()).toStrictEqual("12");

      expect(r1.prev.toString()).toStrictEqual("1");
      expect(r1.next.toString()).toStrictEqual("1");

      const r2 = await implV0.getAppPublicKeyIds.call(appId, 5, 11, {
        from: acc1,
      });
      expect(r2.items).toHaveLength(0);
      expect(r2).toMatchObject({
        items: [],
      });
      expect(r2.total.toString()).toStrictEqual("12");
      expect(r2.howMany.toString()).toStrictEqual("0");
      expect(r2.prev.toString()).toStrictEqual("2");
      expect(r2.next.toString()).toStrictEqual("2");
    });
  });
  describe("getAppById", () => {
    it("should revert for an empty appId", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppById([], {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should revert for an unknown app", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getAppById(appId, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should succeed", async () => {
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
  describe("getAppInfo", () => {
    it("should revert for an empty appId", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppInfo([], {
          from: acc1,
        }),
        "appId empty"
      );
    });
    it("should revert for an unknown app", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const appId = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getAppInfo(appId, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should revert when there is no info for an app", async () => {
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
      await expectRevert(
        implV0.getAppInfo(appId, {
          from: acc1,
        }),
        "info empty"
      );
    });
    it("should succeed", async () => {
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
      await implV0.insertAppInfo(appId, infoBytes, {
        from: acc1,
      });
      const res = await implV0.getAppInfo(appId, {
        from: acc1,
      });
      expect(res).toStrictEqual(web3.utils.toHex(info));
    });
  });
  describe("getAppByPublicKeyId", () => {
    it("should revert for an empty pubKeyId", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getAppByPublicKeyId([], {
          from: acc1,
        }),
        "pubKeyId null"
      );
    });
    it("should revert for an unknown app", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const publicKey = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getAppByPublicKeyId(publicKey, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should succeed", async () => {
      expect.assertions(6);
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
      const pubK = await implV0.getAppByPublicKeyId(publicKeyId, {
        from: acc1,
      });
      expect(pubK.applicationId).toStrictEqual(publicKeyId);
      expect(pubK.name).toStrictEqual(name);
      expect(pubK.domain.eq(new BN(1))).toBe(true);

      const newStatus = 1;
      const newNotBefore = (await time.latest()).add(time.duration.weeks(2));
      const newNotAfter = newNotBefore.add(time.duration.years(2));
      const newPublickey = "this is a brand new pubKey haters gonna hate";
      const newPublickeyBytes = web3.utils.hexToBytes(
        web3.utils.toHex(newPublickey)
      );
      const newPublicKeyId = ethers.utils.sha256(newPublickeyBytes);
      await implV0.insertAppPublicKey(
        publicKeyId,
        newPublickeyBytes,
        newStatus,
        newNotBefore,
        newNotAfter,
        {
          from: acc1,
        }
      );
      const newPubK = await implV0.getAppByPublicKeyId(newPublicKeyId, {
        from: acc1,
      });
      expect(newPubK.applicationId).toStrictEqual(publicKeyId);
      expect(newPubK.name).toStrictEqual(name);
      expect(pubK.domain.eq(new BN(1))).toBe(true);
    });
  });
  describe("getAppByName", () => {
    it("should revert for an empty name", async () => {
      expect.assertions(0);
      const name = "";

      await expectRevert(
        implV0.getAppByName(name, {
          from: acc1,
        }),
        "name empty"
      );
    });
    it("should revert for an unknown app", async () => {
      expect.assertions(0);
      const name = "yolo";

      await expectRevert(
        implV0.getAppByName(name, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should succeed", async () => {
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
      const app = await implV0.getAppByName(name, {
        from: acc1,
      });
      expect(app.applicationId).toStrictEqual(publicKeyId);
      expect(app.domain.eq(new BN(1))).toBe(true);
    });
  });
  describe("getApps", () => {
    it("should failed with wrong page size", async () => {
      expect.assertions(0);
      // pagesize = 0 should revert
      await expectRevert(
        implV0.getApps.call(1, 0, {
          from: acc1,
        }),
        "PSize not >0"
      );
      // page  = 0 should revert
      await expectRevert(
        implV0.getApps.call(0, 10, {
          from: acc1,
        }),
        "Page not >0"
      );

      // pagesize > 50 should revert
      await expectRevert(
        implV0.getApps.call(1, 52, {
          from: acc1,
        }),
        "PSize not <= 50"
      );
    });
    it("should work with page==X and pagesize eq total", async () => {
      expect.assertions(12);
      let resAppIds = [];
      for (let i = 0; i < 11; i += 1) {
        const name = `${i}`;
        const domain = 1;
        const appAdministrator = `did:ebsi:0xadmin${i}`;

        const publickey = `publickey${i}`;
        const publickeyBytes = web3.utils.hexToBytes(
          web3.utils.toHex(publickey)
        );
        const status = 0;
        // eslint-disable-next-line no-await-in-loop
        const notBefore = (await time.latest()).add(time.duration.weeks(1));
        const notAfter = notBefore.add(time.duration.years(1));

        // INSERT SHOULD BE DONE IN ORDER !!!
        // eslint-disable-next-line no-await-in-loop
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
        resAppIds = [...resAppIds, appId];
      }
      // page = 1 and pagesize is equal to the total
      const r = await implV0.getApps.call(1, 11, {
        from: acc1,
      });
      expect(r.items).toHaveLength(11);
      expect(r).toMatchObject({
        items: resAppIds,
      });
      expect(r.total.toString()).toStrictEqual("11");
      expect(r.howMany.toString()).toStrictEqual("11");
      expect(r.prev.toString()).toStrictEqual("1");
      expect(r.next.toString()).toStrictEqual("1");

      const r1 = await implV0.getApps.call(5, 11, {
        from: acc1,
      });
      expect(r1.items).toHaveLength(0);
      expect(r1).toMatchObject({
        items: [],
      });
      expect(r1.total.toString()).toStrictEqual("11");
      expect(r1.howMany.toString()).toStrictEqual("0");
      expect(r1.prev.toString()).toStrictEqual("1");
      expect(r1.next.toString()).toStrictEqual("1");
    });
  });
  describe("getPublicKey", () => {
    it("should revert for an empty pubKeyId", async () => {
      expect.assertions(0);
      await expectRevert(
        implV0.getPublicKey([], {
          from: acc1,
        }),
        "pubKeyId null"
      );
    });
    it("should revert for an unknown app", async () => {
      expect.assertions(0);
      const publickey = "dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const publickeyBytes = web3.utils.hexToBytes(web3.utils.toHex(publickey));
      const publicKey = ethers.utils.sha256(publickeyBytes);
      await expectRevert(
        implV0.getPublicKey(publicKey, {
          from: acc1,
        }),
        "app unknown"
      );
    });
    it("should succeed", async () => {
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
      const pubK = await implV0.getPublicKey(publicKeyId, {
        from: acc1,
      });
      expect(pubK.appId).toStrictEqual(publicKeyId);
      expect(pubK.publicKey).toStrictEqual(web3.utils.toHex(publickey));
      expect(pubK.status.eq(new BN(0))).toBe(true);
      expect(pubK.notBefore.eq(notBefore)).toBe(true);
      expect(pubK.notAfter.eq(notAfter)).toBe(true);

      const newStatus = 1;
      const newNotBefore = (await time.latest()).add(time.duration.weeks(2));
      const newNotAfter = newNotBefore.add(time.duration.years(2));
      const newPublickey = "this is a brand new pubKey haters gonna hate";
      const newPublickeyBytes = web3.utils.hexToBytes(
        web3.utils.toHex(newPublickey)
      );
      const newPublicKeyId = ethers.utils.sha256(newPublickeyBytes);
      await implV0.insertAppPublicKey(
        publicKeyId,
        newPublickeyBytes,
        newStatus,
        newNotBefore,
        newNotAfter,
        {
          from: acc1,
        }
      );
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
});
