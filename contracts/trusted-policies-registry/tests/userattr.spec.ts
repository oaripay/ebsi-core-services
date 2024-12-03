import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { expect } from "chai";
import { ethers } from "hardhat";

import type { PolicyRegistry } from "../src/types";

describe("UserAttributesManagement", () => {
  let snapshotId: string;
  let policyContract: PolicyRegistry;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  const pcs = [
    {
      attributeName: "attrName1",
      attributeOperation: 0,
      name: "name1",
      typeOfValue: 3,
      value: ethers.utils.toUtf8Bytes("oneval"),
    },
    {
      attributeName: "attrName2",
      attributeOperation: 0,
      name: "name2",
      typeOfValue: 1,
      value: ethers.utils.toUtf8Bytes("twoval"),
    },
    {
      attributeName: "attrName3",
      attributeOperation: 0,
      name: "name3",
      typeOfValue: 1,
      value: ethers.utils.toUtf8Bytes("treeval"),
    },
    {
      attributeName: "attrName4",
      attributeOperation: 0,
      name: "name4",
      typeOfValue: 1,
      value: ethers.utils.toUtf8Bytes("fourval"),
    },
  ];

  const userAttr = ["attr1", "attr2", "attr3", "attr4", "attr5"];
  const userAttrVal = [
    ethers.utils.toUtf8Bytes("val1"),
    ethers.utils.toUtf8Bytes("val2"),
    ethers.utils.toUtf8Bytes("val3"),
    ethers.utils.toUtf8Bytes("val4"),
    ethers.utils.toUtf8Bytes("val5"),
  ];

  before(async () => {
    const pg = await ethers.getContractFactory("Pagination", {});
    const pagination = await pg.deploy();
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistry",
      {
        libraries: {
          Pagination: pagination.address,
        },
      },
    );
    policyContract = await policyRegistryFactory.deploy();
    await policyContract.deployed();

    await policyContract.initialize(10);
    expect(await policyContract.version()).to.equal(10);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(policyContract.address).to.properAddress;

    await policyContract.insertPolicy(0, pcs, "test policy 2", "registry 2");
    [user, user2] = await ethers.getSigners();

    await policyContract.insertUserAttributes(
      user.address,
      userAttr,
      userAttrVal,
    );
  });

  beforeEach(async () => {
    snapshotId = (await ethers.provider.send("evm_snapshot", [])) as string;
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("insertUserAttributes", () => {
    it("Should fail for empty user", async () => {
      await expect(
        policyContract.insertUserAttributes(
          ethers.constants.AddressZero,
          ["attr"],
          [],
        ),
      ).to.be.revertedWith("Policy: invalid user address");
    });

    it("Should fail for empty attributes", async () => {
      await expect(
        policyContract.insertUserAttributes(user.address, [], []),
      ).to.be.revertedWith("Policy: invalid attr list");
    });

    it("Should fail for empty attr value array", async () => {
      await expect(
        policyContract.insertUserAttributes(
          user.address,
          ["attrX"],
          [ethers.utils.randomBytes(3), ethers.utils.randomBytes(4)],
        ),
      ).to.be.revertedWith("Policy: invalid attr length");
    });

    it("Should fail for invalid attr value array length", async () => {
      await expect(
        policyContract.insertUserAttributes(user.address, ["attrX"], []),
      ).to.be.revertedWith("Policy: invalid attr length");
    });

    it("Should fail for attribute already added", async () => {
      await expect(
        policyContract.insertUserAttributes(
          user.address,
          ["attr1"],
          [ethers.utils.randomBytes(5)],
        ),
      ).to.be.revertedWith("Attribute already defined");
    });

    it("Should insert attribute", async () => {
      await expect(
        policyContract.insertUserAttributes(
          user.address,
          ["attrX"],
          [ethers.utils.toUtf8Bytes("attrXValue")],
        ),
      )
        .to.emit(policyContract, "UserAttributeInserted")
        .withArgs(
          user.address,
          "attrX",
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes("attrXValue")),
        );

      expect(
        await policyContract.getUserAttribute(user.address, "attrX"),
      ).to.equal(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("attrXValue")));

      const userAttributes = await policyContract.getUserAttributes(
        user.address,
        1,
        10,
      );
      expect(userAttributes.items).to.have.length(6);
    });
  });

  describe("updateUserAttribute", () => {
    it("Should fail for empty user", async () => {
      await expect(
        policyContract.updateUserAttribute(
          ethers.constants.AddressZero,
          "",
          ethers.utils.randomBytes(3),
        ),
      ).to.revertedWith("Policy: invalid user address");
    });

    it("Should fail for missing user", async () => {
      await expect(
        policyContract.updateUserAttribute(
          user2.address,
          "",
          ethers.utils.randomBytes(3),
        ),
      ).to.revertedWith("Policy: attr invalid");
    });

    it("Should fail for empty attribute", async () => {
      await expect(
        policyContract.updateUserAttribute(
          user.address,
          "",
          ethers.utils.randomBytes(3),
        ),
      ).to.revertedWith("Policy: attr invalid");
    });

    it("Should fail for missing attribute", async () => {
      await expect(
        policyContract.updateUserAttribute(
          user.address,
          "missingAttr",
          ethers.utils.randomBytes(3),
        ),
      ).to.revertedWith("Policy: attr invalid");
    });

    it("Should fail for empty attribute value", async () => {
      await expect(
        policyContract.updateUserAttribute(user.address, "attr1", []),
      ).to.revertedWith("Policy: invalid value");
    });

    it("Should update user attribute", async () => {
      await expect(
        policyContract.updateUserAttribute(
          user.address,
          "attr1",
          ethers.utils.toUtf8Bytes("attr1Updated"),
        ),
      )
        .to.emit(policyContract, "UserAttributeUpdated")
        .withArgs(
          user.address,
          "attr1",
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes("attr1Updated")),
        );

      expect(
        await policyContract.getUserAttribute(user.address, "attr1"),
      ).to.equal(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes("attr1Updated")),
      );
    });
  });

  describe("deleteUserAttribute", () => {
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

      const userAttributes = await policyContract.getUserAttributes(
        user.address,
        1,
        10,
      );
      expect(userAttributes.items).to.deep.equal([
        "attr1",
        "attr2",
        "attr5",
        "attr4",
      ]);
    });
  });

  describe("getUsers", () => {
    it("Should fail for invalid page size", async () => {
      await expect(policyContract.getUsers(1, 0)).to.be.revertedWith(
        "PSize not >0",
      );

      await expect(policyContract.getUsers(1, 51)).to.be.revertedWith(
        "PSize not <=50",
      );
    });

    it("Should fail for invalid page", async () => {
      await expect(policyContract.getUsers(0, 1)).to.be.revertedWith(
        "Page not >0",
      );
    });

    it("Should return user addresses", async () => {
      await policyContract.insertUserAttributes(
        user2.address,
        ["attr1"],
        [ethers.utils.randomBytes(3)],
      );

      let result = await policyContract.getUsers(1, 1);
      expect(result.items).to.deep.equal([user.address]);
      expect(result.prev).to.equal(1);
      expect(result.next).to.equal(2);
      expect(result.total).to.equal(2);
      expect(result.howMany).to.equal(1);

      result = await policyContract.getUsers(2, 1);
      expect(result.items).to.deep.equal([user2.address]);
      expect(result.prev).to.equal(1);
      expect(result.next).to.equal(2);
    });
  });

  describe("getUserAttributes", () => {
    it("Should fail for invalid page size", async () => {
      await expect(
        policyContract.getUserAttributes(user.address, 1, 0),
      ).to.be.revertedWith("PSize not >0");

      await expect(
        policyContract.getUserAttributes(user.address, 1, 51),
      ).to.be.revertedWith("PSize not <=50");
    });

    it("Should fail for invalid page", async () => {
      await expect(
        policyContract.getUserAttributes(user.address, 0, 1),
      ).to.be.revertedWith("Page not >0");
    });

    it("Should fail for missing user", async () => {
      await expect(
        policyContract.getUserAttributes(user2.address, 1, 1),
      ).to.be.revertedWith("Policy: invalid user");

      await expect(
        policyContract.getUserAttributes(ethers.constants.AddressZero, 1, 1),
      ).to.be.revertedWith("Policy: invalid user address");
    });

    it("Should return user attributes", async () => {
      let result = await policyContract.getUserAttributes(user.address, 1, 3);
      expect(result.items).to.deep.equal(["attr1", "attr2", "attr3"]);
      expect(result.next).to.equal(2);
      expect(result.prev).to.equal(1);
      expect(result.total).to.equal(5);

      result = await policyContract.getUserAttributes(user.address, 2, 3);
      expect(result.items).to.deep.equal(["attr4", "attr5"]);
      expect(result.next).to.equal(2);
      expect(result.prev).to.equal(1);
    });
  });

  describe("getUserAttribute", () => {
    it("Should fail for invalid user", async () => {
      await expect(
        policyContract.getUserAttribute(ethers.constants.AddressZero, "attr1"),
      ).to.be.revertedWith("Policy: invalid user address");
    });

    it("Should return empty attribute", async () => {
      expect(
        await policyContract.getUserAttribute(user.address, "attr22"),
      ).to.equal(ethers.utils.hexlify([]));

      expect(
        await policyContract.getUserAttribute(user2.address, "attr1"),
      ).to.equal(ethers.utils.hexlify([]));
    });

    it("Should return user attribute", async () => {
      expect(
        await policyContract.getUserAttribute(user.address, "attr1"),
      ).to.equal(ethers.utils.hexlify(ethers.utils.toUtf8Bytes("val1")));
    });
  });
});
