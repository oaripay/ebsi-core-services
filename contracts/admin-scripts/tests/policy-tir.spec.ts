/* eslint-disable no-await-in-loop */
import { ethers } from "hardhat";
import crypto from "node:crypto";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";

const num = ethers.BigNumber.from;

function getEthObject(o: unknown): Record<string, unknown> {
  const obj = o as string[] & Record<string, unknown>;
  const keys = Object.keys(obj);
  const result: Record<string, unknown> = {};
  keys.forEach((k, i) => {
    if (i >= keys.length / 2) result[k] = obj[k];
  });
  return result;
}

function randomPolicyData(): string {
  return `0x${crypto.randomBytes(10).toString("hex")}`;
}

function randomPolicyName(): string {
  return `policy-${crypto.randomBytes(5).toString("hex")}`;
}

describe("Policies", () => {
  let ts: Contract;
  let user: SignerWithAddress;

  const policyName = randomPolicyName();
  const policyData1 = randomPolicyData();
  const policyData2 = randomPolicyData();
  const policyHash1 = ethers.utils.sha256(
    Buffer.from(policyData1.slice(2), "hex")
  );
  const policyHash2 = ethers.utils.sha256(
    Buffer.from(policyData2.slice(2), "hex")
  );

  beforeEach(async () => {
    [, user] = await ethers.getSigners();
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();

    const contractFactory = await ethers.getContractFactory(
      "contracts/trusted-issuers-registry/contracts/tir/Tir.sol:Tir",
      {
        libraries: {
          Pagination: paginationLib.address,
        },
      }
    );
    ts = await contractFactory.deploy();
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(ts.address).to.properAddress;
  });

  it("should insert/update a policy as user", async () => {
    // insert policy
    const tsUser = ts.connect(user);
    await expect(tsUser.insertPolicy(policyName, policyData1)).to.emit(
      ts,
      "AddNewPolicy"
    );

    // get policy
    let policy = await tsUser.getPolicy(policyName);
    expect(policy).to.eql([policyData1, policyHash1]);

    // get policyByHash
    const policyByHash = await tsUser.getPolicyByHash(policyHash1);
    expect(policyByHash).to.equal(policyData1);

    // update policy
    await expect(ts.updatePolicy(policyName, policyData2)).to.emit(
      ts,
      "UpdateExistingPolicy"
    );
    policy = await tsUser.getPolicy(policyName);
    expect(policy).to.eql([policyData2, policyHash2]);

    // the policy should have 2 revisions
    const policyRevisions = await tsUser.getPolicyRevisions(policyName, 1, 10);
    expect(getEthObject(policyRevisions)).to.eql({
      items: [policyHash1, policyHash2],
      total: num(2),
      howMany: num(2),
      prev: num(1),
      next: num(1),
    });
  });

  it("should get policies", async () => {
    // insert policies

    const policies: string[] = [];
    for (let i = 0; i < 18; i += 1) {
      policies[i] = randomPolicyName();
      await (await ts.insertPolicy(policies[i], randomPolicyData())).wait();
    }

    // get policies: page 1
    let issPagination = await ts.getPolicies(1, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: policies.slice(0, 5),
      total: num(18),
      howMany: num(5),
      prev: num(1),
      next: num(2),
    });

    // get policies: page 2
    issPagination = await ts.getPolicies(2, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: policies.slice(5, 10),
      total: num(18),
      howMany: num(5),
      prev: num(1),
      next: num(3),
    });

    // get policies: page 3
    issPagination = await ts.getPolicies(3, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: policies.slice(10, 15),
      total: num(18),
      howMany: num(5),
      prev: num(2),
      next: num(4),
    });

    // get policies: page 4
    issPagination = await ts.getPolicies(4, 5);
    expect(getEthObject(issPagination)).to.eql({
      items: policies.slice(15, 20),
      total: num(18),
      howMany: num(3),
      prev: num(3),
      next: num(4),
    });
  });

  it("should reject 2 policies with the same policy", async () => {
    await ts.insertPolicy(policyName, policyData1);
    await expect(ts.insertPolicy(policyName, policyData2)).to.be.revertedWith(
      "policy already exist"
    );
  });

  it("should reject a get or update of an unknown policy", async () => {
    await expect(ts.getPolicy(policyName)).to.be.revertedWith(
      "policy does not exist"
    );
    await expect(ts.updatePolicy(policyName, policyData1)).to.be.revertedWith(
      "policy does not exist"
    );
  });

  it("should reject the get of an unknown hash", async () => {
    await expect(ts.getPolicyByHash(policyHash1)).to.be.revertedWith(
      "policy data does not exist"
    );
  });
});
