const {
  BN, // Big Number support
  expectRevert,
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const { ethers } = require("ethers");

const Tir = contract.fromArtifact("Tir");
const Pagination = contract.fromArtifact("Pagination");

describe("trusted issuer registry", () => {
  describe("issuer CRUD", () => {
    describe("get issuer", () => {
      it("should revert for an unknown did", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        await expectRevert(
          implV0.getIssuer.call("notexistingdid", {
            from: acc1,
          }),
          "issuer does not exist"
        );
      });
      it("should return all the latest hashes", async () => {
        expect.assertions(4);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });
        const firstAttrHash = ethers.utils.sha256(
          web3.utils.toHex(attribute1v0)
        );
        const attribute1v1 = "yoloyouuuu";
        const attr1v1Hash = ethers.utils.sha256(web3.utils.toHex(attribute1v1));
        const inputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
        // update the attribute1 to v1
        await implV0.updateIssuer(did, inputNewData, firstAttrHash, {
          from: acc1,
        });

        // add new attribute2
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const attr2Hash = ethers.utils.sha256(web3.utils.toHex(attr2Data));
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

        // as we overload update issuer we need to go through methods to test
        await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getIssuer.call(did, {
          from: acc1,
        });

        expect(res1).toStrictEqual([attr1v1Hash, attr2Hash]);
        // add a second version to attribute2
        const attr2v1Data = "attr2v1:somedata";
        const attr2v1Hash = ethers.utils.sha256(web3.utils.toHex(attr2v1Data));
        const inputAttr2v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2v1Data)
        );
        await implV0.updateIssuer(did, inputAttr2v1Data, attr2Hash, {
          from: acc1,
        });
        // the latest Attribute hash should now be attr1v1Hash and attr2v1Hash
        const res2 = await implV0.getIssuer.call(did, {
          from: acc1,
        });
        expect(res2).toStrictEqual([attr1v1Hash, attr2v1Hash]);

        // add a thrid version to attribute1
        const attr1v2Data = "attr1v2:someotherdata";
        const attr1v2Hash = ethers.utils.sha256(web3.utils.toHex(attr1v2Data));
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1v2Data)
        );
        await implV0.updateIssuer(did, inputAttr1v2Data, attr1v1Hash, {
          from: acc1,
        });
        // the latest Attribute hash should now be attr1v2Hash and attr2v1Hash
        const res3 = await implV0.getIssuer.call(did, {
          from: acc1,
        });
        expect(res3).toStrictEqual([attr1v2Hash, attr2v1Hash]);

        // add a third attribute
        const attr3v0Data = "attr3v0:someotherdata";
        const inputAttr3v0Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr3v0Data)
        );
        await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr3v0Data,
          {
            from: acc1,
          }
        );
        const attr3v0Hash = ethers.utils.sha256(web3.utils.toHex(attr3v0Data));
        // the latest Attribute hash should now be attr1v2Hash, attr2v1Hash and attr3v0Hash
        const res4 = await implV0.getIssuer.call(did, {
          from: acc1,
        });
        expect(res4).toStrictEqual([attr1v2Hash, attr2v1Hash, attr3v0Hash]);
      });
      it("attributeRevisions should return all the version hashes for an attribute", async () => {
        expect.assertions(6);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });
        const attr1v0Hash = ethers.utils.sha256(web3.utils.toHex(attribute1v0));
        const attribute1v1 = "yoloyouuuu";
        const attr1v1Hash = ethers.utils.sha256(web3.utils.toHex(attribute1v1));
        const inputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
        // update the attribute1 to v1
        await implV0.updateIssuer(did, inputNewData, attr1v0Hash, {
          from: acc1,
        });

        // add new attribute2
        const attr2Data =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const attr2v0Hash = ethers.utils.sha256(web3.utils.toHex(attr2Data));
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

        // as we overload update issuer we need to go through methods to test
        await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );

        // add a second version to attribute2
        const attr2v1Data = "attr2v1:somedata";
        const attr2v1Hash = ethers.utils.sha256(web3.utils.toHex(attr2v1Data));
        const inputAttr2v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2v1Data)
        );
        await implV0.updateIssuer(did, inputAttr2v1Data, attr2v0Hash, {
          from: acc1,
        });

        // add a thrid version to attribute1
        const attr1v2Data = "attr1v2:someotherdata";
        const attr1v2Hash = ethers.utils.sha256(web3.utils.toHex(attr1v2Data));
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1v2Data)
        );
        await implV0.updateIssuer(did, inputAttr1v2Data, attr1v1Hash, {
          from: acc1,
        });

        // add a third attribute
        const attr3v0Data = "attr3v0:someotherdata";
        const inputAttr3v0Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr3v0Data)
        );
        await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr3v0Data,
          {
            from: acc1,
          }
        );
        const attr3v0Hash = ethers.utils.sha256(web3.utils.toHex(attr3v0Data));

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        const resAttr1 = await implV0.getIssuerAttributeRevisions.call(
          attr1v0Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        const res2Attr1 = await implV0.getIssuerAttributeRevisions.call(
          attr1v1Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        const res3Attr1 = await implV0.getIssuerAttributeRevisions.call(
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
        const resAttr2 = await implV0.getIssuerAttributeRevisions.call(
          attr2v0Hash,
          1,
          10,
          {
            from: acc1,
          }
        );
        const res2Attr2 = await implV0.getIssuerAttributeRevisions.call(
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
        const resAttr3 = await implV0.getIssuerAttributeRevisions.call(
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
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        await expectRevert(
          implV0.getIssuerAttributeRevisions.call(
            web3.utils.hexToBytes(web3.utils.toHex("notexistinghash")),
            1,
            10,
            {
              from: acc1,
            }
          ),
          "attribute has not been found"
        );
      });
      it("attributebyHash should revert for an unknown hash", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        await expectRevert(
          implV0.getIssuerAttributeByHash.call(
            web3.utils.hexToBytes(web3.utils.toHex("notexistinghash")),
            {
              from: acc1,
            }
          ),
          "attribute has not been found"
        );
      });
      it("attributebyHash should return the attribute data and the did", async () => {
        expect.assertions(5);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1v0Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v0)
        );
        await implV0.insertIssuer(did, inputAttr1v0Data, {
          from: acc1,
        });
        const attr1v0Hash = ethers.utils.sha256(web3.utils.toHex(attribute1v0));
        const attribute1v1 = "yoloyouuuu";
        const attr1v1Hash = ethers.utils.sha256(web3.utils.toHex(attribute1v1));
        const inputAttr1v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
        // update the attribute1 to v1
        await implV0.updateIssuer(did, inputAttr1v1Data, attr1v0Hash, {
          from: acc1,
        });
        // add a thrid version to attribute1
        const attribute1v2 = "attr1v2:someotherdata";
        const attr1v2Hash = ethers.utils.sha256(web3.utils.toHex(attribute1v2));
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v2)
        );
        await implV0.updateIssuer(did, inputAttr1v2Data, attr1v1Hash, {
          from: acc1,
        });

        // add new issuer with attribute
        const did2 = "did:ebsi:0x324565465fd455646545464564654";
        const did2Attr1v0 =
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const did2Attr1v0Hash = ethers.utils.sha256(
          web3.utils.toHex(did2Attr1v0)
        );
        const inputDid2Attr1v0 = web3.utils.hexToBytes(
          web3.utils.toHex(did2Attr1v0)
        );

        // as we overload update issuer we need to go through methods to test
        await implV0.insertIssuer(did2, inputDid2Attr1v0, {
          from: acc1,
        });

        // add a second version to attribute2
        const did2Attr1v1 = "attr2v1:somedata";
        const did2Attr1v1Hash = ethers.utils.sha256(
          web3.utils.toHex(did2Attr1v1)
        );
        const inputDid2Attr1v1 = web3.utils.hexToBytes(
          web3.utils.toHex(did2Attr1v1)
        );
        await implV0.updateIssuer(did2, inputDid2Attr1v1, did2Attr1v0Hash, {
          from: acc1,
        });

        // calling getAttributebyHash with attr1v0Hash, attr1v1Hash or attr1v2Hash should did and correct data
        const resAttr1 = await implV0.getIssuerAttributeByHash.call(
          attr1v0Hash,
          {
            from: acc1,
          }
        );
        const res2Attr1 = await implV0.getIssuerAttributeByHash.call(
          attr1v1Hash,
          {
            from: acc1,
          }
        );
        const res3Attr1 = await implV0.getIssuerAttributeByHash.call(
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
        const resDid2Attr1v0Hash = await implV0.getIssuerAttributeByHash.call(
          did2Attr1v0Hash,
          {
            from: acc1,
          }
        );
        const resDid2Attr1v1Hash = await implV0.getIssuerAttributeByHash.call(
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
        const [acc1] = accounts;

        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = `didi`;
        const firstinputdata = web3.utils.hexToBytes(web3.utils.toHex("data"));
        const didFirstInputHash = ethers.utils.sha256(firstinputdata);
        await implV0.insertIssuer(did, firstinputdata, {
          from: acc1,
        });
        for (let i = 0; i < 10; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.methods["updateIssuer(string,bytes,bytes32)"](
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
          implV0.getIssuerAttributeRevisions.call(didFirstInputHash, 1, 0, {
            from: acc1,
          }),
          "PageSize must be > 0"
        );
        // pagesize = 0 should revert
        await expectRevert(
          implV0.getIssuerAttributeRevisions.call(didFirstInputHash, 0, 10, {
            from: acc1,
          }),
          "Page must be > 0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getIssuerAttributeRevisions.call(didFirstInputHash, 1, 52, {
            from: acc1,
          }),
          "PageSize must be <= 50"
        );
      });
      it("should work with page>1 and pagesize less than total", async () => {
        expect.assertions(48);
        const [acc1] = accounts;

        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = `didi`;
        const firstinputdata = web3.utils.hexToBytes(
          web3.utils.toHex("data-update-0")
        );
        const didFirstInputHash = ethers.utils.sha256(firstinputdata);
        await implV0.insertIssuer(did, firstinputdata, {
          from: acc1,
        });
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.methods["updateIssuer(string,bytes,bytes32)"](
            did,
            inputdata,
            didFirstInputHash,
            {
              from: acc1,
            }
          );
        }
        // page = 3 and pagesize 2
        const r1 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          3,
          2,
          {
            from: acc1,
          }
        );
        expect(r1.items).toHaveLength(2);
        expect(r1).toMatchObject({
          items: resAttributeHash.slice(4, 6),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.howMany.toString()).toStrictEqual("2");
        expect(r1.prev.toString()).toStrictEqual("2");
        expect(r1.next.toString()).toStrictEqual("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          2,
          10,
          {
            from: acc1,
          }
        );
        expect(r2.items).toHaveLength(1);
        expect(r2).toMatchObject({
          items: [resAttributeHash[10]],
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.howMany.toString()).toStrictEqual("1");
        expect(r2.prev.toString()).toStrictEqual("1");
        expect(r2.next.toString()).toStrictEqual("2");
        // page = 5 and pagesize 2
        const r3 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          5,
          2,
          {
            from: acc1,
          }
        );

        expect(r3.items).toHaveLength(2);
        expect(r3).toMatchObject({
          items: resAttributeHash.slice(8, 10),
        });
        expect(r3.total.toString()).toStrictEqual("11");
        expect(r3.howMany.toString()).toStrictEqual("2");
        expect(r3.prev.toString()).toStrictEqual("4");
        expect(r3.next.toString()).toStrictEqual("6");
        // page = 6 and pagesize 2
        const r4 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          6,
          2,
          {
            from: acc1,
          }
        );
        expect(r4.items).toHaveLength(1);
        expect(r4).toMatchObject({
          items: [resAttributeHash[10]],
        });
        expect(r4.total.toString()).toStrictEqual("11");
        expect(r4.howMany.toString()).toStrictEqual("1");
        expect(r4.prev.toString()).toStrictEqual("5");
        expect(r4.next.toString()).toStrictEqual("6");
        // page = 6565564 and pagesize 2
        const r5 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          6565564,
          2,
          {
            from: acc1,
          }
        );

        expect(r5.items).toHaveLength(0);
        expect(r5).toMatchObject({
          items: [],
        });
        expect(r5.total.toString()).toStrictEqual("11");
        expect(r5.howMany.toString()).toStrictEqual("0");
        expect(r5.prev.toString()).toStrictEqual("6");
        expect(r5.next.toString()).toStrictEqual("6");
        // page = 3 and pagesize 3
        const r6 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          3,
          3,
          {
            from: acc1,
          }
        );

        expect(r6.items).toHaveLength(3);
        expect(r6).toMatchObject({
          items: resAttributeHash.slice(6, 9),
        });
        expect(r6.total.toString()).toStrictEqual("11");
        expect(r6.howMany.toString()).toStrictEqual("3");
        expect(r6.prev.toString()).toStrictEqual("2");
        expect(r6.next.toString()).toStrictEqual("4");
        // page = 2 and pagesize 3
        const r8 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
          2,
          3,
          {
            from: acc1,
          }
        );
        expect(r8.items).toHaveLength(3);
        expect(r8).toMatchObject({
          items: resAttributeHash.slice(3, 6),
        });
        expect(r8.total.toString()).toStrictEqual("11");
        expect(r8.howMany.toString()).toStrictEqual("3");
        expect(r8.prev.toString()).toStrictEqual("1");
        expect(r8.next.toString()).toStrictEqual("3");
        // page = 65456465 and pagesize 564646545645
        const r7 = await implV0.getIssuerAttributeRevisions.call(
          didFirstInputHash,
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
      });
    });

    describe("insert", () => {
      it("should work", async () => {
        expect.assertions(1);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));
        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attributeVersions = await implV0.getIssuerAttributeRevisions(
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
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const did1Hash = ethers.utils.sha256(web3.utils.toHex(did1));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        // add did1 with inputdata
        const receipt = await implV0.insertIssuer(did1, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash: did1Hash,
          firstAttrHash,
          did: did1,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getIssuerAttributeRevisions(
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
          implV0.insertIssuer(did2, inputdata, {
            from: acc1,
          }),
          "attribute is already stored"
        );
      });
      it("for two did", async () => {
        expect.assertions(2);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const did1Hash = ethers.utils.sha256(web3.utils.toHex(did1));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did1, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash: did1Hash,
          firstAttrHash,
          did: did1,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getIssuerAttributeRevisions(
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
        const receipt2 = await implV0.insertIssuer(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash2 = ethers.utils.sha256(web3.utils.toHex(data2));

        expectEvent(receipt2, "AddIssuerAttribute", {
          didHash: did2Hash,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions2 = await implV0.getIssuerAttributeRevisions(
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
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        await expectRevert(
          implV0.insertIssuer(did, inputdata, {
            from: acc1,
          }),
          "issuer already exist"
        );
      });
    });
    describe("get issuers", () => {
      const resIssuers = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
      ];
      it("should failed with wrong page size", async () => {
        expect.assertions(0);
        const [acc1] = accounts;

        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertIssuer(did, inputdata, {
            from: acc1,
          });
        }

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getIssuers.call(1, 0, {
            from: acc1,
          }),
          "PageSize must be > 0"
        );
        // page  >  0 should revert
        await expectRevert(
          implV0.getIssuers.call(0, 10, {
            from: acc1,
          }),
          "Page must be > 0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getIssuers.call(1, 52, {
            from: acc1,
          }),
          "PageSize must be <= 50"
        );
      });
      it("should work", async () => {
        expect.assertions(12);
        const [acc1] = accounts;

        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertIssuer(did, inputdata, {
            from: acc1,
          });
        }
        // page = 1 and pagesize is equal to the total
        const r = await implV0.getIssuers.call(1, 11, {
          from: acc1,
        });
        expect(r.items).toHaveLength(11);
        expect(r).toMatchObject({
          items: resIssuers,
        });
        expect(r.total.toString()).toStrictEqual("11");
        expect(r.howMany.toString()).toStrictEqual("11");
        expect(r.prev.toString()).toStrictEqual("1");
        expect(r.next.toString()).toStrictEqual("1");

        const r1 = await implV0.getIssuers.call(5, 11, {
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
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const newData = "yoloyouuuu";
        const newAttrHash = ethers.utils.sha256(web3.utils.toHex(newData));
        const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
        const res = await implV0.updateIssuer(
          did,
          inputNewData,
          firstAttrHash,
          {
            from: acc1,
          }
        );

        expectEvent(res, "UpdateIssuerAttribute", {
          didHash,
          newAttrHash,
          previousAttrHash: firstAttrHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });
      });
      it("should fail if issuer does not exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));

        // Event assertions can verify that the arguments are the expected ones

        await expectRevert(
          implV0.methods["updateIssuer(string,bytes)"](did, inputdata, {
            from: acc1,
          }),
          "issuer does not exist"
        );
      });
      it("should fail if lastversHash is incorrect", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
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
        const receipt2 = await implV0.insertIssuer(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHashOfSecondDid = ethers.utils.sha256(
          web3.utils.toHex(data2)
        );

        expectEvent(receipt2, "AddIssuerAttribute", {
          didHash: didHash2,
          firstAttrHash: firstAttrHashOfSecondDid,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        await expectRevert(
          implV0.updateIssuer(did2, inputdata, firstAttrHash, {
            from: acc1,
          }),
          "lastVersHash is not link to DID"
        );
      });
      it("should fail if attribute exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        await expectRevert(
          implV0.updateIssuer(did, inputdata, firstAttrHash, {
            from: acc1,
          }),
          "attribute is already stored"
        );
      });
      it("should fail if attribute is new", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertIssuer(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = ethers.utils.sha256(web3.utils.toHex(data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const newData = "yoloyouuuu";
        const newAttrHash = ethers.utils.sha256(web3.utils.toHex(newData));
        const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
        await expectRevert(
          implV0.updateIssuer(did, inputNewData, newAttrHash, {
            from: acc1,
          }),
          "lastVersHash is not link to DID"
        );
      });
      it("two different attributes should fail if the second version attribute is already a version of another attribute", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertIssuer(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = ethers.utils.sha256(web3.utils.toHex(attr1Data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1NewAttrHash = ethers.utils.sha256(
          web3.utils.toHex(attr1NewData)
        );
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const res = await implV0.updateIssuer(
          did,
          attr1InputNewData,
          firstAttr1Hash,
          {
            from: acc1,
          }
        );

        expectEvent(res, "UpdateIssuerAttribute", {
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
        // as we overload update issuer we need to go through methods to test
        const receipt2 = await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );
        // Event assertions can verify that the arguments are the expected ones
        const firstAttr2Hash = ethers.utils.sha256(web3.utils.toHex(attr2Data));

        expectEvent(receipt2, "UpdateIssuerAttribute", {
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
          implV0.updateIssuer(did, attr2InputNewData, firstAttr2Hash, {
            from: acc1,
          }),
          "attribute is already stored"
        );
        // same data than attr1 v1
        const attr2InputNewData2 = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        await expectRevert(
          implV0.updateIssuer(did, attr2InputNewData2, firstAttr2Hash, {
            from: acc1,
          }),
          "attribute is already stored"
        );
      });
      it("two different attributes", async () => {
        expect.assertions(3);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertIssuer(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = ethers.utils.sha256(web3.utils.toHex(attr1Data));

        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1NewAttrHash = ethers.utils.sha256(
          web3.utils.toHex(attr1NewData)
        );
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const res = await implV0.updateIssuer(
          did,
          attr1InputNewData,
          firstAttr1Hash,
          {
            from: acc1,
          }
        );

        expectEvent(res, "UpdateIssuerAttribute", {
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

        // as we overload update issuer we need to go through methods to test
        const receipt2 = await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );
        // Event assertions can verify that the arguments are the expected ones
        const firstAttr2Hash = ethers.utils.sha256(web3.utils.toHex(attr2Data));
        expectEvent(receipt2, "UpdateIssuerAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        const attr2NewData = "Newjhkhjyoloyouuuu";
        const attr2NewAttrHash = ethers.utils.sha256(
          web3.utils.toHex(attr2NewData)
        );
        const attr2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewData)
        );
        const res2 = await implV0.updateIssuer(
          did,
          attr2InputNewData,
          firstAttr2Hash,
          {
            from: acc1,
          }
        );

        expectEvent(res2, "UpdateIssuerAttribute", {
          didHash,
          newAttrHash: attr2NewAttrHash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(2),
        });

        const attr2NewDataV3 = "VeryNewjhkhjyoloyouuuu";
        const attr2NewAttrHashV3 = ethers.utils.sha256(
          web3.utils.toHex(attr2NewDataV3)
        );
        const attr2InputNewDataV3 = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewDataV3)
        );
        const res3 = await implV0.updateIssuer(
          did,
          attr2InputNewDataV3,
          attr2NewAttrHash,
          {
            from: acc1,
          }
        );

        expectEvent(res3, "UpdateIssuerAttribute", {
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
        const attributeVersionsWithFirstHash = await implV0.getIssuerAttributeRevisions(
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
        const attributeVersionsWithSecondHash = await implV0.getIssuerAttributeRevisions(
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
        const attributeVersionsWithThirdHash = await implV0.getIssuerAttributeRevisions(
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
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tir.detectNetwork();
        await Tir.link("Pagination", myLibrary.address);
        const implV0 = await Tir.new({ from: acc1 });
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = ethers.utils.sha256(web3.utils.toHex(did));

        const attr1Data = web3.utils.toHex(
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputAttr1Data = web3.utils.hexToBytes(attr1Data);
        const receipt = await implV0.insertIssuer(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = ethers.utils.sha256(attr1Data);
        expectEvent(receipt, "AddIssuerAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attr1NewData = web3.utils.toHex("yoloyouuuu");
        const attr1NewAttrHash = ethers.utils.sha256(attr1NewData);
        const attr1InputNewData = web3.utils.hexToBytes(attr1NewData);
        const res = await implV0.updateIssuer(
          did,
          attr1InputNewData,
          firstAttr1Hash,
          {
            from: acc1,
          }
        );

        expectEvent(res, "UpdateIssuerAttribute", {
          didHash,
          newAttrHash: attr1NewAttrHash,
          previousAttrHash: firstAttr1Hash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });

        // -------------Second Attributes-------------------
        const attr2Data = web3.utils.toHex(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputAttr2Data = web3.utils.hexToBytes(attr2Data);

        // as we overload update issuer we need to go through methods to test
        const receipt2 = await implV0.methods["updateIssuer(string,bytes)"](
          did,
          inputAttr2Data,
          {
            from: acc1,
          }
        );

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr2Hash = ethers.utils.sha256(attr2Data);

        expectEvent(receipt2, "UpdateIssuerAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        const attr2NewData = web3.utils.toHex("Newjhkhjyoloyouuuu");
        const attr2NewAttrHash = ethers.utils.sha256(attr2NewData);
        const attr2InputNewData = web3.utils.hexToBytes(attr2NewData);
        const res2 = await implV0.updateIssuer(
          did,
          attr2InputNewData,
          firstAttr2Hash,
          {
            from: acc1,
          }
        );

        expectEvent(res2, "UpdateIssuerAttribute", {
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

        const data2 = web3.utils.toHex(
          "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6"
        );
        const inputdata2 = web3.utils.hexToBytes(data2);
        const receiptDid2 = await implV0.insertIssuer(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash2 = ethers.utils.sha256(data2);
        expectEvent(receiptDid2, "AddIssuerAttribute", {
          didHash: did2Hash,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions2 = await implV0.getIssuerAttributeRevisions(
          firstAttrHash2,
          1,
          10,
          {
            from: acc1,
          }
        );
        expect(attributeVersions2.items[0]).toStrictEqual(firstAttrHash2);

        const did2AttributNewData = web3.utils.toHex("VeryNewjhkhjyoloyouuuu");
        const did2AttributNewDataHash = ethers.utils.sha256(
          did2AttributNewData
        );
        const did2InputNewData = web3.utils.hexToBytes(did2AttributNewData);
        const res3 = await implV0.updateIssuer(
          did2,
          did2InputNewData,
          firstAttrHash2,
          {
            from: acc1,
          }
        );

        expectEvent(res3, "UpdateIssuerAttribute", {
          didHash: did2Hash,
          newAttrHash: did2AttributNewDataHash,
          previousAttrHash: firstAttrHash2,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });

        // check that we retrieve the did attribute
        // we should have only one attribute for did2
        // we should have two attribute version for did2's attribute
        const constDid2Attrib = [firstAttrHash2, did2AttributNewDataHash];
        const attributeVersionsWithFirstHash = await implV0.getIssuerAttributeRevisions(
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
        const attributeVersionsWithSecondHash = await implV0.getIssuerAttributeRevisions(
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
        const attributeVersionsForDid1Attribute = await implV0.getIssuerAttributeRevisions(
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
