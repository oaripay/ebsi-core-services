import { ethers } from "hardhat";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { PolicyImplementationMock } from "../src/types";
import deployContract from "./helpers/deploy";

enum TYPE {
  TYPE_UINT256,
  TYPE_BYTES,
  TYPE_ADDRESS,
  TYPE_BYTES32,
  TYPE_STRING,
  TYPE_BOOLEAN,
}

describe("Policy", () => {
  let snapshotId: any;
  // let owner: SignerWithAddress;
  // let user: SignerWithAddress;
  let policyImplementation: PolicyImplementationMock;
  before(async () => {
    // [owner, user] = await ethers.getSigners();
    policyImplementation = (await deployContract(
      "PolicyImplementationMock"
    )) as PolicyImplementationMock;
  });
  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });
  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  it("Should fail on inserting Policy", async () => {
    const policyName = "test policy";
    expect(
      policyImplementation.insertPolicy(TYPE.TYPE_BOOLEAN, [], policyName)
    ).to.be.revertedWith("test");
  });
});
