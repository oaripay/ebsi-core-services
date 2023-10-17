import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractFunction, Signer } from "ethers";
import { PolicyRegistry } from "../src/types";

const num = ethers.BigNumber.from;

function getEthObject(o: unknown): Record<string, unknown> | unknown[] {
  const obj = o as string[] & Record<string, unknown>;
  const keys = Object.keys(obj);

  // check if it is a string
  if (typeof obj === "string") return obj;

  // check if it is an array
  if (keys[keys.length - 1] === String(keys.length - 1)) {
    return (o as unknown[]).map((item) => getEthObject(item));
  }

  // check if it is a buffer
  if (keys[0] !== "0") return obj;

  // treat it as object. ["alice", "name": "alice"] ==> { "name" : "alice" }
  const result: Record<string, unknown> = {};
  keys.forEach((k, i) => {
    if (i < keys.length / 2) return;

    if (typeof obj[k] === "object") {
      result[k] = getEthObject(obj[k]);
    } else {
      result[k] = obj[k];
    }
  });
  return result;
}

describe("Policy", () => {
  let snapshotId: string;
  let policyContract: PolicyRegistry;

  const pcs = [
    {
      name: "name1",
      attributeName: "attrName1",
      value: "0x1122334455667788",
      attributeOperation: 0,
      typeOfValue: 3,
    },
    {
      name: "name2",
      attributeName: "attrName2",
      value: "0xaabbccddeeff0011",
      attributeOperation: 0,
      typeOfValue: 1,
    },
  ];

  let addr1: Signer;
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";

  before(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const pagination = await paginationFactory.deploy();
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistry",
      {
        libraries: {
          Pagination: pagination.address,
        },
      },
    );
    policyContract = (await policyRegistryFactory.deploy()) as PolicyRegistry;
    [, addr1] = await ethers.getSigners();
    await policyContract.deployed();

    await policyContract.initialize(12);
    expect(await policyContract.version()).to.equal(12);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(policyContract.address).to.properAddress;

    await policyContract.insertPolicy(0, pcs, "policy-0", "description 0");
    await policyContract.insertPolicy(0, [], "policy-1", "description 1");
    await policyContract.insertPolicy(0, [], "policy-2", "description 2");
    await policyContract.insertPolicy(0, [], "policy-3", "description 3");
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Get functions", () => {
    it("Should fail for invalid policy", async () => {
      await expect(policyContract["getPolicy(uint256)"](4)).to.be.revertedWith(
        "Policy: invalid policy",
      );
    });

    it("Should return policy by id or by name", async () => {
      // Policy 0 - set of policyConditions
      let policyById = await policyContract["getPolicy(uint256)"](0);
      let policyByName = await policyContract["getPolicy(string)"]("policy-0");
      let expectedPolicy = {
        policyId: num(0),
        policyName: "policy-0",
        description: "description 0",
        opType: 0,
        status: true,
        policyConditions: pcs,
      };
      expect(getEthObject(policyById)).to.eql(expectedPolicy);
      expect(getEthObject(policyByName)).to.eql(expectedPolicy);

      // Policy 1 - no policyConditions
      policyById = await policyContract["getPolicy(uint256)"](1);
      policyByName = await policyContract["getPolicy(string)"]("policy-1");
      expectedPolicy = {
        policyId: num(1),
        policyName: "policy-1",
        description: "description 1",
        opType: 0,
        status: true,
        policyConditions: [],
      };
      expect(getEthObject(policyById)).to.eql(expectedPolicy);
      expect(getEthObject(policyByName)).to.eql(expectedPolicy);
    });

    it("should return policies by id or by name", async () => {
      // by Policy ID - page 1
      let policiesById = await policyContract.getPolicies(1, 2);
      expect(getEthObject(policiesById)).to.eql({
        items: [num(0), num(1)],
        total: num(4),
        howMany: num(2),
        prev: num(1),
        next: num(2),
      });

      // by Policy ID - page 2
      policiesById = await policyContract.getPolicies(2, 2);
      expect(getEthObject(policiesById)).to.eql({
        items: [num(2), num(3)],
        total: num(4),
        howMany: num(2),
        prev: num(1),
        next: num(2),
      });

      // by Policy Name - page 1
      let policiesByName = await policyContract.getPolicyNames(1, 2);
      expect(getEthObject(policiesByName)).to.eql({
        items: ["policy-0", "policy-1"],
        total: num(4),
        howMany: num(2),
        prev: num(1),
        next: num(2),
      });

      // by Policy Name - page 2
      policiesByName = await policyContract.getPolicyNames(2, 2);
      expect(getEthObject(policiesByName)).to.eql({
        items: ["policy-2", "policy-3"],
        total: num(4),
        howMany: num(2),
        prev: num(1),
        next: num(2),
      });
    });
  });

  describe("deactivatePolicy", () => {
    const tests = [
      {
        type: "call by id",
        override: "uint256",
        value: 0,
        invalidValue: 4,
      },
      {
        type: "call by name",
        override: "string",
        value: "policy-1",
        invalidValue: "bad-policy",
      },
    ] as const;

    tests.forEach(({ type, override, value, invalidValue }) => {
      let deactivatePolicy: ContractFunction;
      let deactivatePolicyBadUser: ContractFunction;
      let getPolicy: ContractFunction;
      before(() => {
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        deactivatePolicyBadUser =
          policyContract.connect(addr1)[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy (${type})`, async () => {
        await expect(deactivatePolicy(invalidValue)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        await expect(deactivatePolicyBadUser(value)).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should deactivate policy (${type})`, async () => {
        await expect(deactivatePolicy(value)).to.emit(
          policyContract,
          "PolicyDeactivated",
        );
        const policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.false;
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        await deactivatePolicy(value);
        await expect(deactivatePolicy(value)).to.be.revertedWith(
          "Policy: policy already inactive",
        );
      });
    });
  });

  describe("activatePolicy", () => {
    const tests = [
      {
        type: "call by id",
        override: "uint256",
        value: 0,
        invalidValue: 4,
      },
      {
        type: "call by name",
        override: "string",
        value: "policy-1",
        invalidValue: "bad-policy",
      },
    ] as const;

    tests.forEach(({ type, override, value, invalidValue }) => {
      let activatePolicy: ContractFunction;
      let activatePolicyBadUser: ContractFunction;
      let deactivatePolicy: ContractFunction;
      let getPolicy: ContractFunction;

      before(() => {
        activatePolicy = policyContract[`activatePolicy(${override})`];
        activatePolicyBadUser =
          policyContract.connect(addr1)[`activatePolicy(${override})`];
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy (${type})`, async () => {
        await expect(activatePolicy(invalidValue)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for active policy (${type})`, async () => {
        await expect(activatePolicy(value)).to.be.revertedWith(
          "Policy: policy already active",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        await expect(activatePolicyBadUser(value)).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should activate policy (${type})`, async () => {
        await deactivatePolicy(value);
        let policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.false;
        await expect(activatePolicy(value)).to.emit(
          policyContract,
          "PolicyActivated",
        );
        policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.true;
      });
    });
  });

  describe("updatePolicy", () => {
    const tests = [
      {
        type: "call by id",
        override: "uint256",
        value: 1,
        invalidValue: 4,
      },
      {
        type: "call by name",
        override: "string",
        value: "policy-1",
        invalidValue: "bad-policy",
      },
    ] as const;

    tests.forEach(({ type, override, value, invalidValue }) => {
      let updatePolicy: ContractFunction;
      let updatePolicyBadUser: ContractFunction;
      let deactivatePolicy: ContractFunction;
      let getPolicy: ContractFunction;

      before(() => {
        updatePolicy = policyContract[`updatePolicy(${override},uint8,string)`];
        updatePolicyBadUser =
          policyContract.connect(addr1)[
            `updatePolicy(${override},uint8,string)`
          ];
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy (${type})`, async () => {
        await expect(updatePolicy(invalidValue, 0, "")).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        await deactivatePolicy(value);
        await expect(updatePolicy(value, 0, "")).to.be.revertedWith(
          "Policy: policy inactive",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        await expect(
          updatePolicyBadUser(value, 0, "description"),
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should update policy (${type})`, async () => {
        await expect(updatePolicy(value, 0, "description")).to.emit(
          policyContract,
          "PolicyUpdated",
        );
        const policy = await getPolicy(value);
        expect(getEthObject(policy)).to.eql({
          policyId: num(1),
          policyName: "policy-1",
          description: "description",
          opType: 0,
          status: true,
          policyConditions: [],
        });
      });
    });
  });

  describe("addPolicyConditions", () => {
    const tests = [
      {
        type: "call by id",
        override: "uint256",
        value: 0,
        invalidValue: 4,
      },
      {
        type: "call by name",
        override: "string",
        value: "policy-0",
        invalidValue: "bad-policy",
      },
    ] as const;

    tests.forEach(({ type, override, value, invalidValue }) => {
      let addPolicyConditions: ContractFunction;
      let addPolicyConditionsBadUser: ContractFunction;
      let deactivatePolicy: ContractFunction;
      let getPolicy: ContractFunction;
      before(() => {
        addPolicyConditions =
          policyContract[
            `addPolicyConditions(${override},(string,string,uint8,bytes,uint8)[])`
          ];
        addPolicyConditionsBadUser =
          policyContract.connect(addr1)[
            `addPolicyConditions(${override},(string,string,uint8,bytes,uint8)[])`
          ];
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy id (${type})`, async () => {
        await expect(addPolicyConditions(invalidValue, [])).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        await deactivatePolicy(value);
        await expect(addPolicyConditions(value, [])).to.be.revertedWith(
          "Policy: policy inactive",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        await expect(addPolicyConditionsBadUser(1, [])).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should be able to add empty policyConditions array (${type})`, async () => {
        await addPolicyConditions(value, []);
        const policy = await getPolicy(value);
        expect(policy.policyConditions).to.have.length(pcs.length);
      });

      it(`Should fail for empty attribute name (${type})`, async () => {
        await expect(
          addPolicyConditions(value, [
            {
              name: "name",
              attributeName: "",
              value: ethers.utils.toUtf8Bytes("4hcd6s"),
              attributeOperation: 0,
              typeOfValue: 3,
            },
          ]),
        ).to.be.revertedWith("Policy: invalid attribute name on counter 0");
      });

      it(`Should add policy condition (${type})`, async () => {
        const addPcs = [
          {
            name: "name 1",
            attributeName: "attr 1",
            value: "0xaa124564",
            attributeOperation: 0,
            typeOfValue: 3,
          },
          {
            name: "name 2",
            attributeName: "attr 2",
            value: "0x003311223344ee",
            attributeOperation: 0,
            typeOfValue: 3,
          },
        ];
        await expect(addPolicyConditions(value, addPcs)).to.emit(
          policyContract,
          "PolicyConditionInserted",
        );
        const policy = await getPolicy(value);
        expect(getEthObject(policy)).to.eql({
          policyId: num(0),
          policyName: "policy-0",
          description: "description 0",
          opType: 0,
          status: true,
          policyConditions: [...pcs, ...addPcs],
        });
      });
    });
  });

  describe("deletePolicyCondition", () => {
    const tests = [
      {
        type: "call by id",
        override: "uint256",
        value: 0,
        invalidValue: 4,
      },
      {
        type: "call by name",
        override: "string",
        value: "policy-0",
        invalidValue: "bad-policy",
      },
    ] as const;

    tests.forEach(({ type, override, value, invalidValue }) => {
      let deletePolicyCondition: ContractFunction;
      let deletePolicyConditionBadUser: ContractFunction;
      let deactivatePolicy: ContractFunction;
      let getPolicy: ContractFunction;
      before(() => {
        deletePolicyCondition =
          policyContract[`deletePolicyCondition(${override},uint256)`];
        deletePolicyConditionBadUser =
          policyContract.connect(addr1)[
            `deletePolicyCondition(${override},uint256)`
          ];
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy id (${type})`, async () => {
        await expect(deletePolicyCondition(invalidValue, 0)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        await deactivatePolicy(value);
        await expect(deletePolicyCondition(value, 0)).to.be.revertedWith(
          "Policy: policy inactive",
        );
      });

      it(`Should fail for invalid policyConditionId (${type})`, async () => {
        await expect(deletePolicyCondition(value, 5)).to.be.revertedWith(
          "Policy: invalid condition",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        await expect(deletePolicyConditionBadUser(value, 0)).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should delete policyCondition (${type})`, async () => {
        await expect(deletePolicyCondition(value, 1)).to.emit(
          policyContract,
          "PolicyConditionDeleted",
        );
        const policy = await getPolicy(value);
        expect(getEthObject(policy)).to.eql({
          policyId: num(0),
          policyName: "policy-0",
          description: "description 0",
          opType: 0,
          status: true,
          policyConditions: pcs.slice(0, 1),
        });
      });
    });
  });

  describe("insertPolicy", () => {
    it("Should fail for empty name", async () => {
      await expect(
        policyContract.insertPolicy(1, [], "", "description"),
      ).to.be.revertedWith("Policy: name required");
    });

    it("Should fail for empty description", async () => {
      await expect(
        policyContract.insertPolicy(1, [], "name", ""),
      ).to.be.revertedWith("Policy: description required");
    });

    it("Should fail for same policyName", async () => {
      await expect(
        policyContract.insertPolicy(
          1,
          [
            {
              name: "policy-1",
              attributeName: "testAttr",
              value: ethers.utils.toUtf8Bytes("vxc4gdbfgb"),
              attributeOperation: 0,
              typeOfValue: 3,
            },
          ],
          "policy-1",
          "description",
        ),
      ).to.be.revertedWith("Policy: policy exists");
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
          "description",
        ),
      ).to.be.revertedWith("Policy: invalid attribute name on counter 0");
    });

    it("Should be reverted if it doesn't have operator role", async () => {
      await expect(
        policyContract
          .connect(addr1)
          .insertPolicy(0, pcs, "name", "description"),
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await addr1.getAddress()
        ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
      );
    });

    it("Should insert policy", async () => {
      await expect(policyContract.insertPolicy(0, pcs, "name", "description"))
        .to.emit(policyContract, "PolicyInserted")
        .withArgs(4, "name", "description")
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(0, pcs[0].attributeName, ethers.utils.hexlify(pcs[0].value))
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(1, pcs[1].attributeName, ethers.utils.hexlify(pcs[1].value));
      const policy = await policyContract["getPolicy(uint256)"](4);
      expect(getEthObject(policy)).to.eql({
        policyId: num(4),
        policyName: "name",
        description: "description",
        opType: 0,
        status: true,
        policyConditions: pcs,
      });
    });
  });

  describe("Access Control", async () => {
    it("Admin Should be able to grant role", async () => {
      await policyContract.grantRole(OPERATOR_ROLE, await addr1.getAddress());
      await policyContract
        .connect(addr1)
        ["addPolicyConditions(uint256,(string,string,uint8,bytes,uint8)[])"](
          0,
          [],
        );
      const policy = await policyContract["getPolicy(uint256)"](0);
      expect(policy.policyConditions).to.have.length(pcs.length);
    });
  });

  describe("searchPolicy", () => {
    it("Should return searched policy ids", async () => {
      // search missing string
      let [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("test policy");
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyDescription).to.have.length(0);

      // search by name of policy 0
      [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("policy-0");
      expect(byPolicyDescription).to.have.length(0);
      expect(byPolicyName).to.deep.equal([ethers.BigNumber.from(0)]);

      // search by registry of policy 2
      [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("description 2");
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyDescription).to.deep.equal([ethers.BigNumber.from(2)]);

      // check another policy with the same name / description
      await policyContract.insertPolicy(
        0,
        [],
        "test policy 4",
        "description 4",
      );
      [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("description 4");
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyDescription).to.deep.equal([num(4)]);
      [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("test policy 4");
      expect(byPolicyDescription).to.have.length(0);
      expect(byPolicyName).to.deep.equal([num(4)]);
    });
  });
});
