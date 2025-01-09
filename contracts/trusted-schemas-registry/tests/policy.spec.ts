import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { Result } from "ethers";

import { expect } from "chai";
import { ethers } from "hardhat";
import crypto from "node:crypto";

import type { SchemaSCRegistry } from "../src/types";

import { testTprAddress } from "./testAddress";

export function decodeResult(result: unknown): Record<string, unknown> {
  // Recursively fix the result object
  return fixObject((result as Result).toObject(true));
}

function fixObject(result: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(result);

  const res: Record<string, unknown> = {};
  for (const key of keys) {
    const val = result[key];
    res[key] = fixValue(val);
  }

  return res;
}

function fixValue(val: unknown): unknown {
  if (typeof val !== "object" || val === null) {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((v) => fixValue(v));
  }

  // Replace empty objects with empty arrays
  if (Object.keys(val).length === 0) {
    return [];
  }

  // When ethers.js returns an object with only one key "_", it should be converted into a single-item array
  if (Object.keys(val).length === 1 && "_" in val) {
    return [fixValue(val._)];
  }

  return fixObject(val as Record<string, unknown>);
}

function randomPolicyData(): string {
  return `0x${crypto.randomBytes(10).toString("hex")}`;
}

function randomPolicyName(): string {
  return `policy-${crypto.randomBytes(5).toString("hex")}`;
}

describe("SchemaPolicies", () => {
  let ts: SchemaSCRegistry;
  let user: SignerWithAddress;

  const policyName1 = randomPolicyName();
  const policyName2 = randomPolicyName();

  const policyData1 = randomPolicyData();
  const policyData2 = randomPolicyData();
  const policyHash1 = ethers.sha256(Buffer.from(policyData1.slice(2), "hex"));
  const policyHash2 = ethers.sha256(Buffer.from(policyData2.slice(2), "hex"));

  beforeEach(async () => {
    [user] = await ethers.getSigners();
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const pagination = await paginationFactory.deploy();

    const schemaLibFactory = await ethers.getContractFactory("SchemaLib", {
      libraries: {
        Pagination: await pagination.getAddress(),
      },
    });
    const schemaLib = await schemaLibFactory.deploy();

    const contractFactory = await ethers.getContractFactory(
      "SchemaSCRegistry",
      {
        libraries: {
          Pagination: await pagination.getAddress(),
          SchemaLib: await schemaLib.getAddress(),
        },
      },
    );
    ts = await contractFactory.deploy(testTprAddress);
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(await ts.getAddress()).to.properAddress;
  });

  describe("policy CRUD", () => {
    describe("get policy", () => {
      it("should return all the latest data", async () => {
        // insert policy 1
        const tsUser = ts.connect(user);
        await expect(tsUser.insertPolicy(policyName1, policyData1)).to.emit(
          ts,
          "AddNewPolicy",
        );
        // add policy 2
        await expect(tsUser.insertPolicy(policyName2, policyData2)).to.emit(
          ts,
          "AddNewPolicy",
        );

        // the latest Attribute hash should be attr1v1Hash and attr2Hash

        const policy1 = await tsUser.getPolicy(policyName1);
        expect(policy1).to.eql([policyData1, policyHash1]);

        const policy2 = await tsUser.getPolicy(policyName2);
        expect(policy2).to.eql([policyData2, policyHash2]);

        // get all policies
        const issPagination = await ts.getPolicies(1, 20);
        expect(decodeResult(issPagination)).to.eql({
          howMany: 2n,
          items: [policyName1, policyName2],
          next: 1n,
          prev: 1n,
          total: 2n,
        });
        const updatedPolicyData1 = randomPolicyData();
        const updatedPolicyHash1 = ethers.sha256(
          Buffer.from(updatedPolicyData1.slice(2), "hex"),
        );
        // update policyId  1
        await expect(ts.updatePolicy(policyName1, updatedPolicyData1)).to.emit(
          ts,
          "UpdateExistingPolicy",
        );
        // number of policies shoulg remain the same
        // get all policies

        const issPagination2 = await ts.getPolicies(1, 20);
        expect(decodeResult(issPagination2)).to.eql({
          howMany: 2n,
          items: [policyName1, policyName2],
          next: 1n,
          prev: 1n,
          total: 2n,
        });
        // policyId should have been updated
        // the latest Attribute hash should be policyData2 and policyHash2
        const policy3 = await tsUser.getPolicy(policyName1);
        expect(policy3).to.eql([updatedPolicyData1, updatedPolicyHash1]);
      });
    });

    describe("get attributebyHash (getPolicyRevisions)", () => {
      const resAttributeHash = [...Array.from({ length: 11 }).keys()].map((i) =>
        ethers.sha256(ethers.toUtf8Bytes(`data-update-${i}`)),
      );

      it("should fail with wrong page size", async () => {
        const did = `didi`;
        const firstinputdata = ethers.toUtf8Bytes("data-update-0");
        const didFirstInputHash = ethers.sha256(firstinputdata);
        const tsUser = ts.connect(user);
        await expect(tsUser.insertPolicy(did, firstinputdata)).to.emit(
          ts,
          "AddNewPolicy",
        );

        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          await ts.updatePolicy(did, inputdata);
        }

        // pagesize = 0 should revert
        await expect(
          tsUser.getPolicyRevisions(didFirstInputHash, 1, 0),
        ).to.be.revertedWith("PageSize must be > 0");

        // pagesize = 0 should revert
        await expect(
          tsUser.getPolicyRevisions(didFirstInputHash, 0, 10),
        ).to.be.revertedWith("Page must be > 0");
        // pagesize > 50 should revert
        await expect(
          tsUser.getPolicyRevisions(didFirstInputHash, 1, 52),
        ).to.be.revertedWith("PageSize must be <= 50");
      });

      it("should work", async () => {
        const did = `didi`;
        const firstinputdata = ethers.toUtf8Bytes("data-update-0");
        const tsUser = ts.connect(user);
        await expect(tsUser.insertPolicy(did, firstinputdata)).to.emit(
          ts,
          "AddNewPolicy",
        );

        for (let i = 1; i < 11; i += 1) {
          const data = `data-update-${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!
          await ts.updatePolicy(did, inputdata);
        }
        // page = 0 and pagesize is less than total
        const r0 = await tsUser.getPolicyRevisions(did, 1, 10);
        expect(decodeResult(r0)).to.eql({
          howMany: BigInt(10),
          items: resAttributeHash.slice(0, 10),
          next: 2n,
          prev: 1n,
          total: BigInt(11),
        });

        // page = 0 and pagesize is more than total
        const r1 = await tsUser.getPolicyRevisions(did, 1, 15);
        expect(r1.items).to.have.length(11);
        expect(decodeResult(r1)).to.eql({
          howMany: BigInt(11),
          items: resAttributeHash,
          next: 1n,
          prev: 1n,
          total: BigInt(11),
        });

        // page = 0 and pagesize is way less than total
        const r2 = await tsUser.getPolicyRevisions(did, 1, 2);
        expect(decodeResult(r2)).to.eql({
          howMany: 2n,
          items: [resAttributeHash[0], resAttributeHash[1]],
          next: 2n,
          prev: 1n,
          total: BigInt(11),
        });
      });
    });

    describe("insert", () => {
      it("should work", async () => {
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = ethers.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798",
        );
        const dataHash = ethers.sha256(data);
        const tsUser = ts.connect(user);
        await expect(tsUser.insertPolicy(policyId, data)).to.emit(
          ts,
          "AddNewPolicy",
        );

        const res = await tsUser.getPolicy(policyId);

        expect(ethers.getBytes(res[0])).to.eql(data);
        expect(res[1]).to.equal(dataHash);
      });

      it("for twice the same policyId should fail", async () => {
        const policyId = "did:ebsi:0x1a80116F4C145c47C47022565D79E4df50bE90cb";

        const data = ethers.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798",
        );

        const dataHash = ethers.sha256(data);

        const tsUser = ts.connect(user);
        await expect(tsUser.insertPolicy(policyId, data)).to.emit(
          ts,
          "AddNewPolicy",
        );

        const res = await tsUser.getPolicy(policyId);

        expect(res[0]).to.equal(ethers.hexlify(data));
        expect(res[1]).to.equal(dataHash);
        const data2 = ethers.toUtf8Bytes(",NewData798");

        await expect(tsUser.insertPolicy(policyId, data2)).to.be.revertedWith(
          "policy already exist",
        );
      });

      it("for two policyId", async () => {
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = ethers.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798",
        );
        const attribute1v0Hash = ethers.sha256(attribute1v0);

        const tsUser = ts.connect(user);
        await expect(tsUser.insertPolicy(policyId, attribute1v0))
          .to.emit(ts, "AddNewPolicy")
          .withArgs(policyId, attribute1v0Hash, ethers.hexlify(attribute1v0));

        const policyId2 = "policyId:ebsi:2";
        // add new attribute2
        const attr2Data = ethers.toUtf8Bytes(
          "attr2:dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798",
        );
        const attr2DataHash = ethers.sha256(attr2Data);
        await expect(tsUser.insertPolicy(policyId2, attr2Data))
          .to.emit(ts, "AddNewPolicy")
          .withArgs(policyId2, attr2DataHash, ethers.hexlify(attr2Data));

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await tsUser.getPolicy(policyId);

        expect(res1[0]).to.equal(ethers.hexlify(attribute1v0));
        expect(res1[1]).to.equal(attribute1v0Hash);

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res2 = await tsUser.getPolicy(policyId2);

        expect(res2[0]).to.equal(ethers.hexlify(attr2Data));
        expect(res2[1]).to.equal(attr2DataHash);
        // get all policies
        const policies = await ts.getPolicies(1, 20);

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

      it("should fail with wrong page size", async () => {
        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          const tsUser = ts.connect(user);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await expect(tsUser.insertPolicy(did, inputdata)).to.emit(
            ts,
            "AddNewPolicy",
          );
        }

        // pagesize = 0 should revert
        await expect(ts.getPolicies(1, 0)).to.be.revertedWith(
          "PageSize must be > 0",
        );
        // page  = 0 should revert
        await expect(ts.getPolicies(0, 2)).to.be.revertedWith(
          "Page must be > 0",
        );
        // pagesize > 50 should revert
        await expect(ts.getPolicies(1, 52)).to.be.revertedWith(
          "PageSize must be <= 50",
        );
      });

      it("should work with page==X and pagesize less than total", async () => {
        const tsUser = ts.connect(user);

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.insertPolicy(did, inputdata);
        }
        // page = 3 and pagesize 2
        const r1 = await ts.getPolicies(3, 2);
        expect(r1.items).to.have.length(2);
        expect(decodeResult(r1)).to.eql({
          howMany: 2n,
          items: resAttributeHash.slice(4, 6),
          next: BigInt(4),
          prev: 2n,
          total: BigInt(11),
        });
        // page = 1 and pagesize 10
        const r2 = await ts.getPolicies(1, 10);
        expect(r2.items.length).to.equal(10);
        expect(decodeResult(r2)).to.eql({
          howMany: BigInt(10),
          items: resAttributeHash.slice(0, 10),
          next: 2n,
          prev: 1n,
          total: BigInt(11),
        });

        // page = 65456465 and pagesize 564646545645
        const r7 = await ts.getPolicies(65_456_465, 50);
        expect(r7.items.length).to.equal(0);
        expect(decodeResult(r7)).to.eql({
          howMany: 0n,
          items: [],
          next: 1n,
          prev: 1n,
          total: BigInt(11),
        });

        // page = 3 and pagesize 3
        const r9 = await ts.getPolicies(4, 3);
        expect(r9.items.length).to.equal(2);
        expect(decodeResult(r9)).to.eql({
          howMany: 2n,
          items: resAttributeHash.slice(9),
          next: BigInt(4),
          prev: BigInt(3),
          total: BigInt(11),
        });
      });

      it("by hash should work or revert if not found", async () => {
        const tsUser = ts.connect(user);

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.insertPolicy(did, inputdata);
        }
        // update so that we have several revision fo some policies
        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `modifieddata${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.updatePolicy(did, inputdata);
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.updatePolicy(did, inputdataV2);
        }

        for (let i = 0; i < 11; i += 1) {
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          const policyData = await tsUser.getPolicyByHash(
            ethers.sha256(inputdata),
          );
          expect(policyData).to.equal(ethers.hexlify(inputdata));
        }

        for (let i = 0; i < 4; i += 1) {
          const data = `modifieddata${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          const policyData = await tsUser.getPolicyByHash(
            ethers.sha256(inputdata),
          );
          expect(policyData).to.equal(ethers.hexlify(inputdata));
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!

          const policyDataV2 = await tsUser.getPolicyByHash(
            ethers.sha256(inputdataV2),
          );
          expect(policyDataV2).to.equal(ethers.hexlify(inputdataV2));
        }

        await expect(
          tsUser.getPolicyByHash(
            ethers.sha256(ethers.toUtf8Bytes("modifieddata4")),
          ),
        ).to.be.revertedWith("policy data does not exist");
      });

      it("Revisions should work or revert if not found", async () => {
        const tsUser = ts.connect(user);

        for (let i = 0; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.insertPolicy(did, inputdata);
        }
        // update so that we have several revision fo some policies
        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `modifieddata${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.updatePolicy(did, inputdata);
          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!

          await tsUser.updatePolicy(did, inputdataV2);
        }

        for (let i = 0; i < 4; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);

          const dataV1 = `modifieddata${i}`;
          const inputdataV1 = ethers.toUtf8Bytes(dataV1);

          const dataV2 = `modifieddata${i}V2`;
          const inputdataV2 = ethers.toUtf8Bytes(dataV2);
          // INSERT SHOULD BE DONE IN ORDER !!!

          const policyRevs = await tsUser.getPolicyRevisions(did, 1, 10);
          expect(policyRevs.items).to.eql([
            ethers.sha256(inputdata),
            ethers.sha256(inputdataV1),
            ethers.sha256(inputdataV2),
          ]);
        }
        await expect(tsUser.getPolicyRevisions(`12`, 1, 10)).to.be.revertedWith(
          "policyId does not exist",
        );
        for (let i = 4; i < 11; i += 1) {
          const did = `${i}`;
          const data = `data${i}`;
          const inputdata = ethers.toUtf8Bytes(data);
          // INSERT SHOULD BE DONE IN ORDER !!!

          const policyRevs = await tsUser.getPolicyRevisions(did, 1, 10);

          expect(policyRevs.items).to.eql([ethers.sha256(inputdata)]);
        }
      });
    });

    it("should work", () => {
      it("get policies", async () => {
        const tsUser = ts.connect(user);
        const policyId = "policyId:ebsi:1";
        // insert did and attribute1v0
        const attribute1v0 = ethers.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798",
        );
        const firstHash = ethers.sha256(attribute1v0);

        await expect(ts.insertPolicy(policyId, attribute1v0))
          .to.emit(ts, "AddNewPolicy")
          .withArgs(policyId, firstHash, ethers.hexlify(attribute1v0));

        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1 = await tsUser.getPolicy(policyId);

        expect(res1[0]).to.equal(ethers.hexlify(attribute1v0));
        expect(res1[1]).to.equal(firstHash);
        // update policyId  1
        const attribute1v1 = ethers.toUtf8Bytes(",newData");
        const secondHash = ethers.sha256(attribute1v1);

        await expect(ts.updatePolicy(policyId, attribute1v1))
          .to.emit(ts, "UpdateExistingPolicy")
          .withArgs(
            policyId,
            ethers.sha256(attribute1v1),
            ethers.hexlify(attribute1v1),
          );

        // get all policies
        const policies = await ts.getPolicies(1, 20);

        expect(policies.items.length).to.equal(1);
        expect(policies.items).to.eql([policyId]);

        expect(policies.total.toString()).to.equal("1");
        expect(policies.howMany.toString()).to.equal("1");
        expect(policies.prev.toString()).to.equal("1");
        expect(policies.next.toString()).to.equal("1");

        // policyId should have been updated
        // the latest Attribute hash should be attr1v1Hash and attr2Hash
        const res1V1 = await ts.getPolicy(policyId);

        expect(res1V1[0]).to.equal(ethers.hexlify(attribute1v1));
        expect(res1V1[1]).to.equal(secondHash);
      });

      it("should fail if policy does not exists", async () => {
        const policyId = "policyId:ebsi:1";
        const tsUser = ts.connect(user);
        const attribute1v0 = ethers.toUtf8Bytes(
          ",dlkjdskljdlshdjkshjkfdshkjfhsdjkfhsdjkhfkjsh89798",
        );
        await expect(
          tsUser.updatePolicy(policyId, attribute1v0),
        ).to.be.revertedWith("policy does not exist");
        await expect(tsUser.getPolicy(policyId)).to.be.revertedWith(
          "policy does not exist",
        );
      });
    });
  });
});
