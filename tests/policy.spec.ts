import { ethers } from "hardhat";
import { Signer } from "ethers";
import { expect } from "chai";
// eslint-disable-next-line import/no-unresolved, import/extensions
import { SchemaSCRegistry } from "../src/types";

describe("Policy", () => {
  let implV0: SchemaSCRegistry;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let snapshotId: any;
  let acc1: Signer;
  // let accounts:
  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    [acc1] = await ethers.getSigners();
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const pagination = await paginationFactory.deploy();

    const schemaLibFactory = await ethers.getContractFactory("SchemaLib", {
      libraries: {
        Pagination: pagination.address,
      },
    });
    const schemaLib = await schemaLibFactory.deploy();

    const contractFactory = await ethers.getContractFactory(
      "SchemaSCRegistry",
      {
        libraries: {
          SchemaLib: schemaLib.address,
          Pagination: pagination.address,
        },
      }
    );
    implV0 = (await contractFactory.deploy()) as SchemaSCRegistry;
    await implV0.initialize(42);
    const initialVersion = await implV0.version();
    expect(initialVersion).to.equal(42);
    expect(implV0.address).to.properAddress;
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("policy CRUD", () => {
    describe("get policy", () => {
      it("should return all the latest data", async () => {
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = ethers.utils.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const attribute1v0Hash = ethers.utils.sha256(attribute1v0);
        const inputdata = attribute1v0;
        await implV0.insertPolicy(policyId, inputdata);

        const policyId2 = "policyId:ebsi:2";
        // add new attribute2
        const attr2Data = ethers.utils.toUtf8Bytes(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputAttr2Data = attr2Data;
        const attr2DataHash = ethers.utils.sha256(attr2Data);
        await implV0.insertPolicy(policyId2, inputAttr2Data);

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy(policyId);

        expect(ethers.utils.arrayify(res1[0])).to.eql(attribute1v0);
        expect(res1[1]).to.equal(attribute1v0Hash);
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await implV0.getPolicy(policyId2);

        expect(ethers.utils.arrayify(res2[0])).to.eql(attr2Data);
        expect(res2[1]).to.equal(attr2DataHash);

        // get all policies
        const policies = await implV0.getPolicies(1, 20);

        expect(policies.items.length).to.equal(2);
        expect(policies.items).to.eql([policyId, policyId2]);

        expect(policies.total.toString()).to.equal("2");
        expect(policies.howMany.toString()).to.equal("2");
        expect(policies.prev.toString()).to.equal("1");
        expect(policies.next.toString()).to.equal("1");

        // update policyId  1
        const attribute1v1 = ethers.utils.toUtf8Bytes("newData");
        const attribute1v1Hash = ethers.utils.sha256(attribute1v1);
        const inputdataV1 = attribute1v1;
        await implV0.updatePolicy(policyId, inputdataV1);

        // number of policies shoulg remain the same
        // get all policies
        const policiesV2 = await implV0.getPolicies(1, 20);

        expect(policiesV2.items.length).to.equal(2);
        expect(policiesV2.items).to.eql([policyId, policyId2]);

        expect(policiesV2.total.toString()).to.equal("2");
        expect(policiesV2.howMany.toString()).to.equal("2");
        expect(policiesV2.prev.toString()).to.equal("1");
        expect(policiesV2.next.toString()).to.equal("1");

        // policyId should have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await implV0.getPolicy(policyId);

        expect(ethers.utils.arrayify(res1V1[0])).to.eql(attribute1v1);
        expect(res1V1[1]).to.equal(attribute1v1Hash);
      });
    });
    describe("get attributebyHash", () => {
      const resAttributeHash = [...Array(11).keys()].map((i) =>
        ethers.utils.sha256(ethers.utils.toUtf8Bytes(`data-update-${i}`))
      );
      it("should failed with wrong page size", async () => {
        const did = `didi`;
        const firstinputdata = ethers.utils.toUtf8Bytes("data-update-0");
        const didFirstInputHash = ethers.utils.sha256(firstinputdata);
        await implV0.insertPolicy(did, firstinputdata);
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0["updatePolicy(string,bytes)"](did, inputdata);
        }

        // pagesize = 0 should revert
        await expect(
          implV0.getPolicyRevisions(didFirstInputHash, 1, 0)
        ).to.be.revertedWith("PageSize must be > 0");
        // pagesize = 0 should revert
        await expect(
          implV0.getPolicyRevisions(didFirstInputHash, 0, 10)
        ).to.be.revertedWith("Page must be > 0");

        // pagesize > 50 should revert
        await expect(
          implV0.getPolicyRevisions(didFirstInputHash, 1, 52)
        ).to.be.revertedWith("PageSize must be <= 50");
      });
      it("should work", async () => {
        const did = `didi`;
        const firstinputdata = ethers.utils.toUtf8Bytes("data-update-0");
        await implV0.insertPolicy(did, firstinputdata);
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0["updatePolicy(string,bytes)"](did, inputdata);
        }
        // page = 0 and pagesize is less than total
        const r0 = await implV0.getPolicyRevisions(did, 1, 10);
        expect(r0.items).to.have.length(10);
        expect(r0.items).to.deep.equal(resAttributeHash.slice(0, 10));
        expect(r0.total.toString()).to.equal("11");
        expect(r0.howMany.toString()).to.equal("10");
        expect(r0.prev.toString()).to.equal("1");
        expect(r0.next.toString()).to.equal("2");
        // page = 0 and pagesize is more than total
        const r1 = await implV0.getPolicyRevisions(did, 1, 15);
        expect(r1.items).to.have.length(11);
        expect(r1.items).to.deep.equal(resAttributeHash);
        expect(r1.total.toString()).to.equal("11");
        expect(r1.howMany.toString()).to.equal("11");
        expect(r1.prev.toString()).to.equal("1");
        expect(r1.next.toString()).to.equal("1");

        // page = 0 and pagesize is way less than total
        const r2 = await implV0.getPolicyRevisions(did, 1, 2);
        expect(r2.items).to.eql([resAttributeHash[0], resAttributeHash[1]]);
        expect(r2.total.toString()).to.equal("11");
        expect(r2.howMany.toString()).to.equal("2");
        expect(r2.prev.toString()).to.equal("1");
        expect(r2.next.toString()).to.equal("2");
      });
    });

    describe("insert", () => {
      it("should work", async () => {
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = ethers.utils.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const dataHash = ethers.utils.sha256(data);
        // console.log(await (await implV0.insertPolicy(policyId, data)).wait());

        // console.log(ethers.utils.keccak256(data));
        await expect(implV0.insertPolicy(policyId, data))
          .to.emit(implV0, "AddNewPolicy")
          .withArgs(policyId, dataHash, ethers.utils.hexlify(data));
        const res1 = await implV0.getPolicy(policyId);

        expect(ethers.utils.arrayify(res1[0])).to.eql(data);
        expect(res1[1]).to.equal(dataHash);
      });
      it("for twice the same policyId should fail", async () => {
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = ethers.utils.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );

        const dataHash = ethers.utils.sha256(data);
        await expect(implV0.insertPolicy(policyId, data))
          .to.emit(implV0, "AddNewPolicy")
          .withArgs(
            policyId,
            ethers.utils.sha256(data),
            ethers.utils.hexlify(data)
          );

        const res1 = await implV0.getPolicy(policyId);

        expect(res1[0]).to.equal(ethers.utils.hexlify(data));
        expect(res1[1]).to.equal(dataHash);
        const data2 = ethers.utils.toUtf8Bytes(",NewData798");

        await expect(implV0.insertPolicy(policyId, data2)).to.be.revertedWith(
          "policy already exist"
        );
      });
      it("for two policyId", async () => {
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = ethers.utils.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const attribute1v0Hash = ethers.utils.sha256(attribute1v0);

        await expect(implV0.insertPolicy(policyId, attribute1v0))
          .to.emit(implV0, "AddNewPolicy")
          .withArgs(
            policyId,
            attribute1v0Hash,
            ethers.utils.hexlify(attribute1v0)
          );
        const policyId2 = "policyId:ebsi:2";
        // add new attribute2
        const attr2Data = ethers.utils.toUtf8Bytes(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const attr2DataHash = ethers.utils.sha256(attr2Data);
        await expect(implV0.insertPolicy(policyId2, attr2Data))
          .to.emit(implV0, "AddNewPolicy")
          .withArgs(policyId2, attr2DataHash, ethers.utils.hexlify(attr2Data));
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy(policyId);

        expect(res1[0]).to.equal(ethers.utils.hexlify(attribute1v0));
        expect(res1[1]).to.equal(attribute1v0Hash);

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await implV0.getPolicy(policyId2);

        expect(res2[0]).to.equal(ethers.utils.hexlify(attr2Data));
        expect(res2[1]).to.equal(attr2DataHash);
        // get all policies
        const policies = await implV0.getPolicies(1, 20);

        expect(policies.items).to.have.length(2);
        expect(policies.items).to.eql([policyId, policyId2]);

        expect(policies.total.toString()).to.equal("2");
        expect(policies.howMany.toString()).to.equal("2");
        expect(policies.prev.toString()).to.equal("1");
        expect(policies.next.toString()).to.equal("1");
      });
    });
    describe("get policies", () => {
      const resAttributeHash = [
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
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata);
        }

        // pagesize = 0 should revert
        await expect(implV0.getPolicies(1, 0)).to.be.revertedWith(
          "PageSize must be > 0"
        );
        // page  = 0 should revert
        await expect(implV0.getPolicies(0, 2)).to.be.revertedWith(
          "Page must be > 0"
        );
        // pagesize > 50 should revert
        await expect(implV0.getPolicies(1, 52)).to.be.revertedWith(
          "PageSize must be <= 50"
        );
      });
      it("should work with page==X and pagesize less than total", async () => {
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata);
        }
        // page = 3 and pagesize 2
        const r1 = await implV0.getPolicies(3, 2);
        expect(r1.items).to.have.length(2);
        expect(r1.items).to.deep.equal(resAttributeHash.slice(4, 6));
        expect(r1.total.toString()).to.equal("11");
        expect(r1.howMany.toString()).to.equal("2");
        expect(r1.prev.toString()).to.equal("2");
        expect(r1.next.toString()).to.equal("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getPolicies(1, 10);
        expect(r2.items.length).to.equal(10);
        expect(r2.items).to.deep.equal(resAttributeHash.slice(0, 10));
        expect(r2.total.toString()).to.equal("11");
        expect(r2.howMany.toString()).to.equal("10");
        expect(r2.prev.toString()).to.equal("1");
        expect(r2.next.toString()).to.equal("2");

        // page = 65456465 and pagesize 564646545645
        const r7 = await implV0.getPolicies(65456465, 50);
        expect(r7.items.length).to.equal(0);
        expect(r7.items).to.eql([]);
        expect(r7.total.toString()).to.equal("11");
        expect(r7.howMany.toString()).to.equal("0");
        expect(r7.prev.toString()).to.equal("1");
        expect(r7.next.toString()).to.equal("1");

        // page = 3 and pagesize 3
        const r9 = await implV0.getPolicies(4, 3);
        expect(r9.items.length).to.equal(2);
        expect(r9.items).to.deep.equal(resAttributeHash.slice(9));
        expect(r9.total.toString()).to.equal("11");
        expect(r9.howMany.toString()).to.equal("2");
        expect(r9.prev.toString()).to.equal("3");
        expect(r9.next.toString()).to.equal("4");
      });
      it("by hash should work or revert if not found", async () => {
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata);
        }
        // update so that we have several revision fo some policies
        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `modifieddata${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdata);
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdataV2);
        }

        for (let i = 0; i < 11; i += 1) {
          const data = `data${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyData = await implV0.getPolicyByHash(
            ethers.utils.sha256(inputdata)
          );
          expect(policyData).to.equal(ethers.utils.hexlify(inputdata));
        }

        for (let i = 0; i < 4; i += 1) {
          const data = `modifieddata${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyData = await implV0.getPolicyByHash(
            ethers.utils.sha256(inputdata)
          );
          expect(policyData).to.equal(ethers.utils.hexlify(inputdata));
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyDataV2 = await implV0.getPolicyByHash(
            ethers.utils.sha256(inputdataV2)
          );
          expect(policyDataV2).to.equal(ethers.utils.hexlify(inputdataV2));
        }

        // eslint-disable-next-line no-await-in-loop
        await expect(
          implV0.getPolicyByHash(
            ethers.utils.sha256(ethers.utils.toUtf8Bytes("modifieddata4"))
          )
        ).to.be.revertedWith("policy data does not exist");
      });
      it("Revisions should work or revert if not found", async () => {
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata);
        }
        // update so that we have several revision fo some policies
        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `modifieddata${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdata);
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.utils.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdataV2);
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
          const policyRevs = await implV0.getPolicyRevisions(did, 1, 10);
          expect(policyRevs.items).to.eql([
            ethers.utils.sha256(inputdata),
            ethers.utils.sha256(inputdataV1),
            ethers.utils.sha256(inputdataV2),
          ]);
        }
        await expect(implV0.getPolicyRevisions(`12`, 1, 10)).to.be.revertedWith(
          "policyId does not exist"
        );
        for (let i = 4; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.utils.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyRevs = await implV0.getPolicyRevisions(did, 1, 10);

          expect(policyRevs.items).to.eql([ethers.utils.sha256(inputdata)]);
        }
      });
    });
    describe("update", () => {
      it("should work", async () => {
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = ethers.utils.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const firstHash = ethers.utils.sha256(attribute1v0);
        await expect(implV0.insertPolicy(policyId, attribute1v0))
          .to.emit(implV0, "AddNewPolicy")
          .withArgs(policyId, firstHash, ethers.utils.hexlify(attribute1v0));

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy(policyId);

        expect(res1[0]).to.equal(ethers.utils.hexlify(attribute1v0));
        expect(res1[1]).to.equal(firstHash);
        // update policyId  1
        const attribute1v1 = ethers.utils.toUtf8Bytes(",newData");
        const secondHash = ethers.utils.sha256(attribute1v1);
        await expect(implV0.updatePolicy(policyId, attribute1v1))
          .to.emit(implV0, "UpdateExistingPolicy")
          .withArgs(
            policyId,
            ethers.utils.sha256(attribute1v1),
            ethers.utils.hexlify(attribute1v1)
          );

        // get all policies
        const policies = await implV0.getPolicies(1, 20);

        expect(policies.items.length).to.equal(1);
        expect(policies.items).to.eql([policyId]);

        expect(policies.total.toString()).to.equal("1");
        expect(policies.howMany.toString()).to.equal("1");
        expect(policies.prev.toString()).to.equal("1");
        expect(policies.next.toString()).to.equal("1");

        // policyId shoudl have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await implV0.getPolicy(policyId);

        expect(res1V1[0]).to.equal(ethers.utils.hexlify(attribute1v1));
        expect(res1V1[1]).to.equal(secondHash);
      });
      it("should fail if policy does not exists", async () => {
        const policyId = "policyId:ebsi:1";
        const attribute1v0 = ethers.utils.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        await expect(
          implV0.updatePolicy(policyId, attribute1v0)
        ).to.be.revertedWith("policy does not exist");
        await expect(implV0.getPolicy(policyId)).to.be.revertedWith(
          "policy does not exist"
        );
      });
    });
  });
});
