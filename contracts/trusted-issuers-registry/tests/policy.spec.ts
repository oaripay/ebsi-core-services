import { ethers } from "hardhat";

import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";
import crypto from "node:crypto";

import type { Tir } from "../src/types";

import { testDidrAddress, testTprAddress } from "./testAddress";
import { decodeResult } from "./utils";

function randomPolicyData(): string {
  return `0x${crypto.randomBytes(10).toString("hex")}`;
}

function randomPolicyName(): string {
  return `policy-${crypto.randomBytes(5).toString("hex")}`;
}

describe("Policies", () => {
  let ts: Tir;
  let user: SignerWithAddress;

  const policyName = randomPolicyName();
  const policyData1 = randomPolicyData();
  const policyData2 = randomPolicyData();
  const policyHash1 = ethers.sha256(Buffer.from(policyData1.slice(2), "hex"));
  const policyHash2 = ethers.sha256(Buffer.from(policyData2.slice(2), "hex"));

  beforeEach(async () => {
    [, user] = await ethers.getSigners();
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const paginationLib = await paginationFactory.deploy();

    const contractFactory = await ethers.getContractFactory("Tir", {
      libraries: {
        Pagination: await paginationLib.getAddress(),
      },
    });
    ts = await contractFactory.deploy(testTprAddress, testDidrAddress);
    await ts.initialize(42);
    const initialVersion = await ts.version();
    expect(initialVersion).to.equal(42);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(await ts.getAddress()).to.properAddress;
  });

  it("should insert/update a policy as user", async () => {
    // insert policy
    const tsUser = ts.connect(user);
    await expect(tsUser.insertPolicy(policyName, policyData1)).to.emit(
      ts,
      "AddNewPolicy",
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
      "UpdateExistingPolicy",
    );
    policy = await tsUser.getPolicy(policyName);
    expect(policy).to.eql([policyData2, policyHash2]);

    // the policy should have 2 revisions
    const policyRevisions = await tsUser.getPolicyRevisions(policyName, 1, 10);
    expect(decodeResult(policyRevisions)).to.eql({
      howMany: 2n,
      items: [policyHash1, policyHash2],
      next: 1n,
      prev: 1n,
      total: 2n,
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
    expect(decodeResult(issPagination)).to.eql({
      howMany: 5n,
      items: policies.slice(0, 5),
      next: 2n,
      prev: 1n,
      total: 18n,
    });

    // get policies: page 2
    issPagination = await ts.getPolicies(2, 5);
    expect(decodeResult(issPagination)).to.eql({
      howMany: 5n,
      items: policies.slice(5, 10),
      next: 3n,
      prev: 1n,
      total: 18n,
    });

    // get policies: page 3
    issPagination = await ts.getPolicies(3, 5);
    expect(decodeResult(issPagination)).to.eql({
      howMany: 5n,
      items: policies.slice(10, 15),
      next: 4n,
      prev: 2n,
      total: 18n,
    });

    // get policies: page 4
    issPagination = await ts.getPolicies(4, 5);
    expect(decodeResult(issPagination)).to.eql({
      howMany: 3n,
      items: policies.slice(15, 20),
      next: 4n,
      prev: 3n,
      total: 18n,
    });
  });

  it("should reject 2 policies with the same policy", async () => {
    await ts.insertPolicy(policyName, policyData1);
    await expect(ts.insertPolicy(policyName, policyData2)).to.be.revertedWith(
      "policy already exist",
    );
  });

  it("should reject a get or update of an unknown policy", async () => {
    await expect(ts.getPolicy(policyName)).to.be.revertedWith(
      "policy does not exist",
    );
    await expect(ts.updatePolicy(policyName, policyData1)).to.be.revertedWith(
      "policy does not exist",
    );
  });

  it("should reject the get of an unknown hash", async () => {
    await expect(ts.getPolicyByHash(policyHash1)).to.be.revertedWith(
      "policy data does not exist",
    );
  });
});
