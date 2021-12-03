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
      value: ethers.utils.toUtf8Bytes("vxc4gdbfgb"),
      attributeOperation: 0,
      typeOfValue: 3,
    },
    {
      name: "name2",
      attributeName: "attrName2",
      value: ethers.utils.toUtf8Bytes("asdasdd"),
      attributeOperation: 0,
      typeOfValue: 1,
    },
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
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("getPolicy", () => {
    it("Should fail for invalid policy", async () => {
      await expect(policyContract.getPolicy(3)).to.be.revertedWith(
        "Policy: invalid policy"
      );
    });

    it("Should return policy 1", async () => {
      const [policyId, registry, policyName, opType, status, policyConditions] =
        await policyContract.getPolicy(1);
      expect(policyId).to.equal(1);
      expect(registry).to.equal("registry 2");
      expect(policyName).to.equal("test policy 2");
      expect(opType).to.equal(0);
      expect(status).to.be.true;
      expect(policyConditions).to.have.length(pcs.length);

      for (let i = 0; i < pcs.length; i += 1) {
        expect(policyConditions[i]).to.have.members([
          pcs[i].name,
          pcs[i].attributeName,
          pcs[i].typeOfValue,
          ethers.utils.hexlify(pcs[i].value),
          pcs[i].attributeOperation,
        ]);
      }
    });

    it("Should return policy 0", async () => {
      const [policyId, registry, policyName, opType, status, policyConditions] =
        await policyContract.getPolicy(0);
      expect(policyId).to.equal(0);
      expect(registry).to.equal("registry 1");
      expect(policyName).to.equal("test policy 1");
      expect(opType).to.equal(0);
      expect(status).to.be.true;
      expect(policyConditions).to.have.length(0);
    });
  });

  describe("getPolicies", () => {
    it("Should fail for invalid pageSize", async () => {
      await expect(policyContract.getPolicies(1, 51)).to.be.revertedWith(
        "PSize not <=50"
      );
      await expect(policyContract.getPolicies(1, 0)).to.be.revertedWith(
        "PSize not >0"
      );
    });

    it("Should fail for invalid page value", async () => {
      await expect(policyContract.getPolicies(0, 10)).to.be.revertedWith(
        "Page not >0"
      );
    });

    it("Should return all policies", async () => {
      const paginatedPolicies = await policyContract.getPolicies(1, 10);
      expect(paginatedPolicies.items).to.deep.equal([
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(2),
      ]);
      expect(paginatedPolicies.total.toString()).to.equal("3");
      expect(paginatedPolicies.howMany.toString()).to.equal("3");
      expect(paginatedPolicies.prev.toString()).to.equal("1");
      expect(paginatedPolicies.next.toString()).to.equal("1");
    });

    it("Should return first page", async () => {
      const paginatedPolicies = await policyContract.getPolicies(1, 2);
      expect(paginatedPolicies.items).to.deep.equal([
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
      ]);
      expect(paginatedPolicies.total.toString()).to.equal("3");
      expect(paginatedPolicies.howMany.toString()).to.equal("2");
      expect(paginatedPolicies.prev.toString()).to.equal("1");
      expect(paginatedPolicies.next.toString()).to.equal("2");
    });
  });

  describe("deactivatePolicy", () => {
    it("Should fail for missing policy", async () => {
      await expect(policyContract.deactivatePolicy(3)).to.be.revertedWith(
        "Policy: invalid policy Id"
      );
    });

    it("Should deactivate policy", async () => {
      await expect(policyContract.deactivatePolicy(0))
        .to.emit(policyContract, "PolicyDeactivated")
        .withArgs(0);
      const policy = await policyContract.getPolicy(0);
      expect(policy.status).to.be.false;
    });

    it("Should fail for inactive policy", async () => {
      await policyContract.deactivatePolicy(0);
      await expect(policyContract.deactivatePolicy(0)).to.be.revertedWith(
        "Policy: invalid policy"
      );
    });
  });

  describe("activatePolicy", () => {
    it("Should fail for missing policy", async () => {
      await expect(policyContract.activatePolicy(3)).to.be.revertedWith(
        "Policy: invalid policy Id"
      );
    });

    it("Should fail for active policy", async () => {
      await expect(policyContract.activatePolicy(0)).to.be.revertedWith(
        "Policy: invalid policy"
      );
    });

    it("Should activate policy", async () => {
      await policyContract.deactivatePolicy(0);
      let policy = await policyContract.getPolicy(0);
      expect(policy.status).to.be.false;
      await expect(policyContract.activatePolicy(0))
        .to.emit(policyContract, "PolicyActivated")
        .withArgs(0);
      policy = await policyContract.getPolicy(0);
      expect(policy.status).to.be.true;
    });
  });

  describe("updatePolicy", () => {
    it("Should fail for missing policy", async () => {
      await expect(
        policyContract.updatePolicy(3, 0, "", "")
      ).to.be.revertedWith("Policy: invalid policy Id");
    });

    it("Should fail for inactive policy", async () => {
      await policyContract.deactivatePolicy(0);
      await expect(
        policyContract.updatePolicy(0, 0, "", "")
      ).to.be.revertedWith("Policy: policy does not exist or inactive");
    });

    it("Should update policy", async () => {
      await expect(policyContract.updatePolicy(1, 0, "policy", "registry"))
        .to.emit(policyContract, "PolicyUpdated")
        .withArgs(1, "test policy 2", "policy", "registry 2", "registry");
      const policy = await policyContract.getPolicy(1);
      expect(policy.policyId).to.equal(1);
      expect(policy.policyName).to.equal("policy");
      expect(policy.registry).to.equal("registry");
      expect(policy.policyConditions).to.have.length(pcs.length);
    });
  });

  describe("addPolicyConditions", () => {
    it("Should fail for missing policy id", async () => {
      await expect(
        policyContract.addPolicyConditions(3, [])
      ).to.be.revertedWith("Policy: invalid policy Id");
    });

    it("Should fail for inactive policy", async () => {
      await policyContract.deactivatePolicy(0);
      await expect(
        policyContract.addPolicyConditions(0, [])
      ).to.be.revertedWith("Policy: policy does not exist or inactive");
    });

    it("Should be able to add empty policyConditions array", async () => {
      await policyContract.addPolicyConditions(1, []);
      const policy = await policyContract.getPolicy(1);
      expect(policy.policyConditions).to.have.length(pcs.length);
    });

    it("Should fail for empty attribute name", async () => {
      await expect(
        policyContract.addPolicyConditions(1, [
          {
            name: "name",
            attributeName: "",
            value: ethers.utils.toUtf8Bytes("4hcd6s"),
            attributeOperation: 0,
            typeOfValue: 3,
          },
        ])
      ).to.be.revertedWith("Policy: invalid attribute name on counter 0");
    });

    it("Should add policy condition", async () => {
      const addPcs = [
        {
          name: "name 1",
          attributeName: "attr 1",
          value: ethers.utils.toUtf8Bytes("4hcd6s"),
          attributeOperation: 0,
          typeOfValue: 3,
        },
        {
          name: "name 2",
          attributeName: "attr 2",
          value: ethers.utils.toUtf8Bytes("frdc33"),
          attributeOperation: 0,
          typeOfValue: 3,
        },
      ];
      await expect(policyContract.addPolicyConditions(1, addPcs))
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(0, "attr 1", ethers.utils.hexlify(addPcs[0].value))
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(1, "attr 2", ethers.utils.hexlify(addPcs[1].value));
      const policy = await policyContract.getPolicy(1);
      expect(policy.policyConditions).to.have.length(
        pcs.length + addPcs.length
      );
      for (let i = 0; i < addPcs.length; i += 1) {
        expect(policy.policyConditions[i + addPcs.length].name).to.equal(
          addPcs[i].name
        );
        expect(
          policy.policyConditions[i + addPcs.length].attributeName
        ).to.equal(addPcs[i].attributeName);
        expect(policy.policyConditions[i + addPcs.length].value).to.equal(
          ethers.utils.hexlify(addPcs[i].value)
        );
        expect(policy.policyConditions[i + addPcs.length].typeOfValue).to.equal(
          addPcs[i].typeOfValue
        );
        expect(
          policy.policyConditions[i + addPcs.length].attributeOperation
        ).to.equal(addPcs[i].attributeOperation);
      }
    });
  });

  describe("deletePolicyCondition", () => {
    it("Should fail for missing policy id", async () => {
      await expect(
        policyContract.deletePolicyCondition(3, 0)
      ).to.be.revertedWith("Policy: invalid policy Id");
    });

    it("Should fail for inactive policy", async () => {
      await policyContract.deactivatePolicy(0);
      await expect(
        policyContract.deletePolicyCondition(0, 0)
      ).to.be.revertedWith("Policy: policy does not exist or inactive");
    });

    it("Should fail for invalid policyConditionId", async () => {
      await expect(
        policyContract.deletePolicyCondition(1, 2)
      ).to.be.revertedWith("Policy: invalid condition");
      await expect(
        policyContract.deletePolicyCondition(0, 0)
      ).to.be.revertedWith("Policy: invalid condition");
    });

    it("Should delete policyCondition", async () => {
      await policyContract.addPolicyConditions(1, [
        {
          name: "name3",
          attributeName: "attr3",
          value: ethers.utils.toUtf8Bytes("4hcd6s"),
          attributeOperation: 0,
          typeOfValue: 3,
        },
      ]);

      await expect(policyContract.deletePolicyCondition(1, 1))
        .to.emit(policyContract, "PolicyConditionDeleted")
        .withArgs(1, pcs[1].attributeName, ethers.utils.hexlify(pcs[1].value));
      let policy = await policyContract.getPolicy(1);
      expect(policy.policyConditions).to.have.length(2);
      expect(policy.policyConditions[0].name).to.equal(pcs[0].name);
      expect(policy.policyConditions[1].name).to.equal("name3");

      await policyContract.addPolicyConditions(1, [
        {
          name: "name4",
          attributeName: "attr4",
          value: ethers.utils.toUtf8Bytes("4hcd6s"),
          attributeOperation: 0,
          typeOfValue: 3,
        },
      ]);
      policy = await policyContract.getPolicy(1);
      expect(policy.policyConditions).to.have.length(3);
      expect(policy.policyConditions[2].name).to.equal("name4");

      await expect(await policyContract.deletePolicyCondition(1, 0))
        .to.emit(policyContract, "PolicyConditionDeleted")
        .withArgs(0, pcs[0].attributeName, ethers.utils.hexlify(pcs[0].value));
      policy = await policyContract.getPolicy(1);
      expect(policy.policyConditions).to.have.length(2);
      expect(policy.policyConditions[0].name).to.equal("name4");
      expect(policy.policyConditions[1].name).to.equal("name3");
    });
  });

  describe("insertPolicy", () => {
    it("Should fail for empty name", async () => {
      await expect(
        policyContract.insertPolicy(1, [], "", "registry")
      ).to.be.revertedWith("Policy: name required");
    });

    it("Should fail for empty registry", async () => {
      await expect(
        policyContract.insertPolicy(1, [], "name", "")
      ).to.be.revertedWith("Policy: registry required");
    });

    it("Should fail for empty attribute policy condition", async () => {
      await expect(
        policyContract.insertPolicy(
          1,
          [
            {
              name: "name",
              attributeName: "",
              value: ethers.utils.toUtf8Bytes("vxc4gdbfgb"),
              attributeOperation: 0,
              typeOfValue: 3,
            },
          ],
          "name",
          "registry"
        )
      ).to.be.revertedWith("Policy: invalid attribute name on counter 0");
    });

    it("Should insert policy", async () => {
      await expect(policyContract.insertPolicy(0, pcs, "name", "registry"))
        .to.emit(policyContract, "PolicyInserted")
        .withArgs(3, "name", "registry")
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(0, pcs[0].attributeName, ethers.utils.hexlify(pcs[0].value))
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(1, pcs[1].attributeName, ethers.utils.hexlify(pcs[1].value));
      const [policyId, registry, policyName, opType, status, policyConditions] =
        await policyContract.getPolicy(3);
      expect(policyConditions).to.have.length(2);
      expect(policyId).to.equal(3);
      expect(registry).to.equal("registry");
      expect(policyName).to.equal("name");
      expect(opType).to.equal(0);
      expect(status).to.be.true;
    });
  });

  describe("searchPolicy", () => {
    it("Should return searched policy ids", async () => {
      // search missing string
      let [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "test policy"
      );
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyRegistry).to.have.length(0);

      // search by name of policy 0
      [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "test policy 1"
      );
      expect(byPolicyRegistry).to.have.length(0);
      expect(byPolicyName).to.deep.equal([ethers.BigNumber.from(0)]);

      // search by registry of policy 2
      [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "registry 3"
      );
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyRegistry).to.deep.equal([ethers.BigNumber.from(2)]);

      // check another policy with the same name / registry
      await policyContract.insertPolicy(0, [], "test policy 2", "registry 3");
      [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "registry 3"
      );
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyRegistry).to.deep.equal([
        ethers.BigNumber.from(2),
        ethers.BigNumber.from(3),
      ]);
      [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "test policy 2"
      );
      expect(byPolicyRegistry).to.have.length(0);
      expect(byPolicyName).to.deep.equal([
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(3),
      ]);

      // update policy 1
      await policyContract.updatePolicy(
        1,
        0,
        "test policy 2 updated",
        "registry 3"
      );
      [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "test policy 2"
      );
      expect(byPolicyName).to.deep.equal([ethers.BigNumber.from(3)]);
      expect(byPolicyRegistry).to.have.length(0);

      [byPolicyName, byPolicyRegistry] = await policyContract.searchPolicy(
        "registry 3"
      );
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyRegistry).to.deep.equal([
        ethers.BigNumber.from(2),
        ethers.BigNumber.from(3),
        ethers.BigNumber.from(1),
      ]);
    });
  });
});
