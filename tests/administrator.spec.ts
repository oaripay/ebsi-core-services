import { ethers } from "hardhat";
import { Contract } from "ethers";
import { expect } from "chai";

describe("Administrator", () => {
  let ts: Contract;
  const resGetAttributeHash = [...Array(11).keys()].map((i) =>
    ethers.utils.sha256(ethers.utils.toUtf8Bytes(`data-update-${i}`))
  );
  const resAttributeHash = [...Array(11).keys()].map((i) => i.toString());
  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();

    const policyFactory = await ethers.getContractFactory("PolicyLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const policyLib = await policyFactory.deploy();

    const adminFactory = await ethers.getContractFactory("AdministratorLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const adminLib = await adminFactory.deploy();

    const hashAlgoFactory = await ethers.getContractFactory("HashAlgoLib", {});
    const hashAlgoLib = await hashAlgoFactory.deploy();

    const didTimestampFactory = await ethers.getContractFactory(
      "DidTimestampLib"
    );
    const didTimestampLib = await didTimestampFactory.deploy();

    const didMethodFactory = await ethers.getContractFactory("DidMethodLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const didMethodLib = await didMethodFactory.deploy();

    const didRecordFactory = await ethers.getContractFactory("DidRecordLib", {
      libraries: {
        Pagination: paginationLib.address,
      },
    });
    const didRecordLib = await didRecordFactory.deploy();

    const contractFactory = await ethers.getContractFactory("DidRegistry", {
      libraries: {
        PolicyLib: policyLib.address,
        AdministratorLib: adminLib.address,
        HashAlgoLib: hashAlgoLib.address,
        DidTimestampLib: didTimestampLib.address,
        DidMethodLib: didMethodLib.address,
        DidRecordLib: didRecordLib.address,
      },
    });
    ts = await contractFactory.deploy();
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    expect(ts.address).to.properAddress;
  });
  it("get administrator should revert for an unknown did", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    // insert did and attribute1v0
    const attribute1v0 = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await ts.insertAdministrator(did, ethers.utils.hexlify(attribute1v0));
    // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
    await expect(ts.getAdministrator("notexistingdid")).to.revertedWith(
      "admin unknown"
    );
  });
  it("get administrator should return all the latest hashes", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    // insert did and attribute1v0
    const attribute1v0 = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await ts.insertAdministrator(did, ethers.utils.hexlify(attribute1v0));
    const firstAttrHash = ethers.utils.sha256(attribute1v0);
    const attribute1v1 = "yoloyouuuu";
    const inputNewData = ethers.utils.toUtf8Bytes(attribute1v1);
    const attr1v1Hash = ethers.utils.sha256(inputNewData);

    // update the attribute1 to v1
    // as we overload update administrator we need to go through methods to test
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputNewData,
      firstAttrHash
    );

    // add new attribute2
    const attr2Data = "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr2Data = ethers.utils.toUtf8Bytes(attr2Data);

    const attr2Hash = ethers.utils.sha256(inputAttr2Data);

    // as we overload update administrator we need to go through methods to test
    await ts.functions["updateAdministrator(string,bytes)"](
      did,
      inputAttr2Data
    );
    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res1 = await ts.getAdministrator(did);

    expect(res1).to.deep.equal([attr1v1Hash, attr2Hash]);
    // add a second version to attribute2
    const attr2v1Data = "attr2v1:somedata";
    const inputAttr2v1Data = ethers.utils.toUtf8Bytes(attr2v1Data);
    const attr2v1Hash = ethers.utils.sha256(inputAttr2v1Data);
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputAttr2v1Data,
      attr2Hash
    );
    // the latest Attribute hash should now be attr1v1Hash and attr2v1Hash
    const res2 = await ts.getAdministrator(did);
    expect(res2).to.deep.equal([attr1v1Hash, attr2v1Hash]);

    // add a thrid version to attribute1
    const attr1v2Data = "attr1v2:someotherdata";
    const inputAttr1v2Data = ethers.utils.toUtf8Bytes(attr1v2Data);
    const attr1v2Hash = ethers.utils.sha256(inputAttr1v2Data);
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputAttr1v2Data,
      attr1v1Hash
    );
    // the latest Attribute hash should now be attr1v2Hash and attr2v1Hash
    const res3 = await ts.getAdministrator(did);
    expect(res3).to.deep.equal([attr1v2Hash, attr2v1Hash]);

    // add a third attribute
    const attr3v0Data = "attr3v0:someotherdata";
    const inputAttr3v0Data = ethers.utils.toUtf8Bytes(attr3v0Data);
    await ts.functions["updateAdministrator(string,bytes)"](
      did,
      inputAttr3v0Data
    );
    const attr3v0Hash = ethers.utils.sha256(inputAttr3v0Data);
    // the latest Attribute hash should now be attr1v2Hash, attr2v1Hash and attr3v0Hash
    const res4 = await ts.getAdministrator(did);
    expect(res4).to.deep.equal([attr1v2Hash, attr2v1Hash, attr3v0Hash]);
  });
  it("get administrator attributeHistory should return all the version hashes for an attribute", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    // insert did and attribute1v0

    const inputdata = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await ts.insertAdministrator(did, inputdata);
    const attr1v0Hash = ethers.utils.sha256(inputdata);
    const attribute1v1 = "yoloyouuuu";
    const inputNewData = ethers.utils.toUtf8Bytes(attribute1v1);
    const attr1v1Hash = ethers.utils.sha256(inputNewData);
    // update the attribute1 to v1
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputNewData,
      attr1v0Hash
    );
    // add new attribute2
    const attr2Data = "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr2Data = ethers.utils.toUtf8Bytes(attr2Data);
    const attr2v0Hash = ethers.utils.sha256(inputAttr2Data);
    // as we overload update administrator we need to go through methods to test
    await ts.functions["updateAdministrator(string,bytes)"](
      did,
      inputAttr2Data
    );

    // add a second version to attribute2
    const attr2v1Data = "attr2v1:somedata";
    const inputAttr2v1Data = ethers.utils.toUtf8Bytes(attr2v1Data);
    const attr2v1Hash = ethers.utils.sha256(inputAttr2v1Data);
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputAttr2v1Data,
      attr2v0Hash
    );
    // add a thrid version to attribute1
    const attr1v2Data = "attr1v2:someotherdata";
    const inputAttr1v2Data = ethers.utils.toUtf8Bytes(attr1v2Data);
    const attr1v2Hash = ethers.utils.sha256(inputAttr1v2Data);
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputAttr1v2Data,
      attr1v1Hash
    );
    // add a third attribute
    const attr3v0Data = "attr3v0:someotherdata";
    const inputAttr3v0Data = ethers.utils.toUtf8Bytes(attr3v0Data);
    await ts.functions["updateAdministrator(string,bytes)"](
      did,
      inputAttr3v0Data
    );
    const attr3v0Hash = ethers.utils.sha256(inputAttr3v0Data);

    // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
    const resAttr1 = await ts.getAdministratorAttributeRevisions(
      attr1v0Hash,
      1,
      10
    );
    const res2Attr1 = await ts.getAdministratorAttributeRevisions(
      attr1v1Hash,
      1,
      10
    );
    const res3Attr1 = await ts.getAdministratorAttributeRevisions(
      attr1v2Hash,
      1,
      10
    );
    expect(resAttr1.items).to.deep.equal([
      attr1v0Hash,
      attr1v1Hash,
      attr1v2Hash,
    ]);
    expect(res2Attr1.items).to.deep.equal([
      attr1v0Hash,
      attr1v1Hash,
      attr1v2Hash,
    ]);
    expect(res3Attr1.items).to.deep.equal([
      attr1v0Hash,
      attr1v1Hash,
      attr1v2Hash,
    ]);
    // calling getAttributeHistory with attr2v0Hash or attr2v1Hash should return the same array
    const resAttr2 = await ts.getAdministratorAttributeRevisions(
      attr2v0Hash,
      1,
      10
    );
    const res2Attr2 = await ts.getAdministratorAttributeRevisions(
      attr2v1Hash,
      1,
      10
    );
    expect(resAttr2.items).to.deep.equal([attr2v0Hash, attr2v1Hash]);
    expect(res2Attr2.items).to.deep.equal([attr2v0Hash, attr2v1Hash]);
    // calling getAttributeHistory with attr3v0Hash should return attr3v0Hash
    const resAttr3 = await ts.getAdministratorAttributeRevisions(
      attr3v0Hash,
      1,
      10
    );
    expect(resAttr3.items).to.deep.equal([attr3v0Hash]);
  });
  it("get administrator attributeRevisions should revert for an unknown hash", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    // insert did and attribute1v0
    const inputdata = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await ts.insertAdministrator(did, inputdata);

    // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
    await expect(
      ts.getAdministratorAttributeRevisions(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("notexistinghash")),
        1,
        10
      )
    ).to.be.revertedWith("attr unknown");
  });
  it("get administrator attributebyHash should revert for an unknown hash", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    // insert did and attribute1v0
    const inputdata = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await ts.insertAdministrator(did, inputdata);

    // calling getAttributeHistory with attr1v0Hash, attr1v1Hash or attr1v2Hash should return the same array
    await expect(
      ts.getAdministratorAttributeByHash(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("notexistinghash"))
      )
    ).to.be.revertedWith("attr unknown");
  });
  it("get administrator attributebyHash should return the attribute data and the did", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    // insert did and attribute1v0
    const inputAttr1v0Data = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await ts.insertAdministrator(did, inputAttr1v0Data);
    const attr1v0Hash = ethers.utils.sha256(inputAttr1v0Data);
    const attribute1v1 = "yoloyouuuu";
    const inputAttr1v1Data = ethers.utils.toUtf8Bytes(attribute1v1);
    const attr1v1Hash = ethers.utils.sha256(inputAttr1v1Data);
    // update the attribute1 to v1
    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputAttr1v1Data,
      attr1v0Hash
    );
    // add a thrid version to attribute1
    const attribute1v2 = "attr1v2:someotherdata";
    const inputAttr1v2Data = ethers.utils.toUtf8Bytes(attribute1v2);
    const attr1v2Hash = ethers.utils.sha256(inputAttr1v2Data);

    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did,
      inputAttr1v2Data,
      attr1v1Hash
    );
    // add new administrator with attribute
    const did2 = "did:ebsi:0x324565465fd455646545464564654";
    const did2Attr1v0 =
      "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputDid2Attr1v0 = ethers.utils.toUtf8Bytes(did2Attr1v0);
    const did2Attr1v0Hash = ethers.utils.sha256(inputDid2Attr1v0);

    // as we overload update administrator we need to go through methods to test
    await ts.insertAdministrator(did2, inputDid2Attr1v0);

    // add a second version to attribute2
    const did2Attr1v1 = "attr2v1:somedata";
    const inputDid2Attr1v1 = ethers.utils.toUtf8Bytes(did2Attr1v1);
    const did2Attr1v1Hash = ethers.utils.sha256(inputDid2Attr1v1);

    await ts.functions["updateAdministrator(string,bytes,bytes32)"](
      did2,
      inputDid2Attr1v1,
      did2Attr1v0Hash
    );
    // calling getAttributebyHash with attr1v0Hash, attr1v1Hash or attr1v2Hash should did and correct data
    const resAttr1 = await ts.getAdministratorAttributeByHash(attr1v0Hash);
    const res2Attr1 = await ts.getAdministratorAttributeByHash(attr1v1Hash);
    const res3Attr1 = await ts.getAdministratorAttributeByHash(attr1v2Hash);

    expect(resAttr1).to.deep.equal([
      did,
      ethers.utils.hexlify(inputAttr1v0Data),
    ]);
    expect(res2Attr1).to.deep.equal([
      did,
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(attribute1v1)),
    ]);
    expect(res3Attr1).to.deep.equal([
      did,
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(attribute1v2)),
    ]);

    // calling getAttributebyHash with did2Attr1v0Hash or did2Attr1v1Hash
    const resDid2Attr1v0Hash = await ts.getAdministratorAttributeByHash(
      did2Attr1v0Hash
    );
    const resDid2Attr1v1Hash = await ts.getAdministratorAttributeByHash(
      did2Attr1v1Hash
    );
    expect(resDid2Attr1v0Hash).to.deep.equal([
      did2,
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(did2Attr1v0)),
    ]);
    expect(resDid2Attr1v1Hash).to.deep.equal([
      did2,
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(did2Attr1v1)),
    ]);
  });

  it("get attributebyHash should failed with wrong page size", async () => {
    const did = `didi`;
    const firstinputdata = ethers.utils.toUtf8Bytes("data-update-0");
    const didFirstInputHash = ethers.utils.sha256(firstinputdata);
    await ts.insertAdministrator(did, firstinputdata);
    for (let i = 1; i < 11; i += 1) {
      const data = `data-update-${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        inputdata,
        didFirstInputHash
      );
    }

    // pagesize = 0 should revert
    await expect(
      ts.getAdministratorAttributeRevisions(didFirstInputHash, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(
      ts.getAdministratorAttributeRevisions(didFirstInputHash, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getAdministratorAttributeRevisions(didFirstInputHash, 1, 52)
    ).to.be.revertedWith("PSize not <=50");
  });
  it("get attributebyHash should work", async () => {
    const did = `didi`;
    const firstinputdata = ethers.utils.toUtf8Bytes("data-update-0");
    const didFirstInputHash = ethers.utils.sha256(firstinputdata);
    await ts.insertAdministrator(did, firstinputdata);
    for (let i = 1; i < 11; i += 1) {
      const data = `data-update-${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        inputdata,
        didFirstInputHash
      );
    }

    // page = 1 and pagesize is way less than total
    const r = await ts.getAdministratorAttributeRevisions(
      didFirstInputHash,
      1,
      2
    );
    expect(r.items).to.deep.equal(resGetAttributeHash.slice(0, 2));
    expect(r.total.toString()).to.deep.equal("11");
    expect(r.howMany.toString()).to.deep.equal("2");
    expect(r.prev.toString()).to.deep.equal("1");
    expect(r.next.toString()).to.deep.equal("2");

    // page = 1 and pagesize is way less than total
    const r2 = await ts.getAdministratorAttributeRevisions(
      didFirstInputHash,
      1,
      11
    );
    expect(r2.items).to.deep.equal(resGetAttributeHash);
    expect(r2.total.toString()).to.deep.equal("11");
    expect(r2.howMany.toString()).to.deep.equal("11");
    expect(r2.prev.toString()).to.deep.equal("1");
    expect(r2.next.toString()).to.deep.equal("1");

    // page = 1 and pagesize is way more than total
    const r1 = await ts.getAdministratorAttributeRevisions(
      didFirstInputHash,
      1,
      42
    );
    expect(r1.items).to.deep.equal(resGetAttributeHash);
    expect(r1.total.toString()).to.deep.equal("11");
    expect(r1.howMany.toString()).to.deep.equal("11");
    expect(r1.prev.toString()).to.deep.equal("1");
    expect(r1.next.toString()).to.deep.equal("1");
  });

  it("insert should work", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones

    const firstAttrHash = ethers.utils.sha256(inputdata);

    await expect(ts.insertAdministrator(did, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttrHash, did, 1, 1);

    const attributeVersions = await ts.getAdministratorAttributeRevisions(
      firstAttrHash,
      1,
      10
    );
    expect(attributeVersions.items[0]).to.deep.equal(firstAttrHash);
  });
  it("insert for two did should fail if it is the same attribute for both", async () => {
    const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const did1Hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did1));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);

    // add did1 with inputdata
    await expect(ts.insertAdministrator(did1, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(did1Hash, firstAttrHash, did1, 1, 1);

    const attributeVersions = await ts.getAdministratorAttributeRevisions(
      firstAttrHash,
      1,
      10
    );
    expect(attributeVersions.items[0]).to.deep.equal(firstAttrHash);

    const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
    // add did2 with the same inputdata
    await expect(ts.insertAdministrator(did2, inputdata)).to.be.revertedWith(
      "attr exist"
    );
  });
  it("insert for two did", async () => {
    const did1 = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const did1Hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did1));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);

    await expect(ts.insertAdministrator(did1, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(did1Hash, firstAttrHash, did1, 1, 1);

    const attributeVersions = await ts.getAdministratorAttributeRevisions(
      firstAttrHash,
      1,
      10
    );
    expect(attributeVersions.items[0]).to.deep.equal(firstAttrHash);

    const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
    const did2Hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did2));

    const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
    const inputdata2 = ethers.utils.toUtf8Bytes(data2);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash2 = ethers.utils.sha256(inputdata2);

    await expect(ts.insertAdministrator(did2, inputdata2))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(did2Hash, firstAttrHash2, did2, 1, 1);

    const attributeVersions2 = await ts.getAdministratorAttributeRevisions(
      firstAttrHash2,
      1,
      10
    );
    expect(attributeVersions2.items[0]).to.deep.equal(firstAttrHash2);
  });
  it("insert should fail if attribute exists", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);

    await expect(ts.insertAdministrator(did, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttrHash, did, 1, 1);

    await expect(ts.insertAdministrator(did, inputdata)).to.be.revertedWith(
      "admin exist"
    );
  });

  it("get administrators should failed with wrong page size", async () => {
    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertAdministrator(did, inputdata);
    }

    // pagesize = 0 should revert
    await expect(ts.getAdministrators(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getAdministrators(0, 10)).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(ts.getAdministrators(1, 52)).to.be.revertedWith(
      "PSize not <=50"
    );
  });
  it("get administrators should work with page==X and pagesize eq total", async () => {
    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertAdministrator(did, inputdata);
    }
    // page = 1 and pagesize is equal to the total
    const r = await ts.getAdministrators(1, 11);

    expect(r.items).to.deep.equal(resAttributeHash);
    expect(r.total.toString()).to.deep.equal("11");
    expect(r.howMany.toString()).to.deep.equal("11");
    expect(r.prev.toString()).to.deep.equal("1");
    expect(r.next.toString()).to.deep.equal("1");

    const r1 = await ts.getAdministrators(5, 11);

    expect(r1.items).to.deep.equal([]);
    expect(r1.total.toString()).to.deep.equal("11");
    expect(r1.howMany.toString()).to.deep.equal("0");
    expect(r1.prev.toString()).to.deep.equal("1");
    expect(r1.next.toString()).to.deep.equal("1");
  });

  it("update should work", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);
    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);
    await expect(ts.insertAdministrator(did, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttrHash, did, 1, 1);
    const newData = "yoloyouuuu";
    const inputNewData = ethers.utils.toUtf8Bytes(newData);
    const newAttrHash = ethers.utils.sha256(inputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        inputNewData,
        firstAttrHash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(didHash, newAttrHash, firstAttrHash, firstAttrHash, did, 2, 1);
  });
  it("update should fail if admin unknowns", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones
    await expect(
      ts.functions["updateAdministrator(string,bytes)"](did, inputdata)
    ).to.be.revertedWith("admin unknown");
  });
  it("update should fail if lastversHash is incorrect", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);
    await expect(ts.insertAdministrator(did, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttrHash, did, 1, 1);

    const did2 = "did:ebsi:0x2220116F4C145c47C47022565D79E4df50bE90cb";
    const didHash2 = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did2));

    const data2 = "whateverkhfkjsh89798";
    const inputdata2 = ethers.utils.toUtf8Bytes(data2);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHashOfSecondDid = ethers.utils.sha256(inputdata2);

    await expect(ts.insertAdministrator(did2, inputdata2))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash2, firstAttrHashOfSecondDid, did2, 1, 1);
    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did2,
        inputdata,
        firstAttrHash
      )
    ).to.be.revertedWith("lastVers != DID");
  });
  it("update should fail if attribute exists", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);

    await expect(ts.insertAdministrator(did, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttrHash, did, 1, 1);
    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        inputdata,
        firstAttrHash
      )
    ).to.be.revertedWith("attr exist");
  });
  it("update should fail if attribute is new", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const data = ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputdata = ethers.utils.toUtf8Bytes(data);
    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash = ethers.utils.sha256(inputdata);

    await expect(ts.insertAdministrator(did, inputdata))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttrHash, did, 1, 1);

    const newData = "yoloyouuuu";
    const inputNewData = ethers.utils.toUtf8Bytes(newData);
    const newAttrHash = ethers.utils.sha256(inputNewData);
    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        inputNewData,
        newAttrHash
      )
    ).to.be.revertedWith("lastVers != DID");
  });
  it("update two different attributes should fail if the second version attribute is already a version of another attribute", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const attr1Data = "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr1Data = ethers.utils.toUtf8Bytes(attr1Data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttr1Hash = ethers.utils.sha256(inputAttr1Data);
    await expect(ts.insertAdministrator(did, inputAttr1Data))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttr1Hash, did, 1, 1);

    const attr1NewData = "yoloyouuuu";
    const attr1InputNewData = ethers.utils.toUtf8Bytes(attr1NewData);
    const attr1NewAttrHash = ethers.utils.sha256(attr1InputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr1InputNewData,
        firstAttr1Hash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        attr1NewAttrHash,
        firstAttr1Hash,
        firstAttr1Hash,
        did,
        2,
        1
      );

    // -------------Second Attributes-------------------
    const attr2Data = "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr2Data = ethers.utils.toUtf8Bytes(attr2Data);
    // as we overload update administrator we need to go through methods to test

    // Event assertions can verify that the arguments are the expected ones
    const firstAttr2Hash = ethers.utils.sha256(inputAttr2Data);

    await expect(
      ts.functions["updateAdministrator(string,bytes)"](did, inputAttr2Data)
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        firstAttr2Hash,
        firstAttr2Hash,
        firstAttr2Hash,
        did,
        1,
        2
      );

    // const attr2NewAttrHash = ethers.utils.sha256(attr1NewData);
    // same data than attr1 v2
    const attr2InputNewData = ethers.utils.toUtf8Bytes(attr1NewData);
    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr2InputNewData,
        firstAttr2Hash
      )
    ).to.be.revertedWith("attr exist");
    // same data than attr1 v1
    const attr2InputNewData2 = ethers.utils.toUtf8Bytes(attr1Data);
    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr2InputNewData2,
        firstAttr2Hash
      )
    ).to.be.revertedWith("attr exist");
  });
  it("update two different attributes", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const attr1Data = "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr1Data = ethers.utils.toUtf8Bytes(attr1Data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttr1Hash = ethers.utils.sha256(inputAttr1Data);

    await expect(ts.insertAdministrator(did, inputAttr1Data))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttr1Hash, did, 1, 1);

    const attr1NewData = "yoloyouuuu";
    const attr1InputNewData = ethers.utils.toUtf8Bytes(attr1NewData);
    const attr1NewAttrHash = ethers.utils.sha256(attr1InputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr1InputNewData,
        firstAttr1Hash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        attr1NewAttrHash,
        firstAttr1Hash,
        firstAttr1Hash,
        did,
        2,
        1
      );

    // -------------Second Attributes-------------------
    const attr2Data = "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr2Data = ethers.utils.toUtf8Bytes(attr2Data);

    // as we overload update administrator we need to go through methods to test
    // Event assertions can verify that the arguments are the expected ones
    const firstAttr2Hash = ethers.utils.sha256(inputAttr2Data);

    await expect(
      ts.functions["updateAdministrator(string,bytes)"](did, inputAttr2Data)
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        firstAttr2Hash,
        firstAttr2Hash,
        firstAttr2Hash,
        did,
        1,
        2
      );

    const attr2NewData = "Newjhkhjyoloyouuuu";
    const attr2InputNewData = ethers.utils.toUtf8Bytes(attr2NewData);
    const attr2NewAttrHash = ethers.utils.sha256(attr2InputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr2InputNewData,
        firstAttr2Hash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        attr2NewAttrHash,
        firstAttr2Hash,
        firstAttr2Hash,
        did,
        2,
        2
      );

    const attr2NewDataV3 = "VeryNewjhkhjyoloyouuuu";
    const attr2InputNewDataV3 = ethers.utils.toUtf8Bytes(attr2NewDataV3);
    const attr2NewAttrHashV3 = ethers.utils.sha256(attr2InputNewDataV3);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr2InputNewDataV3,
        attr2NewAttrHash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        attr2NewAttrHashV3,
        attr2NewAttrHash,
        firstAttr2Hash,
        did,
        3,
        2
      );

    // check that we retrieve the versions hashes
    const attr2Versions = [
      firstAttr2Hash,
      attr2NewAttrHash,
      attr2NewAttrHashV3,
    ];
    const attributeVersionsWithFirstHash =
      await ts.getAdministratorAttributeRevisions(attr2Versions[0], 1, 10);
    expect(attributeVersionsWithFirstHash.items).to.deep.equal(attr2Versions);
    const attributeVersionsWithSecondHash =
      await ts.getAdministratorAttributeRevisions(attr2Versions[1], 1, 10);
    expect(attributeVersionsWithSecondHash.items).to.deep.equal(attr2Versions);
    const attributeVersionsWithThirdHash =
      await ts.getAdministratorAttributeRevisions(attr2Versions[2], 1, 10);
    expect(attributeVersionsWithThirdHash.items).to.deep.equal(attr2Versions);
  });
  it("update two different attributes for two did", async () => {
    const did = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const didHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did));

    const attr1Data = "attr1:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr1Data = ethers.utils.toUtf8Bytes(attr1Data);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttr1Hash = ethers.utils.sha256(inputAttr1Data);

    await expect(ts.insertAdministrator(did, inputAttr1Data))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(didHash, firstAttr1Hash, did, 1, 1);

    const attr1NewData = "yoloyouuuu";
    const attr1InputNewData = ethers.utils.toUtf8Bytes(attr1NewData);
    const attr1NewAttrHash = ethers.utils.sha256(attr1InputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr1InputNewData,
        firstAttr1Hash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        attr1NewAttrHash,
        firstAttr1Hash,
        firstAttr1Hash,
        did,
        2,
        1
      );
    // -------------Second Attributes-------------------
    const attr2Data = "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798";
    const inputAttr2Data = ethers.utils.toUtf8Bytes(attr2Data);

    // as we overload update administrator we need to go through methods to test

    // Event assertions can verify that the arguments are the expected ones
    const firstAttr2Hash = ethers.utils.sha256(inputAttr2Data);

    await expect(
      ts.functions["updateAdministrator(string,bytes)"](did, inputAttr2Data)
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        firstAttr2Hash,
        firstAttr2Hash,
        firstAttr2Hash,
        did,
        1,
        2
      );

    const attr2NewData = "Newjhkhjyoloyouuuu";
    const attr2InputNewData = ethers.utils.toUtf8Bytes(attr2NewData);
    const attr2NewAttrHash = ethers.utils.sha256(attr2InputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did,
        attr2InputNewData,
        firstAttr2Hash
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        didHash,
        attr2NewAttrHash,
        firstAttr2Hash,
        firstAttr2Hash,
        did,
        2,
        2
      );

    // -----new did

    const did2 = "did:ebsi:0x9f42426F4C145c47C47022565D79E4df50bE90cb";
    const did2Hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(did2));

    const data2 = "dfsq5dsq4654d6s4f65sd4fsd654f6f4sd64f64s6f4sd6";
    const inputdata2 = ethers.utils.toUtf8Bytes(data2);

    // Event assertions can verify that the arguments are the expected ones
    const firstAttrHash2 = ethers.utils.sha256(inputdata2);

    await expect(ts.insertAdministrator(did2, inputdata2))
      .to.emit(ts, "AddAdministratorAttribute")
      .withArgs(did2Hash, firstAttrHash2, did2, 1, 1);

    const attributeVersions2 = await ts.getAdministratorAttributeRevisions(
      firstAttrHash2,
      1,
      10
    );
    expect(attributeVersions2.items[0]).to.deep.equal(firstAttrHash2);

    const did2AttributNewData = "VeryNewjhkhjyoloyouuuu";
    const did2InputNewData = ethers.utils.toUtf8Bytes(did2AttributNewData);
    const did2AttributNewDataHash = ethers.utils.sha256(did2InputNewData);

    await expect(
      ts.functions["updateAdministrator(string,bytes,bytes32)"](
        did2,
        did2InputNewData,
        firstAttrHash2
      )
    )
      .to.emit(ts, "UpdateAdministratorAttribute")
      .withArgs(
        did2Hash,
        did2AttributNewDataHash,
        firstAttrHash2,
        firstAttrHash2,
        did2,
        2,
        1
      );

    // check that we retrieve the did attribute
    // we should have two attribute version for did2's attribute
    const constDid2Attrib = [firstAttrHash2, did2AttributNewDataHash];
    const attributeVersionsWithFirstHash =
      await ts.getAdministratorAttributeRevisions(constDid2Attrib[0], 1, 10);
    expect(attributeVersionsWithFirstHash.items).to.deep.equal(constDid2Attrib);
    const attributeVersionsWithSecondHash =
      await ts.getAdministratorAttributeRevisions(constDid2Attrib[1], 1, 10);
    expect(attributeVersionsWithSecondHash.items).to.deep.equal(
      constDid2Attrib
    );
    // check with on attribut version from did1
    const attributeVersionsForDid1Attribute =
      await ts.getAdministratorAttributeRevisions(attr2NewAttrHash, 1, 10);
    expect(attributeVersionsForDid1Attribute.items).to.deep.equal([
      firstAttr2Hash,
      attr2NewAttrHash,
    ]);
  });
});
