const Issuer = artifacts.require("Issuer");
const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");

const assertRevert = require("./helpers/assertRevert");

contract("Issuer", function ([_, acc1, acc2, acc3, acc4, acc5]) {
  beforeEach(async function () {
    this.impl_v0 = await Issuer.new({from: acc1});
  });

  describe("issuer", function () {
    it("get Issuer should return all the latest hashes", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);
      // insert did and attribute1v0
      const attribute1v0 = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
      await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
      });
      const firstAttrHash = web3.utils.sha3(attribute1v0);
      const attribute1v1 = "yoloyouuuu";
      const attr1v1Hash = web3.utils.sha3(attribute1v1);
      const inputNewData = web3.utils.hexToBytes(
        web3.utils.toHex(attribute1v1)
      );
      // update the attribute1 to v1
      await this.impl_v0.updateIssuer(did, inputNewData, firstAttrHash, {
        from: acc1,
      });

      // add new attribute2
      const attr2Data =
        "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const attr2Hash = web3.utils.sha3(attr2Data);
      const inputAttr2Data = web3.utils.hexToBytes(web3.utils.toHex(attr2Data));

      // as we overload update issuer we need to go through methods to test
      await this.impl_v0.methods["updateIssuer(string,bytes)"](
        did,
        inputAttr2Data,
        {
          from: acc1,
        }
      );
      // the latest Attribute hash should be attr1v1Hash and attr2Hash
      const res1 = await this.impl_v0.getIssuer.call(did, {
        from: acc1,
      });

      assert.deepEqual(res1, [attr1v1Hash, attr2Hash]);
      // add a second version to attribute2
      const attr2v1Data = "attr2v1:somedata";
      const attr2v1Hash = web3.utils.sha3(attr2v1Data);
      const inputAttr2v1Data = web3.utils.hexToBytes(
        web3.utils.toHex(attr2v1Data)
      );
      await this.impl_v0.updateIssuer(did, inputAttr2v1Data, attr2Hash, {
        from: acc1,
      });
      // the latest Attribute hash should now be attr1v1Hash and attr2v1Hash
      const res2 = await this.impl_v0.getIssuer.call(did, {
        from: acc1,
      });
      assert.deepEqual(res2, [attr1v1Hash, attr2v1Hash]);

      //add a thrid version to attribute1
      const attr1v2Data = "attr1v2:someotherdata";
      const attr1v2Hash = web3.utils.sha3(attr1v2Data);
      const inputAttr1v2Data = web3.utils.hexToBytes(
        web3.utils.toHex(attr1v2Data)
      );
      await this.impl_v0.updateIssuer(did, inputAttr1v2Data, attr1v1Hash, {
        from: acc1,
      });
      // the latest Attribute hash should now be attr1v2Hash and attr2v1Hash
      const res3 = await this.impl_v0.getIssuer.call(did, {
        from: acc1,
      });
      assert.deepEqual(res3, [attr1v2Hash, attr2v1Hash]);

      // add a third attribute
      const attr3v0Data = "attr3v0:someotherdata";
      const inputAttr3v0Data = web3.utils.hexToBytes(
        web3.utils.toHex(attr3v0Data)
      );
      await this.impl_v0.methods["updateIssuer(string,bytes)"](
        did,
        inputAttr3v0Data,
        {
          from: acc1,
        }
      );
      const attr3v0Hash = web3.utils.sha3(attr3v0Data);
      // the latest Attribute hash should now be attr1v2Hash, attr2v1Hash and attr3v0Hash
      const res4 = await this.impl_v0.getIssuer.call(did, {
        from: acc1,
      });
      assert.deepEqual(res4, [attr1v2Hash, attr2v1Hash, attr3v0Hash]);
    });
    it("get AttributeHistory should return all the version hashes for an attribute", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);
      // insert did and attribute1v0
      const attribute1v0 = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(attribute1v0));
      await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
      });
      const attr1v0Hash = web3.utils.sha3(attribute1v0);
      const attribute1v1 = "yoloyouuuu";
      const attr1v1Hash = web3.utils.sha3(attribute1v1);
      const inputNewData = web3.utils.hexToBytes(
        web3.utils.toHex(attribute1v1)
      );
      // update the attribute1 to v1
      await this.impl_v0.updateIssuer(did, inputNewData, attr1v0Hash, {
        from: acc1,
      });

      // add new attribute2
      const attr2Data =
        "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const attr2v0Hash = web3.utils.sha3(attr2Data);
      const inputAttr2Data = web3.utils.hexToBytes(web3.utils.toHex(attr2Data));

      // as we overload update issuer we need to go through methods to test
      await this.impl_v0.methods["updateIssuer(string,bytes)"](
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
      await this.impl_v0.updateIssuer(did, inputAttr2v1Data, attr2v0Hash, {
        from: acc1,
      });

      //add a thrid version to attribute1
      const attr1v2Data = "attr1v2:someotherdata";
      const attr1v2Hash = web3.utils.sha3(attr1v2Data);
      const inputAttr1v2Data = web3.utils.hexToBytes(
        web3.utils.toHex(attr1v2Data)
      );
      await this.impl_v0.updateIssuer(did, inputAttr1v2Data, attr1v1Hash, {
        from: acc1,
      });

      // add a third attribute
      const attr3v0Data = "attr3v0:someotherdata";
      const inputAttr3v0Data = web3.utils.hexToBytes(
        web3.utils.toHex(attr3v0Data)
      );
      await this.impl_v0.methods["updateIssuer(string,bytes)"](
        did,
        inputAttr3v0Data,
        {
          from: acc1,
        }
      );
      const attr3v0Hash = web3.utils.sha3(attr3v0Data);

      // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
      const resAttr1 = await this.impl_v0.getAttributeHistory.call(
        attr1v0Hash,
        {
          from: acc1,
        }
      );
      const res2Attr1 = await this.impl_v0.getAttributeHistory.call(
        attr1v1Hash,
        {
          from: acc1,
        }
      );
      const res3Attr1 = await this.impl_v0.getAttributeHistory.call(
        attr1v2Hash,
        {
          from: acc1,
        }
      );
      assert.deepEqual(resAttr1, [attr1v0Hash, attr1v1Hash, attr1v2Hash]);
      assert.deepEqual(res2Attr1, [attr1v0Hash, attr1v1Hash, attr1v2Hash]);
      assert.deepEqual(res3Attr1, [attr1v0Hash, attr1v1Hash, attr1v2Hash]);
      // calling getAttributeHistory with attr2v0Hash or attr2v1Hash should return the same array
      const resAttr2 = await this.impl_v0.getAttributeHistory.call(
        attr2v0Hash,
        {
          from: acc1,
        }
      );
      const res2Attr2 = await this.impl_v0.getAttributeHistory.call(
        attr2v1Hash,
        {
          from: acc1,
        }
      );
      assert.deepEqual(resAttr2, [attr2v0Hash, attr2v1Hash]);
      assert.deepEqual(res2Attr2, [attr2v0Hash, attr2v1Hash]);
      // calling getAttributeHistory with attr3v0Hash should return attr3v0Hash
      const resAttr3 = await this.impl_v0.getAttributeHistory.call(
        attr3v0Hash,
        {
          from: acc1,
        }
      );
      assert.deepEqual(resAttr3, [attr3v0Hash]);
    });
    it("get AttributebyHash should return the attribute data and the did", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);
      // insert did and attribute1v0
      const attribute1v0 = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputAttr1v0Data = web3.utils.hexToBytes(
        web3.utils.toHex(attribute1v0)
      );
      await this.impl_v0.insertIssuer(did, inputAttr1v0Data, {
        from: acc1,
      });
      const attr1v0Hash = web3.utils.sha3(attribute1v0);
      const attribute1v1 = "yoloyouuuu";
      const attr1v1Hash = web3.utils.sha3(attribute1v1);
      const inputAttr1v1Data = web3.utils.hexToBytes(
        web3.utils.toHex(attribute1v1)
      );
      // update the attribute1 to v1
      await this.impl_v0.updateIssuer(did, inputAttr1v1Data, attr1v0Hash, {
        from: acc1,
      });
      //add a thrid version to attribute1
      const attribute1v2 = "attr1v2:someotherdata";
      const attr1v2Hash = web3.utils.sha3(attribute1v2);
      const inputAttr1v2Data = web3.utils.hexToBytes(
        web3.utils.toHex(attribute1v2)
      );
      await this.impl_v0.updateIssuer(did, inputAttr1v2Data, attr1v1Hash, {
        from: acc1,
      });

      // add new issuer with attribute
      const did2 = "did:ebsi:0x324565465fd455646545464564654";
      const did2Attr1v0 =
        "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const did2Attr1v0Hash = web3.utils.sha3(did2Attr1v0);
      const inputDid2Attr1v0 = web3.utils.hexToBytes(
        web3.utils.toHex(did2Attr1v0)
      );

      // as we overload update issuer we need to go through methods to test
      await this.impl_v0.insertIssuer(did2, inputDid2Attr1v0, {
        from: acc1,
      });

      // add a second version to attribute2
      const did2Attr1v1 = "attr2v1:somedata";
      const did2Attr1v1Hash = web3.utils.sha3(did2Attr1v1);
      const inputDid2Attr1v1 = web3.utils.hexToBytes(
        web3.utils.toHex(did2Attr1v1)
      );
      await this.impl_v0.updateIssuer(did2, inputDid2Attr1v1, did2Attr1v0Hash, {
        from: acc1,
      });

      // calling getAttributebyHash with attr1v0Hash, attr1v1Hash or attr1v2Hash should did and correct data
      const resAttr1 = await this.impl_v0.getAttributebyHash.call(attr1v0Hash, {
        from: acc1,
      });
      const res2Attr1 = await this.impl_v0.getAttributebyHash.call(
        attr1v1Hash,
        {
          from: acc1,
        }
      );
      const res3Attr1 = await this.impl_v0.getAttributebyHash.call(
        attr1v2Hash,
        {
          from: acc1,
        }
      );
      expect(resAttr1).to.include({
        did,
        attribData: web3.utils.toHex(attribute1v0),
      });
      expect(res2Attr1).to.include({
        did,
        attribData: web3.utils.toHex(attribute1v1),
      });
      expect(res3Attr1).to.include({
        did,
        attribData: web3.utils.toHex(attribute1v2),
      });

      // calling getAttributebyHash with did2Attr1v0Hash or did2Attr1v1Hash
      const resDid2Attr1v0Hash = await this.impl_v0.getAttributebyHash.call(
        did2Attr1v0Hash,
        {
          from: acc1,
        }
      );
      const resDid2Attr1v1Hash = await this.impl_v0.getAttributebyHash.call(
        did2Attr1v1Hash,
        {
          from: acc1,
        }
      );
      expect(resDid2Attr1v0Hash).to.include({
        did: did2,
        attribData: web3.utils.toHex(did2Attr1v0),
      });
      expect(resDid2Attr1v1Hash).to.include({
        did: did2,
        attribData: web3.utils.toHex(did2Attr1v1),
      });
    });
    it("insert", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
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
      const didAttributes = await this.impl_v0.getIssuerAttributesFirstHash(
        did,
        {
          from: acc1,
        }
      );
      assert.equal(didAttributes, firstAttrHash);

      const attributeVersions = await this.impl_v0.getAttributeHistory(
        firstAttrHash,
        {
          from: acc1,
        }
      );
      assert.equal(attributeVersions, firstAttrHash);

      const didFromAttrHash = await this.impl_v0.getDid(firstAttrHash, {
        from: acc1,
      });

      assert.equal(didFromAttrHash, did);
    });
    it("insert for two did should fail if it is the same attribute for both", async function () {
      const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const did1Hash = web3.utils.sha3(did1);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      // add did1 with inputdata
      const receipt = await this.impl_v0.insertIssuer(did1, inputdata, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttrHash = web3.utils.sha3(data);

      expectEvent(receipt, "addIssuerAttribute", {
        didHash: did1Hash,
        firstAttrHash,
        did: did1,
        attributeVersionCount: new BN(1),
        attributesCount: new BN(1),
      });
      const didAttributes = await this.impl_v0.getIssuerAttributesFirstHash(
        did1,
        {
          from: acc1,
        }
      );
      assert.equal(didAttributes, firstAttrHash);

      const attributeVersions = await this.impl_v0.getAttributeHistory(
        firstAttrHash,
        {
          from: acc1,
        }
      );
      assert.equal(attributeVersions, firstAttrHash);

      const didFromAttrHash = await this.impl_v0.getDid(firstAttrHash, {
        from: acc1,
      });

      assert.equal(didFromAttrHash, did1);

      const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
      const did2Hash = web3.utils.sha3(did2);
      // add did2 with the same inputdata
      await assertRevert(
        this.impl_v0.insertIssuer(did2, inputdata, {
          from: acc1,
        }),
        "attribute is already stored"
      );
    });
    it("insert for two did", async function () {
      const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const did1Hash = web3.utils.sha3(did1);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did1, inputdata, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttrHash = web3.utils.sha3(data);

      expectEvent(receipt, "addIssuerAttribute", {
        didHash: did1Hash,
        firstAttrHash,
        did: did1,
        attributeVersionCount: new BN(1),
        attributesCount: new BN(1),
      });
      const didAttributes = await this.impl_v0.getIssuerAttributesFirstHash(
        did1,
        {
          from: acc1,
        }
      );
      assert.equal(didAttributes, firstAttrHash);

      const attributeVersions = await this.impl_v0.getAttributeHistory(
        firstAttrHash,
        {
          from: acc1,
        }
      );
      assert.equal(attributeVersions, firstAttrHash);

      const didFromAttrHash = await this.impl_v0.getDid(firstAttrHash, {
        from: acc1,
      });

      assert.equal(didFromAttrHash, did1);

      const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
      const did2Hash = web3.utils.sha3(did2);

      const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
      const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
      const receipt2 = await this.impl_v0.insertIssuer(did2, inputdata2, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttrHash2 = web3.utils.sha3(data2);

      expectEvent(receipt2, "addIssuerAttribute", {
        didHash: did2Hash,
        firstAttrHash: firstAttrHash2,
        did: did2,
        attributeVersionCount: new BN(1),
        attributesCount: new BN(1),
      });
      const didAttributes2 = await this.impl_v0.getIssuerAttributesFirstHash(
        did2,
        {
          from: acc1,
        }
      );
      assert.equal(didAttributes2, firstAttrHash2);

      const attributeVersions2 = await this.impl_v0.getAttributeHistory(
        firstAttrHash2,
        {
          from: acc1,
        }
      );
      assert.equal(attributeVersions2, firstAttrHash2);

      const didFromAttrHash2 = await this.impl_v0.getDid(firstAttrHash2, {
        from: acc1,
      });

      assert.equal(didFromAttrHash2, did2);
    });
    it("insert should fail if attribute exists", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
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
      await assertRevert(
        this.impl_v0.insertIssuer(did, inputdata, {
          from: acc1,
        }),
        "issuer already exist use updateIssuer to add or update an attribute"
      );
    });
    it("update", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
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
      const newData = "yoloyouuuu";
      const newAttrHash = web3.utils.sha3(newData);
      const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
      const res = await this.impl_v0.updateIssuer(
        did,
        inputNewData,
        firstAttrHash,
        {
          from: acc1,
        }
      );

      expectEvent(res, "updateIssuerAttribute", {
        didHash,
        newAttrHash,
        previousAttrHash: firstAttrHash,
        firstAttrHash,
        did,
        attributeVersionCount: new BN(2),
        attributesCount: new BN(1),
      });
    });
    it("update should fail if issuer does not exists", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));

      // Event assertions can verify that the arguments are the expected ones
      const firstAttrHash = web3.utils.sha3(data);

      await assertRevert(
        this.impl_v0.methods["updateIssuer(string,bytes)"](did, inputdata, {
          from: acc1,
        }),
        "issuer does not exist use insertIssuer to add an issuer"
      );
    });
    it("update should fail if lastversHash is incorrect", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
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

      const did2 = "did:ebsi:0x2220116F4C145c47C47022565D79E4df50bE90cb";
      const didHash2 = web3.utils.sha3(did2);

      const data2 = "whateverkhfkjsh89798";
      const inputdata2 = web3.utils.hexToBytes(web3.utils.toHex(data2));
      const receipt2 = await this.impl_v0.insertIssuer(did2, inputdata2, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttrHashOfSecondDid = web3.utils.sha3(data2);

      expectEvent(receipt2, "addIssuerAttribute", {
        didHash: didHash2,
        firstAttrHash: firstAttrHashOfSecondDid,
        did: did2,
        attributeVersionCount: new BN(1),
        attributesCount: new BN(1),
      });
      await assertRevert(
        this.impl_v0.updateIssuer(did2, inputdata, firstAttrHash, {
          from: acc1,
        }),
        "lastVersHash does not refer to the specified DID"
      );
    });
    it("update should fail if attribute exists", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
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
      await assertRevert(
        this.impl_v0.updateIssuer(did, inputdata, firstAttrHash, {
          from: acc1,
        }),
        "attribute is already stored"
      );
    });
    it("update should fail if attribute is new", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
      const receipt = await this.impl_v0.insertIssuer(did, inputdata, {
        from: acc1,
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
      const newData = "yoloyouuuu";
      const newAttrHash = web3.utils.sha3(newData);
      const inputNewData = web3.utils.hexToBytes(web3.utils.toHex(newData));
      await assertRevert(
        this.impl_v0.updateIssuer(did, inputNewData, newAttrHash, {
          from: acc1,
        }),
        "lastVersHash does not refer to the specified DID"
      );
    });
    it("update two different attributes should fail if the second version attribute is already a version of another attribute", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const attr1Data =
        "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputAttr1Data = web3.utils.hexToBytes(web3.utils.toHex(attr1Data));
      const receipt = await this.impl_v0.insertIssuer(did, inputAttr1Data, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttr1Hash = web3.utils.sha3(attr1Data);

      expectEvent(receipt, "addIssuerAttribute", {
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
      const res = await this.impl_v0.updateIssuer(
        did,
        attr1InputNewData,
        firstAttr1Hash,
        {
          from: acc1,
        }
      );

      expectEvent(res, "updateIssuerAttribute", {
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
      const inputAttr2Data = web3.utils.hexToBytes(web3.utils.toHex(attr2Data));
      // as we overload update issuer we need to go through methods to test
      const receipt2 = await this.impl_v0.methods["updateIssuer(string,bytes)"](
        did,
        inputAttr2Data,
        {
          from: acc1,
        }
      );
      // Event assertions can verify that the arguments are the expected ones
      const firstAttr2Hash = web3.utils.sha3(attr2Data);

      expectEvent(receipt2, "updateIssuerAttribute", {
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

      await assertRevert(
        this.impl_v0.updateIssuer(did, attr2InputNewData, firstAttr2Hash, {
          from: acc1,
        }),
        "attribute is already stored"
      );
      // same data than attr1 v1
      const attr2InputNewData2 = web3.utils.hexToBytes(
        web3.utils.toHex(attr1Data)
      );
      await assertRevert(
        this.impl_v0.updateIssuer(did, attr2InputNewData2, firstAttr2Hash, {
          from: acc1,
        }),
        "attribute is already stored"
      );
    });
    it("update two different attributes", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const attr1Data =
        "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputAttr1Data = web3.utils.hexToBytes(web3.utils.toHex(attr1Data));
      const receipt = await this.impl_v0.insertIssuer(did, inputAttr1Data, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttr1Hash = web3.utils.sha3(attr1Data);

      expectEvent(receipt, "addIssuerAttribute", {
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
      const res = await this.impl_v0.updateIssuer(
        did,
        attr1InputNewData,
        firstAttr1Hash,
        {
          from: acc1,
        }
      );

      expectEvent(res, "updateIssuerAttribute", {
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
      const inputAttr2Data = web3.utils.hexToBytes(web3.utils.toHex(attr2Data));

      // as we overload update issuer we need to go through methods to test
      const receipt2 = await this.impl_v0.methods["updateIssuer(string,bytes)"](
        did,
        inputAttr2Data,
        {
          from: acc1,
        }
      );
      // Event assertions can verify that the arguments are the expected ones
      const firstAttr2Hash = web3.utils.sha3(attr2Data);
      expectEvent(receipt2, "updateIssuerAttribute", {
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
      const res2 = await this.impl_v0.updateIssuer(
        did,
        attr2InputNewData,
        firstAttr2Hash,
        {
          from: acc1,
        }
      );

      expectEvent(res2, "updateIssuerAttribute", {
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
      const res3 = await this.impl_v0.updateIssuer(
        did,
        attr2InputNewDataV3,
        attr2NewAttrHash,
        {
          from: acc1,
        }
      );

      expectEvent(res3, "updateIssuerAttribute", {
        didHash,
        newAttrHash: attr2NewAttrHashV3,
        previousAttrHash: attr2NewAttrHash,
        firstAttrHash: firstAttr2Hash,
        did,
        attributeVersionCount: new BN(3),
        attributesCount: new BN(2),
      });

      // check that we retrieve the versions hashes
      const didAttributes = await this.impl_v0.getIssuerAttributesFirstHash(
        did,
        {
          from: acc1,
        }
      );
      assert.deepEqual(didAttributes, [firstAttr1Hash, firstAttr2Hash]);
      const attr2Versions = [
        firstAttr2Hash,
        attr2NewAttrHash,
        attr2NewAttrHashV3,
      ];
      const attributeVersionsWithFirstHash = await this.impl_v0.getAttributeHistory(
        attr2Versions[0],
        {
          from: acc1,
        }
      );
      assert.deepEqual(attributeVersionsWithFirstHash, attr2Versions);
      const attributeVersionsWithSecondHash = await this.impl_v0.getAttributeHistory(
        attr2Versions[1],
        {
          from: acc1,
        }
      );
      assert.deepEqual(attributeVersionsWithSecondHash, attr2Versions);
      const attributeVersionsWithThirdHash = await this.impl_v0.getAttributeHistory(
        attr2Versions[2],
        {
          from: acc1,
        }
      );
      assert.deepEqual(attributeVersionsWithThirdHash, attr2Versions);
    });
    it("update two different attributes for two did", async function () {
      const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
      const didHash = web3.utils.sha3(did);

      const attr1Data =
        "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
      const inputAttr1Data = web3.utils.hexToBytes(web3.utils.toHex(attr1Data));
      const receipt = await this.impl_v0.insertIssuer(did, inputAttr1Data, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttr1Hash = web3.utils.sha3(attr1Data);

      expectEvent(receipt, "addIssuerAttribute", {
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
      const res = await this.impl_v0.updateIssuer(
        did,
        attr1InputNewData,
        firstAttr1Hash,
        {
          from: acc1,
        }
      );

      expectEvent(res, "updateIssuerAttribute", {
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
      const inputAttr2Data = web3.utils.hexToBytes(web3.utils.toHex(attr2Data));

      // as we overload update issuer we need to go through methods to test
      const receipt2 = await this.impl_v0.methods["updateIssuer(string,bytes)"](
        did,
        inputAttr2Data,
        {
          from: acc1,
        }
      );

      // Event assertions can verify that the arguments are the expected ones
      const firstAttr2Hash = web3.utils.sha3(attr2Data);

      expectEvent(receipt2, "updateIssuerAttribute", {
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
      const res2 = await this.impl_v0.updateIssuer(
        did,
        attr2InputNewData,
        firstAttr2Hash,
        {
          from: acc1,
        }
      );

      expectEvent(res2, "updateIssuerAttribute", {
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
      const receiptDid2 = await this.impl_v0.insertIssuer(did2, inputdata2, {
        from: acc1,
      });

      // Event assertions can verify that the arguments are the expected ones
      const firstAttrHash2 = web3.utils.sha3(data2);

      expectEvent(receiptDid2, "addIssuerAttribute", {
        didHash: did2Hash,
        firstAttrHash: firstAttrHash2,
        did: did2,
        attributeVersionCount: new BN(1),
        attributesCount: new BN(1),
      });
      const didAttributes2 = await this.impl_v0.getIssuerAttributesFirstHash(
        did2,
        {
          from: acc1,
        }
      );
      assert.equal(didAttributes2, firstAttrHash2);

      const attributeVersions2 = await this.impl_v0.getAttributeHistory(
        firstAttrHash2,
        {
          from: acc1,
        }
      );
      assert.equal(attributeVersions2, firstAttrHash2);

      const didFromAttrHash2 = await this.impl_v0.getDid(firstAttrHash2, {
        from: acc1,
      });

      assert.equal(didFromAttrHash2, did2);

      const did2AttributNewData = "VeryNewjhkhjyoloyouuuu";
      const did2AttributNewDataHash = web3.utils.sha3(did2AttributNewData);
      const did2InputNewData = web3.utils.hexToBytes(
        web3.utils.toHex(did2AttributNewData)
      );
      const res3 = await this.impl_v0.updateIssuer(
        did2,
        did2InputNewData,
        firstAttrHash2,
        {
          from: acc1,
        }
      );

      expectEvent(res3, "updateIssuerAttribute", {
        didHash: did2Hash,
        newAttrHash: did2AttributNewDataHash,
        previousAttrHash: firstAttrHash2,
        firstAttrHash: firstAttrHash2,
        did: did2,
        attributeVersionCount: new BN(2),
        attributesCount: new BN(1),
      });

      // check that we retrieve the did attribute
      const didAttributes = await this.impl_v0.getIssuerAttributesFirstHash(
        did2,
        {
          from: acc1,
        }
      );
      // we should have only one attribute for did2
      assert.deepEqual(didAttributes, [firstAttrHash2]);
      // we should have two attribute version for did2's attribute
      const constDid2Attrib = [firstAttrHash2, did2AttributNewDataHash];
      const attributeVersionsWithFirstHash = await this.impl_v0.getAttributeHistory(
        constDid2Attrib[0],
        {
          from: acc1,
        }
      );
      assert.deepEqual(attributeVersionsWithFirstHash, constDid2Attrib);
      const attributeVersionsWithSecondHash = await this.impl_v0.getAttributeHistory(
        constDid2Attrib[1],
        {
          from: acc1,
        }
      );
      assert.deepEqual(attributeVersionsWithSecondHash, constDid2Attrib);
      // check with on attribut version from did1
      const attributeVersionsForDid1Attribute = await this.impl_v0.getAttributeHistory(
        attr2NewAttrHash,
        {
          from: acc1,
        }
      );
      assert.deepEqual(attributeVersionsForDid1Attribute, [
        firstAttr2Hash,
        attr2NewAttrHash,
      ]);
    });
  });
});
