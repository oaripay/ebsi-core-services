const {
  expectRevert,
  expectEvent, // Assertions for emitted events
} = require("@openzeppelin/test-helpers");
const {accounts, contract, web3} = require("@openzeppelin/test-environment");

const Tir = contract.fromArtifact("Tir");

describe("trusted policy registry", () => {
  describe("policy CRUD", () => {
    describe("get policy", () => {
      it("should return all the latest data", async () => {
        expect.assertions(15);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
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
        await implV0.insertPolicy(policyId2, inputAttr2Data, {
          from: acc1,
        });

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1).toStrictEqual(attribute1v0);

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await implV0.getPolicy.call(policyId2, {
          from: acc1,
        });

        expect(res2).toStrictEqual(attr2Data);

        // get all policies
        const policies = await implV0.getPolicies.call(0, 20, {
          from: acc1,
        });

        expect(policies.items).toHaveLength(2);
        expect(policies).toMatchObject({
          items: expect.arrayContaining([policyId, policyId2]),
        });

        expect(policies.total.toString()).toStrictEqual("2");
        expect(policies.pageSize.toString()).toStrictEqual("2");
        expect(policies.prev.toString()).toStrictEqual("0");
        expect(policies.next.toString()).toStrictEqual("0");

        // update policyId  1
        const attribute1v1 = web3.utils.toHex("newData");
        const inputdataV1 = web3.utils.hexToBytes(attribute1v1);
        await implV0.updatePolicy(policyId, inputdataV1, {
          from: acc1,
        });

        // number of policies shoulg remain the same
        // get all policies
        const policiesV2 = await implV0.getPolicies.call(0, 20, {
          from: acc1,
        });

        expect(policiesV2.items).toHaveLength(2);
        expect(policiesV2).toMatchObject({
          items: expect.arrayContaining([policyId, policyId2]),
        });

        expect(policiesV2.total.toString()).toStrictEqual("2");
        expect(policiesV2.pageSize.toString()).toStrictEqual("2");
        expect(policiesV2.prev.toString()).toStrictEqual("0");
        expect(policiesV2.next.toString()).toStrictEqual("0");

        // policyId shoudl have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1V1).toStrictEqual(attribute1v1);
      });
    });
    describe("insert", () => {
      it("should work", async () => {
        expect.assertions(1);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputdata = web3.utils.hexToBytes(data);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });
        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "addNewPolicy", {
          policyId: policyIdEvent,
          policyHash: web3.utils.sha3(data),
          policy: data,
        });
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1).toStrictEqual(data);
      });
      it("for twice the same policyId should fail", async () => {
        expect.assertions(1);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputdata = web3.utils.hexToBytes(data);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });

        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "addNewPolicy", {
          policyId: policyIdEvent,
          policyHash: web3.utils.sha3(data),
          policy: data,
        });

        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1).toStrictEqual(data);

        const data2 = web3.utils.toHex(",NewData798");
        const inputdata2 = web3.utils.hexToBytes(data2);

        await expectRevert(
          implV0.insertPolicy(policyId, inputdata2, {
            from: acc1,
          }),
          "policy already exist use updatePolicy to update a policy"
        );
      });
      it("for two policyId", async () => {
        expect.assertions(8);

        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputdata = web3.utils.hexToBytes(attribute1v0);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });
        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "addNewPolicy", {
          policyId: policyIdEvent,
          policyHash: web3.utils.sha3(attribute1v0),
          policy: attribute1v0,
        });
        const policyId2 = "policyId:ebsi:2";
        // add new attribute2
        const attr2Data = web3.utils.toHex(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputAttr2Data = web3.utils.hexToBytes(attr2Data);
        const receipt2 = await implV0.insertPolicy(policyId2, inputAttr2Data, {
          from: acc1,
        });
        const policyIdEvent2 = web3.utils.keccak256(policyId2);
        expectEvent(receipt2, "addNewPolicy", {
          policyId: policyIdEvent2,
          policyHash: web3.utils.sha3(attr2Data),
          policy: attr2Data,
        });
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1).toStrictEqual(attribute1v0);

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await implV0.getPolicy.call(policyId2, {
          from: acc1,
        });

        expect(res2).toStrictEqual(attr2Data);

        // get all policies
        const policies = await implV0.getPolicies.call(0, 20, {
          from: acc1,
        });

        expect(policies.items).toHaveLength(2);
        expect(policies).toMatchObject({
          items: expect.arrayContaining([policyId, policyId2]),
        });

        expect(policies.total.toString()).toStrictEqual("2");
        expect(policies.pageSize.toString()).toStrictEqual("2");
        expect(policies.prev.toString()).toStrictEqual("0");
        expect(policies.next.toString()).toStrictEqual("0");
      });
    });
    describe("get policies", () => {
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
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }

        // pagesize = 0 should revert
        await expectRevert(
          implV0.getPolicies.call(0, 0, {
            from: acc1,
          }),
          "PageSize should be greater than 0"
        );

        // pagesize > 50 should revert
        await expectRevert(
          implV0.getPolicies.call(0, 52, {
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
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }
        // page = 0 and pagesize is less than total
        const r0 = await implV0.getPolicies.call(0, 10, {
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
        const r1 = await implV0.getPolicies.call(0, 12, {
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
        const r2 = await implV0.getPolicies.call(0, 2, {
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
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }

        // page = 1 and pagesize is way less than total
        const r = await implV0.getPolicies.call(1, 2, {
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
        const r1 = await implV0.getPolicies.call(1, 42, {
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
          await implV0.insertPolicy(did, inputdata, {
            from: acc1,
          });
        }
        // page = 1 and pagesize is way less than total
        const r = await implV0.getPolicies.call(1, 11, {
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

        const r1 = await implV0.getPolicies.call(5, 11, {
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
          items: expect.arrayContaining(["6", "7"]),
        });
        expect(r1.total.toString()).toStrictEqual("11");
        expect(r1.pageSize.toString()).toStrictEqual("2");
        expect(r1.prev.toString()).toStrictEqual("2");
        expect(r1.next.toString()).toStrictEqual("4");
        // page = 1 and pagesize 10
        const r2 = await implV0.getPolicies.call(1, 10, {
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
        const r3 = await implV0.getPolicies.call(5, 2, {
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
        const r4 = await implV0.getPolicies.call(6, 2, {
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
        const r5 = await implV0.getPolicies.call(6565564, 2, {
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
        const r6 = await implV0.getPolicies.call(3, 3, {
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
        const r8 = await implV0.getPolicies.call(2, 3, {
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
        const r7 = await implV0.getPolicies.call(65456465, 50, {
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
      it("by hash should work or revert if not found", async () => {
        expect.assertions(19);
        const [acc1] = accounts;

        const implV0 = await Tir.new({from: acc1});

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
            web3.utils.sha3(inputdata),
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
            web3.utils.sha3(inputdata),
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
            web3.utils.sha3(inputdataV2),
            {
              from: acc1,
            }
          );
          expect(policyDataV2).toStrictEqual(web3.utils.toHex(dataV2));
        }

        // eslint-disable-next-line no-await-in-loop
        await expectRevert(
          implV0.getPolicyByHash(
            web3.utils.sha3(
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

        const implV0 = await Tir.new({from: acc1});

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
          const policyRevs = await implV0.getPolicyRevisions(did, {
            from: acc1,
          });
          expect(policyRevs).toStrictEqual([
            web3.utils.sha3(inputdata),
            web3.utils.sha3(inputdataV1),
            web3.utils.sha3(inputdataV2),
          ]);
        }
        await expectRevert(
          implV0.getPolicyRevisions(`12`, {
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
          const policyRevs = await implV0.getPolicyRevisions(did, {
            from: acc1,
          });

          expect(policyRevs).toStrictEqual([web3.utils.sha3(inputdata)]);
        }
      });
    });
    describe("update", () => {
      it("should work", async () => {
        expect.assertions(8);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = web3.utils.toHex(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798"
        );
        const inputdata = web3.utils.hexToBytes(attribute1v0);
        const receipt = await implV0.insertPolicy(policyId, inputdata, {
          from: acc1,
        });
        const policyIdEvent = web3.utils.keccak256(policyId);
        expectEvent(receipt, "addNewPolicy", {
          policyId: policyIdEvent,
          policyHash: web3.utils.sha3(attribute1v0),
          policy: attribute1v0,
        });

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1).toStrictEqual(attribute1v0);

        // update policyId  1
        const attribute1v1 = web3.utils.toHex("newData");
        const inputdataV1 = web3.utils.hexToBytes(attribute1v1);
        const receipt2 = await implV0.updatePolicy(policyId, inputdataV1, {
          from: acc1,
        });

        expectEvent(receipt2, "updateExistingPolicy", {
          policyId: policyIdEvent,
          policyHash: web3.utils.sha3(attribute1v1),
          policy: attribute1v1,
        });
        // get all policies
        const policies = await implV0.getPolicies.call(0, 20, {
          from: acc1,
        });

        expect(policies.items).toHaveLength(1);
        expect(policies).toMatchObject({
          items: expect.arrayContaining([policyId]),
        });

        expect(policies.total.toString()).toStrictEqual("1");
        expect(policies.pageSize.toString()).toStrictEqual("1");
        expect(policies.prev.toString()).toStrictEqual("0");
        expect(policies.next.toString()).toStrictEqual("0");

        // policyId shoudl have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await implV0.getPolicy.call(policyId, {
          from: acc1,
        });

        expect(res1V1).toStrictEqual(attribute1v1);
      });
      it("should fail if policy does not exists", async () => {
        expect.assertions(0);
        const [acc1] = accounts;
        const implV0 = await Tir.new({from: acc1});
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
