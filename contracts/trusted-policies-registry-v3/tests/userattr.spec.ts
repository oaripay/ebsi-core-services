import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { expect } from "chai";
import { ethers } from "hardhat";

import type { PolicyRegistry } from "../src/types";

describe("UserAttributesManagement", () => {
  let snapshotId: string;
  let policyContract: PolicyRegistry;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  const userAttr = ["attr1", "attr2", "attr3", "attr4", "attr5"];

  before(async () => {
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistry",
      {},
    );
    policyContract = await policyRegistryFactory.deploy();
    await policyContract.deployed();

    await policyContract.initialize(10);
    expect(await policyContract.version()).to.equal(10);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(policyContract.address).to.properAddress;

    await policyContract.insertPolicy("test policy 2", "registry 2");
    [user, user2] = await ethers.getSigners();

    await policyContract.insertUserAttributes(user.address, userAttr);
  });

  beforeEach(async () => {
    snapshotId = (await ethers.provider.send("evm_snapshot", [])) as string;
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("insertUserAttributes", () => {
    it("should fail if user does not have OPERATOR_ROLE", async () => {
      await expect(
        policyContract
          .connect(user2)
          .insertUserAttributes(ethers.constants.AddressZero, ["attr"]),
      ).to.be.revertedWith(
        `AccessControl: account ${user2.address.toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929`,
      );
    });

    it("Should fail for empty user", async () => {
      await expect(
        policyContract.insertUserAttributes(ethers.constants.AddressZero, [
          "attr",
        ]),
      ).to.be.revertedWith("Policy: invalid user address");
    });

    it("Should fail for empty attributes list", async () => {
      await expect(
        policyContract.insertUserAttributes(user.address, []),
      ).to.be.revertedWith("Policy: invalid attr list");
    });

    it("Should fail for attribute empty string", async () => {
      await expect(
        policyContract.insertUserAttributes(user.address, ["", "test"]),
      ).to.be.revertedWith("Attribute empty");
    });

    it("Should fail for attribute already added", async () => {
      await expect(
        policyContract.insertUserAttributes(user.address, ["attr1"]),
      ).to.be.revertedWith("Attribute already defined");
    });

    it("Should insert attribute", async () => {
      await expect(policyContract.insertUserAttributes(user.address, ["attrX"]))
        .to.emit(policyContract, "UserAttributeInserted")
        .withArgs(user.address, "attrX");
      const userAttribute = await policyContract.getUserAttribute(
        user.address,
        5,
      );
      expect(userAttribute).to.equal("attrX");
    });
  });

  describe("deleteUserAttribute", () => {
    it("should fail if user does not have OPERATOR_ROLE", async () => {
      await expect(
        policyContract
          .connect(user2)
          .deleteUserAttribute(user2.address, "attr"),
      ).to.be.revertedWith(
        `AccessControl: account ${user2.address.toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929`,
      );
    });

    it("Should fail for invalid user address", async () => {
      await expect(
        policyContract.deleteUserAttribute(
          ethers.constants.AddressZero,
          "attr1",
        ),
      ).to.be.revertedWith("Policy: invalid user address");
    });

    it("Should fail for empty/missing attribute", async () => {
      await expect(
        policyContract.deleteUserAttribute(user.address, "attr1111"),
      ).to.be.revertedWith("Policy: attr invalid");

      await expect(
        policyContract.deleteUserAttribute(user.address, ""),
      ).to.be.revertedWith("Policy: attr invalid");
    });

    it("Should delete user attribute", async () => {
      await expect(policyContract.deleteUserAttribute(user.address, "attr3"))
        .to.emit(policyContract, "UserAttributeDeleted")
        .withArgs(user.address, "attr3");

      const userAttribute = await policyContract.getUserAttribute(
        user.address,
        2,
      );
      expect(userAttribute).to.equal("attr5");
    });
  });

  describe("getUserAttribute", () => {
    it("Should fail for missing attribute", async () => {
      await expect(
        policyContract.getUserAttribute(user2.address, 12),
      ).to.be.revertedWith("Policy: invalid user or attribute");
    });

    it("Should return user attribute", async () => {
      let result = await policyContract.getUserAttribute(user.address, 0);
      expect(result).to.equal("attr1");
      result = await policyContract.getUserAttribute(user.address, 1);
      expect(result).to.equal("attr2");
    });
  });

  describe("PolicyEngine", () => {
    it("should check user has access", async () => {
      await policyContract.insertPolicy(
        "test-policy-against-user",
        "check policy engine test",
      );

      await policyContract.insertUserAttributes(user.address, [
        "test-policy-against-user",
      ]);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(
        await policyContract["checkPolicy(uint256,address)"](2, user.address),
      ).to.be.true;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(
        await policyContract["checkPolicy(uint256,address)"](2, user2.address),
      ).to.be.false;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(
        await policyContract["checkPolicy(string,address)"](
          "test-policy-against-user",
          user.address,
        ),
      ).to.be.true;
      await expect(
        policyContract["checkPolicy(uint256,address)"](222, user2.address),
      ).to.be.revertedWith("Policy: inactive or not defined");
    });
  });
});
