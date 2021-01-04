const {
  BN, // Big Number support
  expectRevert,
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const { ethers } = require("ethers");

const Tar = contract.fromArtifact("Tar");
const Pagination = contract.fromArtifact("Pagination");
const PolicyLib = contract.fromArtifact("PolicyLib");
const PolicyStoreLib = contract.fromArtifact("PolicyStoreLib");

const RevocationLib = contract.fromArtifact("RevocationLib");
const RevocationStoreLib = contract.fromArtifact("RevocationStoreLib");

const AuthLib = contract.fromArtifact("AuthLib");
const AuthStoreLib = contract.fromArtifact("AuthStoreLib");

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
  describe("administrator CRUD", () => {
    describe("get administrator", () => {
      it("should revert for an unknown did", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        await expectRevert(
          implV0.getAdministrator.call("notexistingdid", {
            from: acc1,
          }),
          "admin unknown"
        );
      });
      it("should return all the latest hashes", async () => {
        expect.assertions(4);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });
        const firstAttrHash = ethers.utils.sha256(inputdata);
        const attribute1v1 = "yoloyouuuu";
        const inputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
        const attr1v1Hash = ethers.utils.sha256(inputNewData);

        // update the attribute1 to v1
        // as we overload update administrator we need to go through methods to test
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputNewData,
          firstAttrHash,
          {
            from: acc1,
          }
        );

        // add new attribute2
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

        const attr2Hash = ethers.utils.sha256(inputAttr2Data);

        // as we overload update administrator we need to go through methods to test
        await implV0.methods["updateAdministrator(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getAdministrator.call(did, {
          from: acc1,
        });

        expect(res1).toStrictEqual([attr1v1Hash, attr2Hash]);
        // add a second version to attribute2
        const attr2v1Data = "attr2v1:somedata";
        const inputAttr2v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2v1Data)
        );

        const attr2v1Hash = ethers.utils.sha256(inputAttr2v1Data);
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputAttr2v1Data,
          attr2Hash,
          {
            from: acc1,
          }
        );
        // the latest Attribute hash should now be attr1v1Hash and attr2v1Hash
        const res2 = await implV0.getAdministrator.call(did, {
          from: acc1,
        });
        expect(res2).toStrictEqual([attr1v1Hash, attr2v1Hash]);

        // add a thrid version to attribute1
        const attr1v2Data = "attr1v2:someotherdata";
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1v2Data)
        );
        const attr1v2Hash = ethers.utils.sha256(inputAttr1v2Data);
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputAttr1v2Data,
          attr1v1Hash,
          {
            from: acc1,
          }
        );
        // the latest Attribute hash should now be attr1v2Hash and attr2v1Hash
        const res3 = await implV0.getAdministrator.call(did, {
          from: acc1,
        });
        expect(res3).toStrictEqual([attr1v2Hash, attr2v1Hash]);

        // add a third attribute
        const attr3v0Data = "attr3v0:someotherdata";
        const inputAttr3v0Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr3v0Data)
        );
        await implV0.methods["updateAdministrator(string,bytes)"](
          did,
          inputAttr3v0Data,
          {
            from: acc1,
          }
        );
        const attr3v0Hash = ethers.utils.sha256(inputAttr3v0Data);
        // the latest Attribute hash should now be attr1v2Hash, attr2v1Hash and attr3v0Hash
        const res4 = await implV0.getAdministrator.call(did, {
          from: acc1,
        });
        expect(res4).toStrictEqual([attr1v2Hash, attr2v1Hash, attr3v0Hash]);
      });
      it("attributeHistory should return all the version hashes for an attribute", async () => {
        expect.assertions(6);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });
        const attr1v0Hash = ethers.utils.sha256(inputdata);
        const attribute1v1 = "yoloyouuuu";
        const inputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
        const attr1v1Hash = ethers.utils.sha256(inputNewData);
        // update the attribute1 to v1
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputNewData,
          attr1v0Hash,
          {
            from: acc1,
          }
        );
        // add new attribute2
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );
        const attr2v0Hash = ethers.utils.sha256(inputAttr2Data);
        // as we overload update administrator we need to go through methods to test
        await implV0.methods["updateAdministrator(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );

        // add a second version to attribute2
        const attr2v1Data = "attr2v1:somedata";
        const inputAttr2v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2v1Data)
        );
        const attr2v1Hash = ethers.utils.sha256(inputAttr2v1Data);
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputAttr2v1Data,
          attr2v0Hash,
          {
            from: acc1,
          }
        );
        // add a thrid version to attribute1
        const attr1v2Data = "attr1v2:someotherdata";
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1v2Data)
        );
        const attr1v2Hash = ethers.utils.sha256(inputAttr1v2Data);
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputAttr1v2Data,
          attr1v1Hash,
          {
            from: acc1,
          }
        );
        // add a third attribute
        const attr3v0Data = "attr3v0:someotherdata";
        const inputAttr3v0Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr3v0Data)
        );
        await implV0.methods["updateAdministrator(string,bytes)"](
          did,
          inputAttr3v0Data,
          {
            from: acc1,
          }
        );
        const attr3v0Hash = ethers.utils.sha256(inputAttr3v0Data);

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        const resAttr1 = await implV0.getAdministratorAttributeRevisions.call(
          attr1v0Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        const res2Attr1 = await implV0.getAdministratorAttributeRevisions.call(
          attr1v1Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        const res3Attr1 = await implV0.getAdministratorAttributeRevisions.call(
          attr1v2Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(resAttr1.items).toStrictEqual([
          attr1v0Hash,
          attr1v1Hash,
          attr1v2Hash,
        ]);
        expect(res2Attr1.items).toStrictEqual([
          attr1v0Hash,
          attr1v1Hash,
          attr1v2Hash,
        ]);
        expect(res3Attr1.items).toStrictEqual([
          attr1v0Hash,
          attr1v1Hash,
          attr1v2Hash,
        ]);
        // calling getAttributeHistory with attr2v0Hash or attr2v1Hash should return the same array
        const resAttr2 = await implV0.getAdministratorAttributeRevisions.call(
          attr2v0Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        const res2Attr2 = await implV0.getAdministratorAttributeRevisions.call(
          attr2v1Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(resAttr2.items).toStrictEqual([attr2v0Hash, attr2v1Hash]);
        expect(res2Attr2.items).toStrictEqual([attr2v0Hash, attr2v1Hash]);
        // calling getAttributeHistory with attr3v0Hash should return attr3v0Hash
        const resAttr3 = await implV0.getAdministratorAttributeRevisions.call(
          attr3v0Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(resAttr3.items).toStrictEqual([attr3v0Hash]);
      });
      it("attributeRevisions should revert for an unknown hash", async () => {
        expect.assertions(0);

        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        await expectRevert(
          implV0.getAdministratorAttributeRevisions.call(
            web3.utils.hexToBytes(web3.utils.toHex("notexistinghash")),
            1,
            10,
            {
              from: acc1,
            }
          ),
          "attr unknown"
        );
      });
      it("attributebyHash should revert for an unknown hash", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        await expectRevert(
          implV0.getAdministratorAttributeByHash.call(
            web3.utils.hexToBytes(web3.utils.toHex("notexistinghash")),
            {
              from: acc1,
            }
          ),
          "attr unknown"
        );
      });
      it("attributebyHash should return the attribute data and the did", async () => {
        expect.assertions(5);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1v0Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v0)
        );
        await implV0.insertAdministrator(did, inputAttr1v0Data, {
          from: acc1,
        });
        const attr1v0Hash = ethers.utils.sha256(inputAttr1v0Data);
        const attribute1v1 = "yoloyouuuu";
        const inputAttr1v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
        const attr1v1Hash = ethers.utils.sha256(inputAttr1v1Data);
        // update the attribute1 to v1
        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputAttr1v1Data,
          attr1v0Hash,
          {
            from: acc1,
          }
        );
        // add a thrid version to attribute1
        const attribute1v2 = "attr1v2:someotherdata";
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v2)
        );
        const attr1v2Hash = ethers.utils.sha256(inputAttr1v2Data);

        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did,
          inputAttr1v2Data,
          attr1v1Hash,
          {
            from: acc1,
          }
        );
        // add new administrator with attribute
        const did2 = "did:ebsi:0x324565465fd455646545464564654";
        const did2Attr1v0 =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputDid2Attr1v0 = web3.utils.hexToBytes(
          web3.utils.toHex(did2Attr1v0)
        );
        const did2Attr1v0Hash = ethers.utils.sha256(inputDid2Attr1v0);

        // as we overload update administrator we need to go through methods to test
        await implV0.insertAdministrator(did2, inputDid2Attr1v0, {
          from: acc1,
        });

        // add a second version to attribute2
        const did2Attr1v1 = "attr2v1:somedata";
        const inputDid2Attr1v1 = web3.utils.hexToBytes(
          web3.utils.toHex(did2Attr1v1)
        );
        const did2Attr1v1Hash = ethers.utils.sha256(inputDid2Attr1v1);

        await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
          did2,
          inputDid2Attr1v1,
          did2Attr1v0Hash,
          {
            from: acc1,
          }
        );
        // calling getAttributebyHash with attr1v0Hash, attr1v1Hash or attr1v2Hash should did and correct data
        const resAttr1 = await implV0.getAdministratorAttributeByHash.call(
          attr1v0Hash,
          {
            from: acc1,
          }
        );
        const res2Attr1 = await implV0.getAdministratorAttributeByHash.call(
          attr1v1Hash,
          {
            from: acc1,
          }
        );
        const res3Attr1 = await implV0.getAdministratorAttributeByHash.call(
          attr1v2Hash,
          {
            from: acc1,
          }
        );
        expect(resAttr1).toStrictEqual(
          expect.objectContaining({
            did,
            attribData: web3.utils.toHex(attribute1v0),
          })
        );
        expect(res2Attr1).toStrictEqual(
          expect.objectContaining({
            did,
            attribData: web3.utils.toHex(attribute1v1),
          })
        );
        expect(res3Attr1).toStrictEqual(
          expect.objectContaining({
            did,
            attribData: web3.utils.toHex(attribute1v2),
          })
        );

        // calling getAttributebyHash with did2Attr1v0Hash or did2Attr1v1Hash
        const resDid2Attr1v0Hash = await implV0.getAdministratorAttributeByHash.call(
          did2Attr1v0Hash,
          {
            from: acc1,
          }
        );
        const resDid2Attr1v1Hash = await implV0.getAdministratorAttributeByHash.call(
          did2Attr1v1Hash,
          {
            from: acc1,
          }
        );
        expect(resDid2Attr1v0Hash).toStrictEqual(
          expect.objectContaining({
            did: did2,
            attribData: web3.utils.toHex(did2Attr1v0),
          })
        );
        expect(resDid2Attr1v1Hash).toStrictEqual(
          expect.objectContaining({
            did: did2,
            attribData: web3.utils.toHex(did2Attr1v1),
          })
        );
      });
    });
    describe("get attributebyHash", () => {
      const resAttributeHash = [...Array(11).keys()].map((i) =>
        ethers.utils.sha256(web3.utils.toHex(`data-update-${i}`))
      );
      it("should failed with wrong page size", async () => {
        expect.assertions(0);
        const did = `didi`;
        const firstinputdata = web3.utils.hexToBytes(
          web3.utils.toHex("data-update-0")
        );
        const didFirstInputHash = ethers.utils.sha256(firstinputdata);
        await implV0.insertAdministrator(did, firstinputdata, {
          from: acc1,
        });
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            inputdata,
            didFirstInputHash,
            {
              from: acc1,
            }
          );
        }

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getAdministratorAttributeRevisions.call(
            didFirstInputHash,
            1,
            0,
            {
              from: acc1,
            }
          ),
          "PSize not >0"
        );
        // page  = 0 should revert
        await expectRevert(
          implV0.getAdministratorAttributeRevisions.call(
            didFirstInputHash,
            0,
            10,
            {
              from: acc1,
            }
          ),
          "Page not >0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getAdministratorAttributeRevisions.call(
            didFirstInputHash,
            1,
            52,
            {
              from: acc1,
            }
          ),
          "PSize not <= 50"
        );
      });
      it("should work", async () => {
        expect.assertions(18);
        const did = `didi`;
        const firstinputdata = web3.utils.hexToBytes(
          web3.utils.toHex("data-update-0")
        );
        const didFirstInputHash = ethers.utils.sha256(firstinputdata);
        await implV0.insertAdministrator(did, firstinputdata, {
          from: acc1,
        });
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            inputdata,
            didFirstInputHash,
            {
              from: acc1,
            }
          );
        }

        // page = 1 and pagesize is way less than total
        const r = await implV0.getAdministratorAttributeRevisions.call(
          didFirstInputHash,
          1,
          2,
          {
            from: acc1,
          }
        );
        expect(r.items).toHaveLength(2);
        expect(r).toMatchObject({
          items: resAttributeHash.slice(0, 2),
        });
        expect(r.total.toString()).toStrictEqual("11");
        expect(r.howMany.toString()).toStrictEqual("2");
        expect(r.prev.toString()).toStrictEqual("1");
        expect(r.next.toString()).toStrictEqual("2");

        // page = 1 and pagesize is way less than total
        const r2 = await implV0.getAdministratorAttributeRevisions.call(
          didFirstInputHash,
          1,
          11,
          {
            from: acc1,
          }
        );
        expect(r2.items).toHaveLength(11);
        expect(r2).toMatchObject({
          items: resAttributeHash,
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.howMany.toString()).toStrictEqual("11");
        expect(r2.prev.toString()).toStrictEqual("1");
        expect(r2.next.toString()).toStrictEqual("1");

        // page = 1 and pagesize is way more than total
        const r1 = await implV0.getAdministratorAttributeRevisions.call(
          didFirstInputHash,
          1,
          42,
          {
            from: acc1,
          }
        );
        expect(r1.items).toHaveLength(11);
        expect(r1).toMatchObject({
          items: resAttributeHash,
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.howMany.toString()).toStrictEqual("11");
        expect(r1.prev.toString()).toStrictEqual("1");
        expect(r1.next.toString()).toStrictEqual("1");
      });
    });
    describe("insert", () => {
      it("should work", async () => {
        expect.assertions(1);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersions.items[0]).toStrictEqual(firstAttrHash);
      });
      it("for two did should fail if it is the same attribute for both", async () => {
        expect.assertions(1);
        const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const did1Hash = ethers.utils.sha256(web3.utils.toHex(did1));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        // add did1 with inputdata
        const receipt = await implV0.insertAdministrator(did1, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash: did1Hash,
          firstAttrHash,
          did: did1,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersions.items[0]).toStrictEqual(firstAttrHash);

        const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
        // add did2 with the same inputdata
        await expectRevert(
          implV0.insertAdministrator(did2, inputdata, {
            from: acc1,
          }),
          "attr exist"
        );
      });
      it("for two did", async () => {
        expect.assertions(2);
        const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const did1Hash = ethers.utils.sha256(web3.utils.toHex(did1));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did1, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash: did1Hash,
          firstAttrHash,
          did: did1,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersions.items[0]).toStrictEqual(firstAttrHash);

        const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
        const did2Hash = ethers.utils.sha256(web3.utils.toHex(did2));

        const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
        const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
        const receipt2 = await implV0.insertAdministrator(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash2 = ethers.utils.sha256(inputdata2);

        expectEvent(receipt2, "AddAdministratorAttribute", {
          didHash: did2Hash,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions2 = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash2,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersions2.items[0]).toStrictEqual(firstAttrHash2);
      });
      it("should fail if attribute exists", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        await expectRevert(
          implV0.insertAdministrator(did, inputdata, {
            from: acc1,
          }),
          "admin exist"
        );
      });
    });
    describe("get administrators", () => {
      const resAttributeHash = [...Array(11).keys()].map((i) => i.toString());
      it("should failed with wrong page size", async () => {
        expect.assertions(0);
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertAdministrator(did, inputdata, {
            from: acc1,
          });
        }

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getAdministrators.call(1, 0, {
            from: acc1,
          }),
          "PSize not >0"
        );
        // page  = 0 should revert
        await expectRevert(
          implV0.getAdministrators.call(0, 10, {
            from: acc1,
          }),
          "Page not >0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getAdministrators.call(1, 52, {
            from: acc1,
          }),
          "PSize not <= 50"
        );
      });
      it("should work with page==X and pagesize eq total", async () => {
        expect.assertions(18);
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertAdministrator(did, inputdata, {
            from: acc1,
          });
        }

        // page = 1 and pagesize1
        const r0 = await implV0.getAdministrators.call(1, 1, {
          from: acc1,
        });
        expect(r0.items).toHaveLength(1);
        expect(r0).toMatchObject({
          items: resAttributeHash.slice(0, 1),
        });
        expect(r0.total.toString()).toStrictEqual("11");
        expect(r0.howMany.toString()).toStrictEqual("1");
        expect(r0.prev.toString()).toStrictEqual("1");
        expect(r0.next.toString()).toStrictEqual("2");

        // page = 1 and pagesize is equal to the total
        const r = await implV0.getAdministrators.call(1, 11, {
          from: acc1,
        });
        expect(r.items).toHaveLength(11);
        expect(r).toMatchObject({
          items: resAttributeHash,
        });
        expect(r.total.toString()).toStrictEqual("11");
        expect(r.howMany.toString()).toStrictEqual("11");
        expect(r.prev.toString()).toStrictEqual("1");
        expect(r.next.toString()).toStrictEqual("1");

        const r1 = await implV0.getAdministrators.call(5, 11, {
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
    describe("update", () => {
      it("should work", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const newData = "yoloyouuuu";
        const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
        const newAttrHash = ethers.utils.sha256(inputNewData);

        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, inputNewData, firstAttrHash, {
          from: acc1,
        });
        expectEvent(res, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash,
          previousAttrHash: firstAttrHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });
      });
      it("should fail if admin unknowns", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));

        // Event assertions can verify that the arguments are the expected ones

        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes)"](did, inputdata, {
            from: acc1,
          }),
          "admin unknown"
        );
      });
      it("should fail if lastversHash is incorrect", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const did2 = "did:ebsi:0x2220116F4C145c47C47022565D79E4df50bE90cb";
        const didHash2 = ethers.utils.sha256(web3.utils.toHex(did2));

        const data2 = "whateverkhfkjsh89798";
        const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
        const receipt2 = await implV0.insertAdministrator(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHashOfSecondDid = ethers.utils.sha256(inputdata2);

        expectEvent(receipt2, "AddAdministratorAttribute", {
          didHash: didHash2,
          firstAttrHash: firstAttrHashOfSecondDid,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did2,
            inputdata,
            firstAttrHash,
            {
              from: acc1,
            }
          ),
          "lastVers != DID"
        );
      });
      it("should fail if attribute exists", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            inputdata,
            firstAttrHash,
            {
              from: acc1,
            }
          ),
          "attr exist"
        );
      });
      it("should fail if attribute is new", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(inputdata);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const newData = "yoloyouuuu";
        const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
        const newAttrHash = ethers.utils.sha256(inputNewData);
        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            inputNewData,
            newAttrHash,
            {
              from: acc1,
            }
          ),
          "lastVers != DID"
        );
      });
      it("two different attributes should fail if the second version attribute is already a version of another attribute", async () => {
        expect.assertions(0);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertAdministrator(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = ethers.utils.sha256(inputAttr1Data);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const attr1NewAttrHash = ethers.utils.sha256(attr1InputNewData);
        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr1InputNewData, firstAttr1Hash, {
          from: acc1,
        });

        expectEvent(res, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: attr1NewAttrHash,
          previousAttrHash: firstAttr1Hash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });

        // -------------Second Attributes-------------------
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );
        // as we overload update administrator we need to go through methods to test
        const receipt2 = await implV0.methods[
          "updateAdministrator(string,bytes)"
        ](did, inputAttr2Data, {
          from: acc1,
        });
        // Event assertions can verify that the arguments are the expected ones
        const firstAttr2Hash = ethers.utils.sha256(inputAttr2Data);

        expectEvent(receipt2, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        // const attr2NewAttrHash = ethers.utils.sha256(attr1NewData);
        // same data than attr1 v2
        const attr2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );

        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            attr2InputNewData,
            firstAttr2Hash,
            {
              from: acc1,
            }
          ),
          "attr exist"
        );
        // same data than attr1 v1
        const attr2InputNewData2 = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            attr2InputNewData2,
            firstAttr2Hash,
            {
              from: acc1,
            }
          ),
          "attr exist"
        );
      });
      it("two different attributes", async () => {
        expect.assertions(3);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertAdministrator(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = ethers.utils.sha256(inputAttr1Data);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const attr1NewAttrHash = ethers.utils.sha256(attr1InputNewData);
        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr1InputNewData, firstAttr1Hash, {
          from: acc1,
        });

        expectEvent(res, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: attr1NewAttrHash,
          previousAttrHash: firstAttr1Hash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });

        // -------------Second Attributes-------------------
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

        // as we overload update administrator we need to go through methods to test
        const receipt2 = await implV0.methods[
          "updateAdministrator(string,bytes)"
        ](did, inputAttr2Data, {
          from: acc1,
        });
        // Event assertions can verify that the arguments are the expected ones
        const firstAttr2Hash = ethers.utils.sha256(inputAttr2Data);
        expectEvent(receipt2, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        const attr2NewData = "Newjhkhjyoloyouuuu";
        const attr2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewData)
        );
        const attr2NewAttrHash = ethers.utils.sha256(attr2InputNewData);
        const res2 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr2InputNewData, firstAttr2Hash, {
          from: acc1,
        });

        expectEvent(res2, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: attr2NewAttrHash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(2),
        });

        const attr2NewDataV3 = "VeryNewjhkhjyoloyouuuu";
        const attr2InputNewDataV3 = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewDataV3)
        );
        const attr2NewAttrHashV3 = ethers.utils.sha256(attr2InputNewDataV3);
        const res3 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr2InputNewDataV3, attr2NewAttrHash, {
          from: acc1,
        });
        expectEvent(res3, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: attr2NewAttrHashV3,
          previousAttrHash: attr2NewAttrHash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(3),
          attributesCount: new BN(2),
        });

        // check that we retrieve the versions hashes
        const attr2Versions = [
          firstAttr2Hash,
          attr2NewAttrHash,
          attr2NewAttrHashV3,
        ];
        const attributeVersionsWithFirstHash = await implV0.getAdministratorAttributeRevisions(
          attr2Versions[0],
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithFirstHash.items).toStrictEqual(
          attr2Versions
        );
        const attributeVersionsWithSecondHash = await implV0.getAdministratorAttributeRevisions(
          attr2Versions[1],
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithSecondHash.items).toStrictEqual(
          attr2Versions
        );
        const attributeVersionsWithThirdHash = await implV0.getAdministratorAttributeRevisions(
          attr2Versions[2],
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithThirdHash.items).toStrictEqual(
          attr2Versions
        );
      });
      it("two different attributes for two did", async () => {
        expect.assertions(4);
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertAdministrator(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = ethers.utils.sha256(inputAttr1Data);

        expectEvent(receipt, "AddAdministratorAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const attr1NewAttrHash = ethers.utils.sha256(attr1InputNewData);
        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr1InputNewData, firstAttr1Hash, {
          from: acc1,
        });
        expectEvent(res, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: attr1NewAttrHash,
          previousAttrHash: firstAttr1Hash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });

        // -------------Second Attributes-------------------
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

        // as we overload update administrator we need to go through methods to test
        const receipt2 = await implV0.methods[
          "updateAdministrator(string,bytes)"
        ](did, inputAttr2Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr2Hash = ethers.utils.sha256(inputAttr2Data);

        expectEvent(receipt2, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        const attr2NewData = "Newjhkhjyoloyouuuu";
        const attr2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewData)
        );
        const attr2NewAttrHash = ethers.utils.sha256(attr2InputNewData);
        const res2 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr2InputNewData, firstAttr2Hash, {
          from: acc1,
        });
        expectEvent(res2, "UpdateAdministratorAttribute", {
          didHash,
          newAttrHash: attr2NewAttrHash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(2),
        });

        // -----new did

        const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
        const did2Hash = ethers.utils.sha256(web3.utils.toHex(did2));

        const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
        const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
        const receiptDid2 = await implV0.insertAdministrator(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash2 = ethers.utils.sha256(inputdata2);

        expectEvent(receiptDid2, "AddAdministratorAttribute", {
          didHash: did2Hash,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions2 = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash2,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersions2.items[0]).toStrictEqual(firstAttrHash2);

        const did2AttributNewData = "VeryNewjhkhjyoloyouuuu";
        const did2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(did2AttributNewData)
        );
        const did2AttributNewDataHash = ethers.utils.sha256(did2InputNewData);
        const res3 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did2, did2InputNewData, firstAttrHash2, {
          from: acc1,
        });

        expectEvent(res3, "UpdateAdministratorAttribute", {
          didHash: did2Hash,
          newAttrHash: did2AttributNewDataHash,
          previousAttrHash: firstAttrHash2,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });

        // check that we retrieve the did attribute
        // we should have two attribute version for did2's attribute
        const constDid2Attrib = [firstAttrHash2, did2AttributNewDataHash];
        const attributeVersionsWithFirstHash = await implV0.getAdministratorAttributeRevisions(
          constDid2Attrib[0],
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithFirstHash.items).toStrictEqual(
          constDid2Attrib
        );
        const attributeVersionsWithSecondHash = await implV0.getAdministratorAttributeRevisions(
          constDid2Attrib[1],
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithSecondHash.items).toStrictEqual(
          constDid2Attrib
        );
        // check with on attribut version from did1
        const attributeVersionsForDid1Attribute = await implV0.getAdministratorAttributeRevisions(
          attr2NewAttrHash,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsForDid1Attribute.items).toStrictEqual([
          firstAttr2Hash,
          attr2NewAttrHash,
        ]);
      });
    });
  });
});
