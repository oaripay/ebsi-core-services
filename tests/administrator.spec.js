const {
  BN, // Big Number support
  expectRevert,
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const {accounts, contract, web3} = require("@openzeppelin/test-environment");

const Tir = contract.fromArtifact("Tir");

describe("trusted administrator registry", () => {
  describe("administrator CRUD", () => {
    describe("get administrator", () => {
      it("should revert for an unknown did", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
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
          "administrator does not exist"
        );
      });
      it("should return all the latest hashes", async () => {
        expect.assertions(4);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });
        const firstAttrHash = web3.utils.sha3(attribute1v0);
        const attribute1v1 = "yoloyouuuu";
        const attr1v1Hash = web3.utils.sha3(attribute1v1);
        const inputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
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
        const attr2Hash = web3.utils.sha3(attr2Data);
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

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
        const attr2v1Hash = web3.utils.sha3(attr2v1Data);
        const inputAttr2v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2v1Data)
        );
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
        const attr1v2Hash = web3.utils.sha3(attr1v2Data);
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1v2Data)
        );
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
        const attr3v0Hash = web3.utils.sha3(attr3v0Data);
        // the latest Attribute hash should now be attr1v2Hash, attr2v1Hash and attr3v0Hash
        const res4 = await implV0.getAdministrator.call(did, {
          from: acc1,
        });
        expect(res4).toStrictEqual([attr1v2Hash, attr2v1Hash, attr3v0Hash]);
      });
      it("attributeHistory should return all the version hashes for an attribute", async () => {
        expect.assertions(6);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        // insert did and attribute1v0
        const attribute1v0 =
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
        await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });
        const attr1v0Hash = web3.utils.sha3(attribute1v0);
        const attribute1v1 = "yoloyouuuu";
        const attr1v1Hash = web3.utils.sha3(attribute1v1);
        const inputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
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
        const attr2v0Hash = web3.utils.sha3(attr2Data);
        const inputAttr2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2Data)
        );

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
        const attr2v1Hash = web3.utils.sha3(attr2v1Data);
        const inputAttr2v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr2v1Data)
        );
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
        const attr1v2Hash = web3.utils.sha3(attr1v2Data);
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1v2Data)
        );
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
        const attr3v0Hash = web3.utils.sha3(attr3v0Data);

        // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
        const resAttr1 = await implV0.getAdministratorAttributeRevisions.call(
          attr1v0Hash,
          {
            from: acc1,
          }
        );
        const res2Attr1 = await implV0.getAdministratorAttributeRevisions.call(
          attr1v1Hash,
          {
            from: acc1,
          }
        );
        const res3Attr1 = await implV0.getAdministratorAttributeRevisions.call(
          attr1v2Hash,
          {
            from: acc1,
          }
        );
        expect(resAttr1).toStrictEqual([attr1v0Hash, attr1v1Hash, attr1v2Hash]);
        expect(res2Attr1).toStrictEqual([
          attr1v0Hash,
          attr1v1Hash,
          attr1v2Hash,
        ]);
        expect(res3Attr1).toStrictEqual([
          attr1v0Hash,
          attr1v1Hash,
          attr1v2Hash,
        ]);
        // calling getAttributeHistory with attr2v0Hash or attr2v1Hash should return the same array
        const resAttr2 = await implV0.getAdministratorAttributeRevisions.call(
          attr2v0Hash,
          {
            from: acc1,
          }
        );
        const res2Attr2 = await implV0.getAdministratorAttributeRevisions.call(
          attr2v1Hash,
          {
            from: acc1,
          }
        );
        expect(resAttr2).toStrictEqual([attr2v0Hash, attr2v1Hash]);
        expect(res2Attr2).toStrictEqual([attr2v0Hash, attr2v1Hash]);
        // calling getAttributeHistory with attr3v0Hash should return attr3v0Hash
        const resAttr3 = await implV0.getAdministratorAttributeRevisions.call(
          attr3v0Hash,
          {
            from: acc1,
          }
        );
        expect(resAttr3).toStrictEqual([attr3v0Hash]);
      });
      it("attributeRevisions should revert for an unknown hash", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
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
        const implV0 = await Tir.new({from: acc1});
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
          "attribute has not been found"
        );
      });
      it("attributebyHash should return the attribute data and the did", async () => {
        expect.assertions(5);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
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
        const attr1v0Hash = web3.utils.sha3(attribute1v0);
        const attribute1v1 = "yoloyouuuu";
        const attr1v1Hash = web3.utils.sha3(attribute1v1);
        const inputAttr1v1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v1)
        );
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
        const attr1v2Hash = web3.utils.sha3(attribute1v2);
        const inputAttr1v2Data = web3.utils.hexToBytes(
          web3.utils.toHex(attribute1v2)
        );

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
        const did2Attr1v0Hash = web3.utils.sha3(did2Attr1v0);
        const inputDid2Attr1v0 = web3.utils.hexToBytes(
          web3.utils.toHex(did2Attr1v0)
        );

        // as we overload update administrator we need to go through methods to test
        await implV0.insertAdministrator(did2, inputDid2Attr1v0, {
          from: acc1,
        });

        // add a second version to attribute2
        const did2Attr1v1 = "attr2v1:somedata";
        const did2Attr1v1Hash = web3.utils.sha3(did2Attr1v1);
        const inputDid2Attr1v1 = web3.utils.hexToBytes(
          web3.utils.toHex(did2Attr1v1)
        );

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
    describe("insert", () => {
      it("should work", async () => {
        expect.assertions(1);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash,
          {
            from: acc1,
          }
        );
        expect(attributeVersions[0]).toStrictEqual(firstAttrHash);
      });

      it("for two did should fail if it is the same attribute for both", async () => {
        expect.assertions(1);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const did1Hash = web3.utils.sha3(did1);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        // add did1 with inputdata
        const receipt = await implV0.insertAdministrator(did1, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash: did1Hash,
          firstAttrHash,
          did: did1,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash,
          {
            from: acc1,
          }
        );
        expect(attributeVersions[0]).toStrictEqual(firstAttrHash);

        const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
        // add did2 with the same inputdata
        await expectRevert(
          implV0.insertAdministrator(did2, inputdata, {
            from: acc1,
          }),
          "attribute is already stored"
        );
      });
      it("for two did", async () => {
        expect.assertions(2);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const did1Hash = web3.utils.sha3(did1);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did1, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash: did1Hash,
          firstAttrHash,
          did: did1,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash,
          {
            from: acc1,
          }
        );
        expect(attributeVersions[0]).toStrictEqual(firstAttrHash);

        const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
        const did2Hash = web3.utils.sha3(did2);

        const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
        const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
        const receipt2 = await implV0.insertAdministrator(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash2 = web3.utils.sha3(data2);

        expectEvent(receipt2, "addAdministratorAttribute", {
          didHash: did2Hash,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions2 = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash2,
          {
            from: acc1,
          }
        );
        expect(attributeVersions2[0]).toStrictEqual(firstAttrHash2);
      });
      it("should fail if attribute exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const didHash = web3.utils.sha3(did);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
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
          "administrator already exist use updateAdministrator to add or update an attribute"
        );
      });
    });
    describe("get administrators", () => {
      it("should failed with wrong page size", async () => {
        expect.assertions(0);
        const [acc1] = accounts;

        const implV0 = await Tir.new({from: acc1});

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
          implV0.getAdministrators.call(0, 0, {
            from: acc1,
          }),
          "PageSize should be greater than 0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getAdministrators.call(0, 52, {
            from: acc1,
          }),
          "PageSize should not be greater than 50"
        );
      });
      it("should work with page==0", async () => {
        expect.assertions(17);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});

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
        // page = 0 and pagesize is less than total
        const r0 = await implV0.getAdministrators.call(0, 10, {
          from: acc1,
        });
        expect(r0.items).toHaveLength(10);
        expect(r0).toMatchObject({
          items: expect.arrayContaining([
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
          ]),
        });

        expect(r0.total.toString()).toStrictEqual("11");
        expect(r0.pageSize.toString()).toStrictEqual("10");
        expect(r0.prev.toString()).toStrictEqual("0");
        expect(r0.next.toString()).toStrictEqual("1");

        // page = 0 and pagesize is more than total
        const r1 = await implV0.getAdministrators.call(0, 12, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(11);
        expect(r1).toMatchObject({
          items: expect.arrayContaining([
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
          ]),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.pageSize.toString()).toStrictEqual("11");
        expect(r1.prev.toString()).toStrictEqual("0");
        expect(r1.next.toString()).toStrictEqual("0");

        // page = 0 and pagesize is way less than total
        const r2 = await implV0.getAdministrators.call(0, 2, {
          from: acc1,
        });
        expect(r2).toMatchObject({
          items: ["0", "1"],
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.pageSize.toString()).toStrictEqual("2");
        expect(r2.prev.toString()).toStrictEqual("0");
        expect(r2.next.toString()).toStrictEqual("1");
      });
      it("should work with page==1", async () => {
        expect.assertions(12);
        const [acc1] = accounts;

        const implV0 = await Tir.new({from: acc1});

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

        // page = 1 and pagesize is way less than total
        const r = await implV0.getAdministrators.call(1, 2, {
          from: acc1,
        });
        expect(r.items).toHaveLength(2);
        expect(r).toMatchObject({
          items: expect.arrayContaining(["2", "3"]),
        });
        expect(r.total.toString()).toStrictEqual("11");
        expect(r.pageSize.toString()).toStrictEqual("2");
        expect(r.prev.toString()).toStrictEqual("0");
        expect(r.next.toString()).toStrictEqual("2");

        // page = 1 and pagesize is way more than total
        const r1 = await implV0.getAdministrators.call(1, 42, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(11);
        expect(r1).toMatchObject({
          items: expect.arrayContaining([
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
          ]),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.pageSize.toString()).toStrictEqual("11");
        expect(r1.prev.toString()).toStrictEqual("0");
        expect(r1.next.toString()).toStrictEqual("0");
      });
      it("should work with page==X and pagesize eq total", async () => {
        expect.assertions(12);
        const [acc1] = accounts;

        const implV0 = await Tir.new({from: acc1});

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
        // page = 1 and pagesize is way less than total
        const r = await implV0.getAdministrators.call(1, 11, {
          from: acc1,
        });
        expect(r.items).toHaveLength(11);
        expect(r).toMatchObject({
          items: expect.arrayContaining([
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
          ]),
        });
        expect(r.total.toString()).toStrictEqual("11");
        expect(r.pageSize.toString()).toStrictEqual("11");
        expect(r.prev.toString()).toStrictEqual("0");
        expect(r.next.toString()).toStrictEqual("0");

        const r1 = await implV0.getAdministrators.call(5, 11, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(11);
        expect(r1).toMatchObject({
          items: expect.arrayContaining([
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
          ]),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.pageSize.toString()).toStrictEqual("11");
        expect(r1.prev.toString()).toStrictEqual("0");
        expect(r1.next.toString()).toStrictEqual("0");
      });
      it("should work with page==X and pagesize less than total", async () => {
        expect.assertions(48);
        const [acc1] = accounts;

        const implV0 = await Tir.new({from: acc1});

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
        // page = 3 and pagesize 2
        const r1 = await implV0.getAdministrators.call(3, 2, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(2);
        expect(r1).toMatchObject({
          items: expect.arrayContaining(["6", "7"]),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.pageSize.toString()).toStrictEqual("2");
        expect(r1.prev.toString()).toStrictEqual("2");
        expect(r1.next.toString()).toStrictEqual("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getAdministrators.call(1, 10, {
          from: acc1,
        });
        expect(r2.items).toHaveLength(1);
        expect(r2).toMatchObject({
          items: expect.arrayContaining(["10"]),
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.pageSize.toString()).toStrictEqual("10");
        expect(r2.prev.toString()).toStrictEqual("0");
        expect(r2.next.toString()).toStrictEqual("1");
        // page = 5 and pagesize 2
        const r3 = await implV0.getAdministrators.call(5, 2, {
          from: acc1,
        });
        expect(r3.items).toHaveLength(1);
        expect(r3).toMatchObject({
          items: expect.arrayContaining(["10"]),
        });
        expect(r3.total.toString()).toStrictEqual("11");
        expect(r3.pageSize.toString()).toStrictEqual("2");
        expect(r3.prev.toString()).toStrictEqual("4");
        expect(r3.next.toString()).toStrictEqual("5");
        // page = 6 and pagesize 2
        const r4 = await implV0.getAdministrators.call(6, 2, {
          from: acc1,
        });
        expect(r4.items).toHaveLength(1);
        expect(r4).toMatchObject({
          items: expect.arrayContaining(["10"]),
        });
        expect(r4.total.toString()).toStrictEqual("11");
        expect(r4.pageSize.toString()).toStrictEqual("2");
        expect(r4.prev.toString()).toStrictEqual("4");
        expect(r4.next.toString()).toStrictEqual("5");
        // page = 6565564 and pagesize 2
        const r5 = await implV0.getAdministrators.call(6565564, 2, {
          from: acc1,
        });
        expect(r5.items).toHaveLength(1);
        expect(r5).toMatchObject({
          items: expect.arrayContaining(["10"]),
        });
        expect(r5.total.toString()).toStrictEqual("11");
        expect(r5.pageSize.toString()).toStrictEqual("2");
        expect(r5.prev.toString()).toStrictEqual("4");
        expect(r5.next.toString()).toStrictEqual("5");
        // page = 3 and pagesize 3
        const r6 = await implV0.getAdministrators.call(3, 3, {
          from: acc1,
        });
        expect(r6.items).toHaveLength(2);
        expect(r6).toMatchObject({
          items: expect.arrayContaining(["9", "10"]),
        });
        expect(r6.total.toString()).toStrictEqual("11");
        expect(r6.pageSize.toString()).toStrictEqual("3");
        expect(r6.prev.toString()).toStrictEqual("2");
        expect(r6.next.toString()).toStrictEqual("3");
        // page = 3 and pagesize 3
        const r8 = await implV0.getAdministrators.call(2, 3, {
          from: acc1,
        });
        expect(r8.items).toHaveLength(3);
        expect(r8).toMatchObject({
          items: expect.arrayContaining(["6", "7", "8"]),
        });
        expect(r8.total.toString()).toStrictEqual("11");
        expect(r8.pageSize.toString()).toStrictEqual("3");
        expect(r8.prev.toString()).toStrictEqual("1");
        expect(r8.next.toString()).toStrictEqual("3");
        // page = 65456465 and pagesize 564646545645
        const r7 = await implV0.getAdministrators.call(65456465, 50, {
          from: acc1,
        });
        expect(r7.items).toHaveLength(11);
        expect(r7).toMatchObject({
          items: expect.arrayContaining([
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
          ]),
        });
        expect(r7.total.toString()).toStrictEqual("11");
        expect(r7.pageSize.toString()).toStrictEqual("11");
        expect(r7.prev.toString()).toStrictEqual("0");
        expect(r7.next.toString()).toStrictEqual("0");
      });
    });
    describe("update", () => {
      it("should work", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const newData = "yoloyouuuu";
        const newAttrHash = web3.utils.sha3(newData);
        const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));

        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, inputNewData, firstAttrHash, {
          from: acc1,
        });
        expectEvent(res, "updateAdministratorAttribute", {
          didHash,
          newAttrHash,
          previousAttrHash: firstAttrHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(1),
        });
      });
      it("should fail if administrator does not exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));

        // Event assertions can verify that the arguments are the expected ones

        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes)"](did, inputdata, {
            from: acc1,
          }),
          "administrator does not exist use insertAdministrator to add an administrator"
        );
      });
      it("should fail if lastversHash is incorrect", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const did2 = "did:ebsi:0x2220116F4C145c47C47022565D79E4df50bE90cb";
        const didHash2 = web3.utils.sha3(did2);

        const data2 = "whateverkhfkjsh89798";
        const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
        const receipt2 = await implV0.insertAdministrator(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHashOfSecondDid = web3.utils.sha3(data2);

        expectEvent(receipt2, "addAdministratorAttribute", {
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
          "lastVersHash does not refer to the specified DID"
        );
      });
      it("should fail if attribute exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
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
          "attribute is already stored"
        );
      });
      it("should fail if attribute is new", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
        const receipt = await implV0.insertAdministrator(did, inputdata, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash = web3.utils.sha3(data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const newData = "yoloyouuuu";
        const newAttrHash = web3.utils.sha3(newData);
        const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
        await expectRevert(
          implV0.methods["updateAdministrator(string,bytes,bytes32)"](
            did,
            inputNewData,
            newAttrHash,
            {
              from: acc1,
            }
          ),
          "lastVersHash does not refer to the specified DID"
        );
      });
      it("two different attributes should fail if the second version attribute is already a version of another attribute", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertAdministrator(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = web3.utils.sha3(attr1Data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1NewAttrHash = web3.utils.sha3(attr1NewData);
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr1InputNewData, firstAttr1Hash, {
          from: acc1,
        });

        expectEvent(res, "updateAdministratorAttribute", {
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
        const firstAttr2Hash = web3.utils.sha3(attr2Data);

        expectEvent(receipt2, "updateAdministratorAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        // const attr2NewAttrHash = web3.utils.sha3(attr1NewData);
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
          "attribute is already stored"
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
          "attribute is already stored"
        );
      });
      it("two different attributes", async () => {
        expect.assertions(3);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertAdministrator(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = web3.utils.sha3(attr1Data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1NewAttrHash = web3.utils.sha3(attr1NewData);
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr1InputNewData, firstAttr1Hash, {
          from: acc1,
        });

        expectEvent(res, "updateAdministratorAttribute", {
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
        const firstAttr2Hash = web3.utils.sha3(attr2Data);
        expectEvent(receipt2, "updateAdministratorAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        const attr2NewData = "Newjhkhjyoloyouuuu";
        const attr2NewAttrHash = web3.utils.sha3(attr2NewData);
        const attr2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewData)
        );
        const res2 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr2InputNewData, firstAttr2Hash, {
          from: acc1,
        });

        expectEvent(res2, "updateAdministratorAttribute", {
          didHash,
          newAttrHash: attr2NewAttrHash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(2),
          attributesCount: new BN(2),
        });

        const attr2NewDataV3 = "VeryNewjhkhjyoloyouuuu";
        const attr2NewAttrHashV3 = web3.utils.sha3(attr2NewDataV3);
        const attr2InputNewDataV3 = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewDataV3)
        );
        const res3 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr2InputNewDataV3, attr2NewAttrHash, {
          from: acc1,
        });
        expectEvent(res3, "updateAdministratorAttribute", {
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
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithFirstHash).toStrictEqual(attr2Versions);
        const attributeVersionsWithSecondHash = await implV0.getAdministratorAttributeRevisions(
          attr2Versions[1],
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithSecondHash).toStrictEqual(attr2Versions);
        const attributeVersionsWithThirdHash = await implV0.getAdministratorAttributeRevisions(
          attr2Versions[2],
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithThirdHash).toStrictEqual(attr2Versions);
      });
      it("two different attributes for two did", async () => {
        expect.assertions(4);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
        const didHash = web3.utils.sha3(did);

        const attr1Data =
          "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
        const inputAttr1Data = web3.utils.hexToBytes(
          web3.utils.toHex(attr1Data)
        );
        const receipt = await implV0.insertAdministrator(did, inputAttr1Data, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttr1Hash = web3.utils.sha3(attr1Data);

        expectEvent(receipt, "addAdministratorAttribute", {
          didHash,
          firstAttrHash: firstAttr1Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });
        const attr1NewData = "yoloyouuuu";
        const attr1NewAttrHash = web3.utils.sha3(attr1NewData);
        const attr1InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr1NewData)
        );
        const res = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr1InputNewData, firstAttr1Hash, {
          from: acc1,
        });
        expectEvent(res, "updateAdministratorAttribute", {
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
        const firstAttr2Hash = web3.utils.sha3(attr2Data);

        expectEvent(receipt2, "updateAdministratorAttribute", {
          didHash,
          newAttrHash: firstAttr2Hash,
          previousAttrHash: firstAttr2Hash,
          firstAttrHash: firstAttr2Hash,
          did,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(2),
        });

        const attr2NewData = "Newjhkhjyoloyouuuu";
        const attr2NewAttrHash = web3.utils.sha3(attr2NewData);
        const attr2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(attr2NewData)
        );
        const res2 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did, attr2InputNewData, firstAttr2Hash, {
          from: acc1,
        });
        expectEvent(res2, "updateAdministratorAttribute", {
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
        const did2Hash = web3.utils.sha3(did2);

        const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
        const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
        const receiptDid2 = await implV0.insertAdministrator(did2, inputdata2, {
          from: acc1,
        });

        // Event assertions can verify that the arguments are the expected ones
        const firstAttrHash2 = web3.utils.sha3(data2);

        expectEvent(receiptDid2, "addAdministratorAttribute", {
          didHash: did2Hash,
          firstAttrHash: firstAttrHash2,
          did: did2,
          attributeVersionCount: new BN(1),
          attributesCount: new BN(1),
        });

        const attributeVersions2 = await implV0.getAdministratorAttributeRevisions(
          firstAttrHash2,
          {
            from: acc1,
          }
        );
        expect(attributeVersions2[0]).toStrictEqual(firstAttrHash2);

        const did2AttributNewData = "VeryNewjhkhjyoloyouuuu";
        const did2AttributNewDataHash = web3.utils.sha3(did2AttributNewData);
        const did2InputNewData = web3.utils.hexToBytes(
          web3.utils.toHex(did2AttributNewData)
        );
        const res3 = await implV0.methods[
          "updateAdministrator(string,bytes,bytes32)"
        ](did2, did2InputNewData, firstAttrHash2, {
          from: acc1,
        });

        expectEvent(res3, "updateAdministratorAttribute", {
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
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithFirstHash).toStrictEqual(constDid2Attrib);
        const attributeVersionsWithSecondHash = await implV0.getAdministratorAttributeRevisions(
          constDid2Attrib[1],
          {
            from: acc1,
          }
        );
        expect(attributeVersionsWithSecondHash).toStrictEqual(constDid2Attrib);
        // check with on attribut version from did1
        const attributeVersionsForDid1Attribute = await implV0.getAdministratorAttributeRevisions(
          attr2NewAttrHash,
          {
            from: acc1,
          }
        );
        expect(attributeVersionsForDid1Attribute).toStrictEqual([
          firstAttr2Hash,
          attr2NewAttrHash,
        ]);
      });
    });
  });
});
