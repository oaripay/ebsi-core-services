import { ethers } from "hardhat";
import { expect } from "chai";
import { DidRegistry } from "../src/types";

describe("Policy", () => {
  let ts: DidRegistry;
  const resAttributeHash = [...Array(11).keys()].map((i) =>
    ethers.utils.sha256(ethers.utils.toUtf8Bytes(`data-update-${i}`))
  );
  const getPolsresAttrHash = [
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

  beforeEach(async () => {
    const paginationFactory = await ethers.getContractFactory(
      "contracts/bootstrap-ethereum-sc/contracts/utils/Pagination.sol:Pagination",
      {}
    );
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
    ts = (await contractFactory.deploy()) as DidRegistry;
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.properAddress;
  });

  it("insert Policy should work", async () => {
    const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const data = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const dataHash = ethers.utils.sha256(data);
    const policyIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(policyId)
    );

    await expect(ts.insertPolicy(policyId, data))
      .to.emit(ts, "AddNewPolicy")
      .withArgs(policyIdHash, dataHash, ethers.utils.hexlify(data));

    const res1 = await ts.getPolicy(policyId);

    expect(res1[0]).to.equal(ethers.utils.hexlify(data));
    expect(res1[1]).to.equal(dataHash);
  });

  it("insert Policy for twice the same policyId should fail", async () => {
    const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";
    const data = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const dataHash = ethers.utils.sha256(data);
    const policyIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(policyId)
    );
    await expect(ts.insertPolicy(policyId, data))
      .to.emit(ts, "AddNewPolicy")
      .withArgs(policyIdHash, dataHash, ethers.utils.hexlify(data));

    const data2 = ethers.utils.toUtf8Bytes(",NewData798");

    await expect(ts.insertPolicy(policyId, data2)).to.be.revertedWith(
      "pol exist"
    );
  });

  it("insert Policy for two policyId", async () => {
    const policyId = "policyId:ebsi:1";
    const data = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const dataHash = ethers.utils.sha256(data);

    // insert did and attribute1v0
    const attribute1v0 = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const attribute1v0Hash = ethers.utils.sha256(attribute1v0);

    const policyIdHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(policyId)
    );
    await expect(ts.insertPolicy(policyId, attribute1v0))
      .to.emit(ts, "AddNewPolicy")
      .withArgs(policyIdHash, dataHash, ethers.utils.hexlify(data));

    const policyId2 = "policyId:ebsi:2";
    // add new attribute2
    const attr2Data = ethers.utils.toUtf8Bytes(
      "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );

    const attr2DataHash = ethers.utils.sha256(attr2Data);
    const policyIdEvent2 = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(policyId2)
    );
    await expect(ts.insertPolicy(policyId2, attr2Data))
      .to.emit(ts, "AddNewPolicy")
      .withArgs(policyIdEvent2, attr2DataHash, ethers.utils.hexlify(attr2Data));

    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res1 = await ts.getPolicy(policyId);

    expect(res1[0]).to.equal(ethers.utils.hexlify(attribute1v0));
    expect(res1[1]).to.equal(attribute1v0Hash);

    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res2 = await ts.getPolicy(policyId2);

    expect(res2[0]).to.equal(ethers.utils.hexlify(attr2Data));
    expect(res2[1]).to.equal(attr2DataHash);
    // get all policies
    const policies = await ts.getPolicies(1, 20);

    expect(policies.items).to.have.length(2);
    expect(policies.items).to.deep.equal([policyId, policyId2]);

    expect(policies.total.toString()).to.equal("2");
    expect(policies.howMany.toString()).to.equal("2");
    expect(policies.prev.toString()).to.equal("1");
    expect(policies.next.toString()).to.equal("1");
  });

  it("update Policy should work", async () => {
    const policyId = "policyId:ebsi:1";
    // insert did and attribute1v0
    const attribute1v0 = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const firstHash = ethers.utils.sha256(attribute1v0);
    const policyIdEvent = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(policyId)
    );

    await expect(ts.insertPolicy(policyId, attribute1v0))
      .to.emit(ts, "AddNewPolicy")
      .withArgs(policyIdEvent, firstHash, ethers.utils.hexlify(attribute1v0));

    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res1 = await ts.getPolicy(policyId);

    expect(res1[0]).to.equal(ethers.utils.hexlify(attribute1v0));
    expect(res1[1]).to.equal(firstHash);
    // update policyId  1
    const attribute1v1 = ethers.utils.toUtf8Bytes(",newData");
    const secondHash = ethers.utils.sha256(attribute1v1);

    await expect(ts.updatePolicy(policyId, attribute1v1))
      .to.emit(ts, "UpdateExistingPolicy")
      .withArgs(policyIdEvent, secondHash, ethers.utils.hexlify(attribute1v1));

    // get all policies
    const policies = await ts.getPolicies(1, 20);

    expect(policies.items).to.deep.equal([policyId]);

    expect(policies.total.toString()).to.equal("1");
    expect(policies.howMany.toString()).to.equal("1");
    expect(policies.prev.toString()).to.equal("1");
    expect(policies.next.toString()).to.equal("1");

    // policyId shoudl have been updated
    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res1V1 = await ts.getPolicy(policyId);

    expect(res1V1[0]).to.equal(ethers.utils.hexlify(attribute1v1));
    expect(res1V1[1]).to.equal(secondHash);
  });

  it("update Policy should fail if policy does not exists", async () => {
    const policyId = "policyId:ebsi:1";
    const attribute1v0 = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    await expect(ts.updatePolicy(policyId, attribute1v0)).to.be.revertedWith(
      "pol unknown"
    );
    await expect(ts.getPolicy(policyId)).to.be.revertedWith("pol unknown");
  });

  it("get policies should fail with wrong page size", async () => {
    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertPolicy(did, inputdata);
    }

    // pagesize = 0 should revert
    await expect(ts.getPolicies(1, 0)).to.be.revertedWith("PSize not >0");
    // page  = 0 should revert
    await expect(ts.getPolicies(0, 2)).to.be.revertedWith("Page not >0");
    // pagesize > 50 should revert
    await expect(ts.getPolicies(1, 52)).to.be.revertedWith("PSize not <=50");
  });

  it("get policies should work with page==X and pagesize less than total", async () => {
    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertPolicy(did, inputdata);
    }

    // page = 3 and pagesize 2
    const r1 = await ts.getPolicies(3, 2);
    expect(r1.items).to.have.length(2);
    expect(r1.items).to.deep.equal(getPolsresAttrHash.slice(4, 6));
    expect(r1.total.toString()).to.equal("11");
    expect(r1.howMany.toString()).to.equal("2");
    expect(r1.prev.toString()).to.equal("2");
    expect(r1.next.toString()).to.equal("4");
    // page = 1 and pagesize 10
    const r2 = await ts.getPolicies(1, 10);
    expect(r2.items).to.deep.equal(getPolsresAttrHash.slice(0, 10));
    expect(r2.total.toString()).to.equal("11");
    expect(r2.howMany.toString()).to.equal("10");
    expect(r2.prev.toString()).to.equal("1");
    expect(r2.next.toString()).to.equal("2");

    // page = 65456465 and pagesize 564646545645
    const r7 = await ts.getPolicies(65456465, 50);

    expect(r7.items).to.deep.equal([]);
    expect(r7.total.toString()).to.equal("11");
    expect(r7.howMany.toString()).to.equal("0");
    expect(r7.prev.toString()).to.equal("1");
    expect(r7.next.toString()).to.equal("1");

    // page = 3 and pagesize 3
    const r9 = await ts.getPolicies(4, 3);

    expect(r9.items).to.deep.equal(getPolsresAttrHash.slice(9, 11));
    expect(r9.total.toString()).to.equal("11");
    expect(r9.howMany.toString()).to.equal("2");
    expect(r9.prev.toString()).to.equal("3");
    expect(r9.next.toString()).to.equal("4");
  });

  it("get policies by hash should work or revert if not found", async () => {
    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertPolicy(did, inputdata);
    }
    // update so that we have several revision fo some policies
    for (let i = 0; i < 4; i += 1) {
      const did = `${i}`;
      const data = `modifieddata${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updatePolicy(did, inputdata);
      const dataV2 = `modifieddata${i}V2`;
      const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updatePolicy(did, inputdataV2);
    }

    for (let i = 0; i < 11; i += 1) {
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      const policyData = await ts.getPolicyByHash(
        ethers.utils.sha256(inputdata)
      );
      expect(policyData).to.equal(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(data))
      );
    }

    for (let i = 0; i < 4; i += 1) {
      const data = `modifieddata${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      const policyData = await ts.getPolicyByHash(
        ethers.utils.sha256(inputdata)
      );
      expect(policyData).to.equal(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(data))
      );
      const dataV2 = `modifieddata${i}V2`;
      const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      const policyDataV2 = await ts.getPolicyByHash(
        ethers.utils.sha256(inputdataV2)
      );
      expect(policyDataV2).to.equal(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(dataV2))
      );
    }

    // eslint-disable-next-line no-await-in-loop
    await expect(
      ts.getPolicyByHash(
        ethers.utils.sha256(ethers.utils.toUtf8Bytes("modifieddata4"))
      )
    ).to.be.revertedWith("pol data unknown");
  });

  it("get policies Revisions should work or revert if not found", async () => {
    for (let i = 0; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.insertPolicy(did, inputdata);
    }
    // update so that we have several revision fo some policies
    for (let i = 0; i < 4; i += 1) {
      const did = `${i}`;
      const data = `modifieddata${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updatePolicy(did, inputdata);
      const dataV2 = `modifieddata${i}V2`;
      const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updatePolicy(did, inputdataV2);
    }

    for (let i = 0; i < 4; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);

      const dataV1 = `modifieddata${i}`;
      const inputdataV1 = ethers.utils.toUtf8Bytes(dataV1);
      const dataV2 = `modifieddata${i}V2`;
      const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      const policyRevs = await ts.getPolicyRevisions(did, 1, 10);
      expect(policyRevs.items).to.deep.equal([
        ethers.utils.sha256(inputdata),
        ethers.utils.sha256(inputdataV1),
        ethers.utils.sha256(inputdataV2),
      ]);
    }
    await expect(ts.getPolicyRevisions(`12`, 1, 10)).to.be.revertedWith(
      "pId unknown"
    );
    for (let i = 4; i < 11; i += 1) {
      const did = `${i}`;
      const data = `data${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      const policyRevs = await ts.getPolicyRevisions(did, 1, 10);

      expect(policyRevs.items).to.deep.equal([ethers.utils.sha256(inputdata)]);
    }
  });

  it("get attributebyHash should fail with wrong page size", async () => {
    const did = `didi`;
    const firstinputdata = ethers.utils.toUtf8Bytes("data-update-0");
    const didFirstInputHash = ethers.utils.sha256(firstinputdata);
    await ts.insertPolicy(did, firstinputdata);
    for (let i = 1; i < 11; i += 1) {
      const data = `data-update-${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updatePolicy(did, inputdata);
    }

    // pagesize = 0 should revert
    await expect(
      ts.getPolicyRevisions(didFirstInputHash, 1, 0)
    ).to.be.revertedWith("PSize not >0");
    // pagesize = 0 should revert
    await expect(
      ts.getPolicyRevisions(didFirstInputHash, 0, 10)
    ).to.be.revertedWith("Page not >0");

    // pagesize > 50 should revert
    await expect(
      ts.getPolicyRevisions(didFirstInputHash, 1, 52)
    ).to.be.revertedWith("PSize not <=50");
  });

  it("get attributebyHash should work", async () => {
    const did = `didi`;
    const firstinputdata = ethers.utils.toUtf8Bytes("data-update-0");
    await ts.insertPolicy(did, firstinputdata);

    for (let i = 1; i < 11; i += 1) {
      const data = `data-update-${i}`;
      const inputdata = ethers.utils.toUtf8Bytes(data);
      // INSERT SHOULD BE DONE IN ORDER !!!
      // eslint-disable-next-line no-await-in-loop
      await ts.updatePolicy(did, inputdata);
    }
    // page = 0 and pagesize is less than total
    const r0 = await ts.getPolicyRevisions(did, 1, 10);

    expect(r0.items).to.deep.equal(resAttributeHash.slice(0, 10));
    expect(r0.total.toString()).to.equal("11");
    expect(r0.howMany.toString()).to.equal("10");
    expect(r0.prev.toString()).to.equal("1");
    expect(r0.next.toString()).to.equal("2");
    // page = 0 and pagesize is more than total
    const r1 = await ts.getPolicyRevisions(did, 1, 15);

    expect(r1.items).to.deep.equal(resAttributeHash);
    expect(r1.total.toString()).to.equal("11");
    expect(r1.howMany.toString()).to.equal("11");
    expect(r1.prev.toString()).to.equal("1");
    expect(r1.next.toString()).to.equal("1");

    // page = 0 and pagesize is way less than total
    const r2 = await ts.getPolicyRevisions(did, 1, 2);
    expect(r2.items).to.deep.equal([resAttributeHash[0], resAttributeHash[1]]);
    expect(r2.total.toString()).to.equal("11");
    expect(r2.howMany.toString()).to.equal("2");
    expect(r2.prev.toString()).to.equal("1");
    expect(r2.next.toString()).to.equal("2");
  });

  it("get Policy should return all the latest data", async () => {
    const policyId = "policyId:ebsi:1";
    // insert did and attribute1v0
    const attribute1v0 = ethers.utils.toUtf8Bytes(
      ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const attribute1v0Hash = ethers.utils.sha256(attribute1v0);
    await ts.insertPolicy(policyId, attribute1v0);

    const policyId2 = "policyId:ebsi:2";
    // add new attribute2
    const attr2Data = ethers.utils.toUtf8Bytes(
      "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
    );
    const attr2DataHash = ethers.utils.sha256(attr2Data);
    await ts.insertPolicy(policyId2, attr2Data);

    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res1 = await ts.getPolicy(policyId);

    expect(res1[0]).to.equal(ethers.utils.hexlify(attribute1v0));
    expect(res1[1]).to.equal(attribute1v0Hash);
    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res2 = await ts.getPolicy(policyId2);

    expect(res2[0]).to.equal(ethers.utils.hexlify(attr2Data));
    expect(res2[1]).to.equal(attr2DataHash);

    // get all policies
    const policies = await ts.getPolicies(1, 20);

    expect(policies.items).to.have.length(2);
    expect(policies.items).to.deep.equal([policyId, policyId2]);

    expect(policies.total.toString()).to.equal("2");
    expect(policies.howMany.toString()).to.equal("2");
    expect(policies.prev.toString()).to.equal("1");
    expect(policies.next.toString()).to.equal("1");

    // update policyId  1
    const attribute1v1 = ethers.utils.toUtf8Bytes("newData");
    const attribute1v1Hash = ethers.utils.sha256(attribute1v1);
    await ts.updatePolicy(policyId, attribute1v1);

    // number of policies shoulg remain the same
    // get all policies
    const policiesV2 = await ts.getPolicies(1, 20);

    expect(policiesV2.items).to.deep.equal([policyId, policyId2]);

    expect(policiesV2.total.toString()).to.equal("2");
    expect(policiesV2.howMany.toString()).to.equal("2");
    expect(policiesV2.prev.toString()).to.equal("1");
    expect(policiesV2.next.toString()).to.equal("1");

    // policyId should have been updated
    // the latest Attribute hash should be attr1v1Hash and attr2Hash
    const res1V1 = await ts.getPolicy(policyId);

    expect(res1V1[0]).to.equal(ethers.utils.hexlify(attribute1v1));
    expect(res1V1[1]).to.equal(attribute1v1Hash);
  });
});
