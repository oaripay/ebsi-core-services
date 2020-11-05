const {
  expectRevert,
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const {accounts, contract, web3} = require("@openzeppelin/test-environment");

const {ethers} = require("ethers");

const Tar = contract.fromArtifact("Tar");
const Pagination = contract.fromArtifact("Pagination");

describe("trusted policy registry", () => {
  describe("policy CRUD", () => {
    describe("get policy", () => {
      it("should return all the latest data", async () => {
        expect.assertions(18);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const attribute1v0Hash = ethers.utils.sha256(attribute1v0);
        const inputdata = web3.utils.hexToBytes(attribute1v0);
        await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });

        const policyId2 = "policyId:ebsi:2";
        // add new attribute2
        const attr2Data = web3.utils.toHex(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputAttr2Data = web3.utils.hexToBytes(attr2Data);
        const attr2DataHash = ethers.utils.sha256(attr2Data);
        await implV0.insertPolicy(policyId2, inputAttr2Data, {
          from: acc1,
        });

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1[0]).toStrictEqual(attribute1v0);
        expect(res1[1]).toStrictEqual(attribute1v0Hash);
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await implV0.getPolicy.call(policyId2, {
          from: acc1,
        });

        expect(res2[0]).toStrictEqual(attr2Data);
        expect(res2[1]).toStrictEqual(attr2DataHash);

        // get all policies
        const policies = await implV0.getPolicies.call(1, 20, {
          from: acc1,
        });

        expect(policies.items).toHaveLength(2);
        expect(policies).toMatchObject({
          items: [policyId, policyId2],
        });

        expect(policies.total.toString()).toStrictEqual("2");
        expect(policies.howMany.toString()).toStrictEqual("2");
        expect(policies.prev.toString()).toStrictEqual("1");
        expect(policies.next.toString()).toStrictEqual("1");

        // update policyId  1
        const attribute1v1 = web3.utils.toHex("newData");
        const attribute1v1Hash = ethers.utils.sha256(attribute1v1);
        const inputdataV1 = web3.utils.hexToBytes(attribute1v1);
        await implV0.updatePolicy(policyId, inputdataV1, {
          from: acc1,
        });

        // number of policies shoulg remain the same
        // get all policies
        const policiesV2 = await implV0.getPolicies.call(1, 20, {
          from: acc1,
        });

        expect(policiesV2.items).toHaveLength(2);
        expect(policiesV2).toMatchObject({
          items: [policyId, policyId2],
        });

        expect(policiesV2.total.toString()).toStrictEqual("2");
        expect(policiesV2.howMany.toString()).toStrictEqual("2");
        expect(policiesV2.prev.toString()).toStrictEqual("1");
        expect(policiesV2.next.toString()).toStrictEqual("1");

        // policyId should have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1V1[0]).toStrictEqual(attribute1v1);
        expect(res1V1[1]).toStrictEqual(attribute1v1Hash);
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
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const did = `didi`;
        const firstinputdata = web3.utils.hexToBytes(
          web3.utils.toHex("data-update-0")
        );
        const didFirstInputHash = ethers.utils.sha256(firstinputdata);
        await implV0.insertPolicy(did, firstinputdata, {
          from: acc1,
        });
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.methods["updatePolicy(string,bytes)"](did, inputdata, {
            from: acc1,
          });
        }

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getPolicyRevisions.call(didFirstInputHash, 1, 0, {
            from: acc1,
          }),
          "PageSize must be > 0"
        );
        // pagesize = 0 should revert
        await expectRevert(
          implV0.getPolicyRevisions.call(didFirstInputHash, 0, 10, {
            from: acc1,
          }),
          "Page must be > 0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getPolicyRevisions.call(didFirstInputHash, 1, 52, {
            from: acc1,
          }),
          "PageSize must be <= 50"
        );
      });
      it("should work", async () => {
        expect.assertions(17);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const did = `didi`;
        const firstinputdata = web3.utils.hexToBytes(
          web3.utils.toHex("data-update-0")
        );
        await implV0.insertPolicy(did, firstinputdata, {
          from: acc1,
        });
        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.methods["updatePolicy(string,bytes)"](did, inputdata, {
            from: acc1,
          });
        }
        // page = 0 and pagesize is less than total
        const r0 = await implV0.getPolicyRevisions.call(did, 1, 10, {
          from: acc1,
        });
        expect(r0.items).toHaveLength(10);
        expect(r0).toMatchObject({
          items: resAttributeHash.slice(0, 10),
        });
        expect(r0.total.toString()).toStrictEqual("11");
        expect(r0.howMany.toString()).toStrictEqual("10");
        expect(r0.prev.toString()).toStrictEqual("1");
        expect(r0.next.toString()).toStrictEqual("2");
        // page = 0 and pagesize is more than total
        const r1 = await implV0.getPolicyRevisions.call(did, 1, 15, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(11);
        expect(r1).toMatchObject({
          items: resAttributeHash,
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.howMany.toString()).toStrictEqual("11");
        expect(r1.prev.toString()).toStrictEqual("1");
        expect(r1.next.toString()).toStrictEqual("1");

        // page = 0 and pagesize is way less than total
        const r2 = await implV0.getPolicyRevisions.call(did, 1, 2, {
          from: acc1,
        });
        expect(r2).toMatchObject({
          items: [resAttributeHash[0], resAttributeHash[1]],
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.howMany.toString()).toStrictEqual("2");
        expect(r2.prev.toString()).toStrictEqual("1");
        expect(r2.next.toString()).toStrictEqual("2");
      });
    });

    describe("insert", () => {
      it("should work", async () => {
        expect.assertions(2);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const dataHash = ethers.utils.sha256(data);
        const inputdata = web3.utils.hexToBytes(data);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });
        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "AddNewPolicy", {
          policyId: policyIdEvent,
          policyHash: dataHash,
          policy: data,
        });
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1[0]).toStrictEqual(data);
        expect(res1[1]).toStrictEqual(dataHash);
      });
      it("for twice the same policyId should fail", async () => {
        expect.assertions(2);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputdata = web3.utils.hexToBytes(data);

        const dataHash = ethers.utils.sha256(data);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });

        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "AddNewPolicy", {
          policyId: policyIdEvent,
          policyHash: ethers.utils.sha256(data),
          policy: data,
        });

        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1[0]).toStrictEqual(data);
        expect(res1[1]).toStrictEqual(dataHash);
        const data2 = web3.utils.toHex(",NewData798");
        const inputdata2 = web3.utils.hexToBytes(data2);

        await expectRevert(
          implV0.insertPolicy(policyId, inputdata2, {
            from: acc1,
          }),
          "policy already exist"
        );
      });
      it("for two policyId", async () => {
        expect.assertions(10);

        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const attribute1v0Hash = ethers.utils.sha256(attribute1v0);

        const inputdata = web3.utils.hexToBytes(attribute1v0);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });
        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "AddNewPolicy", {
          policyId: policyIdEvent,
          policyHash: attribute1v0Hash,
          policy: attribute1v0,
        });
        const policyId2 = "policyId:ebsi:2";
        // add new attribute2
        const attr2Data = web3.utils.toHex(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputAttr2Data = web3.utils.hexToBytes(attr2Data);
        const attr2DataHash = ethers.utils.sha256(attr2Data);
        const receipt2 = await implV0.insertPolicy(policyId2, inputAttr2Data, {
          from: acc1,
        });
        const policyIdEvent2 = web3.utils.keccak256(policyId2);
        expectEvent(receipt2, "AddNewPolicy", {
          policyId: policyIdEvent2,
          policyHash: attr2DataHash,
          policy: attr2Data,
        });
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1[0]).toStrictEqual(attribute1v0);
        expect(res1[1]).toStrictEqual(attribute1v0Hash);

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await implV0.getPolicy.call(policyId2, {
          from: acc1,
        });

        expect(res2[0]).toStrictEqual(attr2Data);
        expect(res2[1]).toStrictEqual(attr2DataHash);
        // get all policies
        const policies = await implV0.getPolicies.call(1, 20, {
          from: acc1,
        });

        expect(policies.items).toHaveLength(2);
        expect(policies).toMatchObject({
          items: [policyId, policyId2],
        });

        expect(policies.total.toString()).toStrictEqual("2");
        expect(policies.howMany.toString()).toStrictEqual("2");
        expect(policies.prev.toString()).toStrictEqual("1");
        expect(policies.next.toString()).toStrictEqual("1");
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
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getPolicies.call(1, 0, {
            from: acc1,
          }),
          "PageSize must be > 0"
        );
        // page  = 0 should revert
        await expectRevert(
          implV0.getPolicies.call(0, 2, {
            from: acc1,
          }),
          "Page must be > 0"
        );
        // pagesize > 50 should revert
        await expectRevert(
          implV0.getPolicies.call(1, 52, {
            from: acc1,
          }),
          "PageSize must be <= 50"
        );
      });
      it("should work with page==X and pagesize less than total", async () => {
        expect.assertions(24);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }
        // page = 3 and pagesize 2
        const r1 = await implV0.getPolicies.call(3, 2, {
          from: acc1,
        });
        expect(r1.items).toHaveLength(2);
        expect(r1).toMatchObject({
          items: resAttributeHash.slice(4, 6),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.howMany.toString()).toStrictEqual("2");
        expect(r1.prev.toString()).toStrictEqual("2");
        expect(r1.next.toString()).toStrictEqual("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getPolicies.call(1, 10, {
          from: acc1,
        });
        expect(r2.items).toHaveLength(10);
        expect(r2).toMatchObject({
          items: resAttributeHash.slice(0, 10),
        });
        expect(r2.total.toString()).toStrictEqual("11");
        expect(r2.howMany.toString()).toStrictEqual("10");
        expect(r2.prev.toString()).toStrictEqual("1");
        expect(r2.next.toString()).toStrictEqual("2");

        // page = 65456465 and pagesize 564646545645
        const r7 = await implV0.getPolicies.call(65456465, 50, {
          from: acc1,
        });
        expect(r7.items).toHaveLength(0);
        expect(r7).toMatchObject({
          items: [],
        });
        expect(r7.total.toString()).toStrictEqual("11");
        expect(r7.howMany.toString()).toStrictEqual("0");
        expect(r7.prev.toString()).toStrictEqual("1");
        expect(r7.next.toString()).toStrictEqual("1");

        // page = 3 and pagesize 3
        const r9 = await implV0.getPolicies.call(4, 3, {
          from: acc1,
        });
        expect(r9.items).toHaveLength(2);
        expect(r9).toMatchObject({
          items: resAttributeHash.slice(9, 11),
        });
        expect(r9.total.toString()).toStrictEqual("11");
        expect(r9.howMany.toString()).toStrictEqual("2");
        expect(r9.prev.toString()).toStrictEqual("3");
        expect(r9.next.toString()).toStrictEqual("4");
      });
      it("by hash should work or revert if not found", async () => {
        expect.assertions(19);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }
        // update so that we have several revision fo some policies
        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `modifieddata${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdata, {
            from: acc1,
          });
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = web3.utils.hexToBytes(web3.utils.toHex(dataV2));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdataV2, {
            from: acc1,
          });
        }

        for (let i = 0; i < 11; i += 1) {
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyData = await implV0.getPolicyByHash(
            ethers.utils.sha256(inputdata),
            {
              from: acc1,
            }
          );
          expect(policyData).toStrictEqual(web3.utils.toHex(data));
        }

        for (let i = 0; i < 4; i += 1) {
          const data = `modifieddata${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyData = await implV0.getPolicyByHash(
            ethers.utils.sha256(inputdata),
            {
              from: acc1,
            }
          );
          expect(policyData).toStrictEqual(web3.utils.toHex(data));
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = web3.utils.hexToBytes(web3.utils.toHex(dataV2));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyDataV2 = await implV0.getPolicyByHash(
            ethers.utils.sha256(inputdataV2),
            {
              from: acc1,
            }
          );
          expect(policyDataV2).toStrictEqual(web3.utils.toHex(dataV2));
        }

        // eslint-disable-next-line no-await-in-loop
        await expectRevert(
          implV0.getPolicyByHash(
            ethers.utils.sha256(
              web3.utils.hexToBytes(web3.utils.toHex("modifieddata4"))
            ),
            {
              from: acc1,
            }
          ),
          "policy data does not exist"
        );
      });
      it("Revisions should work or revert if not found", async () => {
        expect.assertions(11);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }
        // update so that we have several revision fo some policies
        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `modifieddata${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdata, {
            from: acc1,
          });
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = web3.utils.hexToBytes(web3.utils.toHex(dataV2));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          await implV0.updatePolicy(did, inputdataV2, {
            from: acc1,
          });
        }

        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));

          const dataV1 = `modifieddata${i}`;
          const inputdataV1 = web3.utils.hexToBytes(web3.utils.toHex(dataV1));

          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = web3.utils.hexToBytes(web3.utils.toHex(dataV2));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyRevs = await implV0.getPolicyRevisions(did, 1, 10, {
            from: acc1,
          });
          expect(policyRevs.items).toStrictEqual([
            ethers.utils.sha256(inputdata),
            ethers.utils.sha256(inputdataV1),
            ethers.utils.sha256(inputdataV2),
          ]);
        }
        await expectRevert(
          implV0.getPolicyRevisions(`12`, 1, 10, {
            from: acc1,
          }),
          "policyId does not exist"
        );
        for (let i = 4; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = web3.utils.hexToBytes(web3.utils.toHex(data));
          // INSERT SHOULD BE DONE IN ORDER !!!
          // eslint-disable-next-line no-await-in-loop
          const policyRevs = await implV0.getPolicyRevisions(did, 1, 10, {
            from: acc1,
          });

          expect(policyRevs.items).toStrictEqual([
            ethers.utils.sha256(inputdata),
          ]);
        }
      });
    });
    describe("update", () => {
      it("should work", async () => {
        expect.assertions(10);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const firstHash = ethers.utils.sha256(attribute1v0);
        const inputdata = web3.utils.hexToBytes(attribute1v0);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });
        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "AddNewPolicy", {
          policyId: policyIdEvent,
          policyHash: ethers.utils.sha256(attribute1v0),
          policy: attribute1v0,
        });

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1[0]).toStrictEqual(attribute1v0);
        expect(res1[1]).toStrictEqual(firstHash);
        // update policyId  1
        const attribute1v1 = web3.utils.toHex(",newData");
        const secondHash = ethers.utils.sha256(attribute1v1);
        const inputdataV1 = web3.utils.hexToBytes(attribute1v1);
        const receipt2 = await implV0.updatePolicy(policyId, inputdataV1, {
          from: acc1,
        });

        expectEvent(receipt2, "UpdateExistingPolicy", {
          policyId: policyIdEvent,
          policyHash: ethers.utils.sha256(attribute1v1),
          policy: attribute1v1,
        });
        // get all policies
        const policies = await implV0.getPolicies.call(1, 20, {
          from: acc1,
        });

        expect(policies.items).toHaveLength(1);
        expect(policies).toMatchObject({
          items: [policyId],
        });

        expect(policies.total.toString()).toStrictEqual("1");
        expect(policies.howMany.toString()).toStrictEqual("1");
        expect(policies.prev.toString()).toStrictEqual("1");
        expect(policies.next.toString()).toStrictEqual("1");

        // policyId shoudl have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1V1[0]).toStrictEqual(attribute1v1);
        expect(res1V1[1]).toStrictEqual(secondHash);
      });
      it("should fail if policy does not exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const myLibrary = await Pagination.new();
        await Tar.detectNetwork();
        await Tar.link("Pagination", myLibrary.address);
        const implV0 = await Tar.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputdata = web3.utils.hexToBytes(attribute1v0);
        await expectRevert(
          implV0.updatePolicy(policyId, inputdata, {
            from: acc1,
          }),
          "policy does not exist"
        );
        await expectRevert(
          implV0.getPolicy.call(policyId, {
            from: acc1,
          }),
          "policy does not exist"
        );
      });
    });
  });
});
