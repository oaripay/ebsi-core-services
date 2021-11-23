import { ethers } from "hardhat";
import { expect } from "chai";
import { PolicyRegistry } from "../src/types";

describe("Policy", () => {
  let snapshotId: string;
  let policyContract: PolicyRegistry;

  const pcs = [
    {
      name: "name1",
      attributeName: "attrName1",
      value: ethers.utils.toUtf8Bytes("oneval"),
      attributeOperation: 0,
      typeOfValue: 3,
    },
    {
      name: "name2",
      attributeName: "attrName2",
      value: ethers.utils.toUtf8Bytes("twoval"),
      attributeOperation: 0,
      typeOfValue: 1,
    },
    {
      name: "name3",
      attributeName: "attrName3",
      value: ethers.utils.toUtf8Bytes("treeval"),
      attributeOperation: 0,
      typeOfValue: 1,
    },
    {
      name: "name4",
      attributeName: "attrName4",
      value: ethers.utils.toUtf8Bytes("fourval"),
      attributeOperation: 0,
      typeOfValue: 1,
    },
  ];

  const userAttr = ["attr1", "attr2", "attr3", "attr4", "attr5"];
  const userAttrVal = [
    ethers.utils.randomBytes(5),
    ethers.utils.randomBytes(5),
    ethers.utils.randomBytes(5),
    ethers.utils.randomBytes(5),
    ethers.utils.randomBytes(5),
  ];

  before(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const pagination = await paginationFactory.deploy();
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistry",
      {
        libraries: {
          Pagination: pagination.address,
        },
      }
    );
    policyContract = (await policyRegistryFactory.deploy()) as PolicyRegistry;
    await policyContract.deployed();

    await policyContract.initialize(12);
    expect(await policyContract.version()).to.equal(12);
    expect(policyContract.address).to.properAddress;

    await policyContract.insertPolicy(0, [], "test policy 1", "registry 1");
    await policyContract.insertPolicy(0, pcs, "test policy 2", "registry 2");
    await policyContract.insertPolicy(0, [], "test policy 3", "registry 3");
    const user = (await ethers.getSigners())[0];
    await policyContract.insertUserAttributes(
      user.address,
      userAttr,
      userAttrVal
    );
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("getAttr", () => {
    it("should test", async () => {
      await expect(policyContract.getPolicy(3)).to.be.revertedWith(
        "Policy: invalid policy"
      );
      const user = (await ethers.getSigners())[0];
      const userAttr = await policyContract.getUserAttributes(
        user.address,
        1,
        10
      );
      console.log(userAttr);
      await policyContract.deleteUserAttribute(user.address, "attr3");
      const userAttrUpdated = await policyContract.getUserAttributes(
        user.address,
        1,
        10
      );
      console.log(userAttrUpdated);
    });
  });
});
