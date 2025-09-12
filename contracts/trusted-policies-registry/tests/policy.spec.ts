import { ethers } from "hardhat";

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Result } from "ethers";

import { expect } from "chai";

import type { PolicyRegistry } from "../src/types";

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

describe("Policy", () => {
  let snapshotId: string;
  let policyContract: PolicyRegistry;

  const pcs = [
    {
      attributeName: "attrName1",
      attributeOperation: 0n,
      name: "name1",
      typeOfValue: 3n,
      value: "0x1122334455667788",
    },
    {
      attributeName: "attrName2",
      attributeOperation: 0n,
      name: "name2",
      typeOfValue: 1n,
      value: "0xaabbccddeeff0011",
    },
  ];

  let addr1: HardhatEthersSigner;
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";

  before(async () => {
    const paginationFactory = await ethers.getContractFactory("Pagination", {});
    const pagination = await paginationFactory.deploy();
    const policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistry",
      {
        libraries: {
          Pagination: await pagination.getAddress(),
        },
      },
    );
    policyContract = await policyRegistryFactory.deploy();
    [, addr1] = await ethers.getSigners();

    await policyContract.initialize(12);
    expect(await policyContract.version()).to.equal(12);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(await policyContract.getAddress()).to.properAddress;

    await policyContract.insertPolicy(0, pcs, "policy-0", "description 0");
    await policyContract.insertPolicy(0, [], "policy-1", "description 1");
    await policyContract.insertPolicy(0, [], "policy-2", "description 2");
    await policyContract.insertPolicy(0, [], "policy-3", "description 3");
  });

  beforeEach(async () => {
    snapshotId = (await ethers.provider.send("evm_snapshot", [])) as string;
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
        description: "description 0",
        opType: 0n,
        policyConditions: pcs,
        policyId: 0n,
        policyName: "policy-0",
        status: true,
      };

      expect(decodeResult(policyById)).to.eql(expectedPolicy);
      expect(decodeResult(policyByName)).to.eql(expectedPolicy);

      // Policy 1 - no policyConditions
      policyById = await policyContract["getPolicy(uint256)"](1);
      policyByName = await policyContract["getPolicy(string)"]("policy-1");
      expectedPolicy = {
        description: "description 1",
        opType: 0n,
        policyConditions: [],
        policyId: 1n,
        policyName: "policy-1",
        status: true,
      };
      expect(decodeResult(policyById)).to.eql(expectedPolicy);
      expect(decodeResult(policyByName)).to.eql(expectedPolicy);
    });

    it("should return policies by id or by name", async () => {
      // by Policy ID - page 1
      let policiesById = await policyContract.getPolicies(1, 2);
      expect(decodeResult(policiesById)).to.eql({
        howMany: 2n,
        items: [0n, 1n],
        next: 2n,
        prev: 1n,
        total: 4n,
      });

      // by Policy ID - page 2
      policiesById = await policyContract.getPolicies(2, 2);
      expect(decodeResult(policiesById)).to.eql({
        howMany: 2n,
        items: [2n, 3n],
        next: 2n,
        prev: 1n,
        total: 4n,
      });

      // by Policy Name - page 1
      let policiesByName = await policyContract.getPolicyNames(1, 2);
      expect(decodeResult(policiesByName)).to.eql({
        howMany: 2n,
        items: ["policy-0", "policy-1"],
        next: 2n,
        prev: 1n,
        total: 4n,
      });

      // by Policy Name - page 2
      policiesByName = await policyContract.getPolicyNames(2, 2);
      expect(decodeResult(policiesByName)).to.eql({
        howMany: 2n,
        items: ["policy-2", "policy-3"],
        next: 2n,
        prev: 1n,
        total: 4n,
      });
    });
  });

  describe("deactivatePolicy", () => {
    const tests = [
      {
        invalidValue: 4,
        override: "uint256",
        type: "call by id",
        value: 0,
      },
      {
        invalidValue: "bad-policy",
        override: "string",
        type: "call by name",
        value: "policy-1",
      },
    ] as const;

    for (const { invalidValue, override, type, value } of tests) {
      let deactivatePolicy: (typeof policyContract)[`deactivatePolicy(${typeof override})`];
      let deactivatePolicyBadUser: (typeof policyContract)[`deactivatePolicy(${typeof override})`];
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

      before(() => {
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        deactivatePolicyBadUser =
          policyContract.connect(addr1)[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(deactivatePolicy(invalidValue)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(deactivatePolicyBadUser(value)).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should deactivate policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(deactivatePolicy(value)).to.emit(
          policyContract,
          "PolicyDeactivated",
        );

        // @ts-expect-error Mismatch of types
        const policy = await getPolicy(value);

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.false;
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await deactivatePolicy(value);
        // @ts-expect-error Mismatch of types
        await expect(deactivatePolicy(value)).to.be.revertedWith(
          "Policy: policy already inactive",
        );
      });
    }
  });

  describe("activatePolicy", () => {
    const tests = [
      {
        invalidValue: 4,
        override: "uint256",
        type: "call by id",
        value: 0,
      },
      {
        invalidValue: "bad-policy",
        override: "string",
        type: "call by name",
        value: "policy-1",
      },
    ] as const;

    for (const { invalidValue, override, type, value } of tests) {
      let activatePolicy: (typeof policyContract)[`activatePolicy(${typeof override})`];
      let activatePolicyBadUser: (typeof policyContract)[`activatePolicy(${typeof override})`];
      let deactivatePolicy: (typeof policyContract)[`deactivatePolicy(${typeof override})`];
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

      before(() => {
        activatePolicy = policyContract[`activatePolicy(${override})`];
        activatePolicyBadUser =
          policyContract.connect(addr1)[`activatePolicy(${override})`];
        deactivatePolicy = policyContract[`deactivatePolicy(${override})`];
        getPolicy = policyContract[`getPolicy(${override})`];
      });

      it(`Should fail for missing policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(activatePolicy(invalidValue)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for active policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(activatePolicy(value)).to.be.revertedWith(
          "Policy: policy already active",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(activatePolicyBadUser(value)).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should activate policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await deactivatePolicy(value);
        // @ts-expect-error Mismatch of types
        let policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.false;
        // @ts-expect-error Mismatch of types
        await expect(activatePolicy(value)).to.emit(
          policyContract,
          "PolicyActivated",
        );
        // @ts-expect-error Mismatch of types
        policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.true;
      });
    }
  });

  describe("updatePolicy", () => {
    const tests = [
      {
        invalidValue: 4,
        override: "uint256",
        type: "call by id",
        value: 1,
      },
      {
        invalidValue: "bad-policy",
        override: "string",
        type: "call by name",
        value: "policy-1",
      },
    ] as const;

    for (const { invalidValue, override, type, value } of tests) {
      let updatePolicy: (typeof policyContract)[`updatePolicy(${typeof override},uint8,string)`];
      let updatePolicyBadUser: (typeof policyContract)[`updatePolicy(${typeof override},uint8,string)`];
      let deactivatePolicy: (typeof policyContract)[`deactivatePolicy(${typeof override})`];
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

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
        // @ts-expect-error Mismatch of types
        await expect(updatePolicy(invalidValue, 0, "")).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await deactivatePolicy(value);
        // @ts-expect-error Mismatch of types
        await expect(updatePolicy(value, 0, "")).to.be.revertedWith(
          "Policy: policy inactive",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        await expect(
          // @ts-expect-error Mismatch of types
          updatePolicyBadUser(value, 0, "description"),
        ).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should update policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(updatePolicy(value, 0, "description")).to.emit(
          policyContract,
          "PolicyUpdated",
        );
        // @ts-expect-error Mismatch of types
        const policy = await getPolicy(value);
        expect(decodeResult(policy)).to.eql({
          description: "description",
          opType: 0n,
          policyConditions: [],
          policyId: 1n,
          policyName: "policy-1",
          status: true,
        });
      });
    }
  });

  describe("addPolicyConditions", () => {
    const tests = [
      {
        invalidValue: 4,
        override: "uint256",
        type: "call by id",
        value: 0,
      },
      {
        invalidValue: "bad-policy",
        override: "string",
        type: "call by name",
        value: "policy-0",
      },
    ] as const;

    for (const { invalidValue, override, type, value } of tests) {
      let addPolicyConditions: (typeof policyContract)[`addPolicyConditions(${typeof override},(string,string,uint8,bytes,uint8)[])`];
      let addPolicyConditionsBadUser: (typeof policyContract)[`addPolicyConditions(${typeof override},(string,string,uint8,bytes,uint8)[])`];
      let deactivatePolicy: (typeof policyContract)[`deactivatePolicy(${typeof override})`];
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

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
        // @ts-expect-error Mismatch of types
        await expect(addPolicyConditions(invalidValue, [])).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await deactivatePolicy(value);
        // @ts-expect-error Mismatch of types
        await expect(addPolicyConditions(value, [])).to.be.revertedWith(
          "Policy: policy inactive",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(addPolicyConditionsBadUser(value, [])).to.be.revertedWith(
          `AccessControl: account ${(await addr1.getAddress()).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should be able to add empty policyConditions array (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await addPolicyConditions(value, []);
        // @ts-expect-error Mismatch of types
        const policy = await getPolicy(value);
        expect(policy.policyConditions).to.have.length(pcs.length);
      });

      it(`Should fail for empty attribute name (${type})`, async () => {
        await expect(
          // @ts-expect-error Mismatch of types
          addPolicyConditions(value, [
            {
              attributeName: "",
              attributeOperation: 0n,
              name: "name",
              typeOfValue: 3n,
              value: ethers.toUtf8Bytes("4hcd6s"),
            },
          ]),
        ).to.be.revertedWith("Policy: invalid attribute name on counter 0");
      });

      it(`Should add policy condition (${type})`, async () => {
        const addPcs = [
          {
            attributeName: "attr 1",
            attributeOperation: 0n,
            name: "name 1",
            typeOfValue: 3n,
            value: "0xaa124564",
          },
          {
            attributeName: "attr 2",
            attributeOperation: 0n,
            name: "name 2",
            typeOfValue: 3n,
            value: "0x003311223344ee",
          },
        ];

        // @ts-expect-error Mismatch of types
        await expect(addPolicyConditions(value, addPcs)).to.emit(
          policyContract,
          "PolicyConditionInserted",
        );

        // @ts-expect-error Mismatch of types
        const policy = await getPolicy(value);
        expect(decodeResult(policy)).to.eql({
          description: "description 0",
          opType: 0n,
          policyConditions: [...pcs, ...addPcs],
          policyId: 0n,
          policyName: "policy-0",
          status: true,
        });
      });
    }
  });

  describe("deletePolicyCondition", () => {
    const tests = [
      {
        invalidValue: 4,
        override: "uint256",
        type: "call by id",
        value: 0,
      },
      {
        invalidValue: "bad-policy",
        override: "string",
        type: "call by name",
        value: "policy-0",
      },
    ] as const;

    for (const { invalidValue, override, type, value } of tests) {
      let deletePolicyCondition: (typeof policyContract)[`deletePolicyCondition(${typeof override},uint256)`];
      let deletePolicyConditionBadUser: (typeof policyContract)[`deletePolicyCondition(${typeof override},uint256)`];
      let deactivatePolicy: (typeof policyContract)[`deactivatePolicy(${typeof override})`];
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

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
        // @ts-expect-error Mismatch of types
        await expect(deletePolicyCondition(invalidValue, 0)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await deactivatePolicy(value);
        // @ts-expect-error Mismatch of types
        await expect(deletePolicyCondition(value, 0)).to.be.revertedWith(
          "Policy: policy inactive",
        );
      });

      it(`Should fail for invalid policyConditionId (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(deletePolicyCondition(value, 5)).to.be.revertedWith(
          "Policy: invalid condition",
        );
      });

      it(`Should be reverted if it doesn't have operator role (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(deletePolicyConditionBadUser(value, 0)).to.be.revertedWith(
          `AccessControl: account ${(
            await addr1.getAddress()
          ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
        );
      });

      it(`Should delete policyCondition (${type})`, async () => {
        // @ts-expect-error Mismatch of types
        await expect(deletePolicyCondition(value, 1)).to.emit(
          policyContract,
          "PolicyConditionDeleted",
        );

        // @ts-expect-error Mismatch of types
        const policy = await getPolicy(value);

        expect(policy.policyConditions).to.have.length(1);
        expect(decodeResult(policy.policyConditions[0])).to.eql(
          pcs.slice(0, 1)[0],
        );
      });
    }
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
              attributeName: "testAttr",
              attributeOperation: 0n,
              name: "policy-1",
              typeOfValue: 3n,
              value: ethers.toUtf8Bytes("vxc4gdbfgb"),
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
              attributeName: "",
              attributeOperation: 0n,
              name: "name",
              typeOfValue: 3n,
              value: ethers.toUtf8Bytes("vxc4gdbfgb"),
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
        .withArgs(0, pcs[0].attributeName, ethers.hexlify(pcs[0].value))
        .to.emit(policyContract, "PolicyConditionInserted")
        .withArgs(1, pcs[1].attributeName, ethers.hexlify(pcs[1].value));
      const policy = await policyContract["getPolicy(uint256)"](4);
      expect(decodeResult(policy)).to.eql({
        description: "description",
        opType: 0n,
        policyConditions: pcs,
        policyId: 4n,
        policyName: "name",
        status: true,
      });
    });
  });

  describe("Access Control", () => {
    it("Admin Should be able to grant role", async () => {
      await policyContract.grantRole(OPERATOR_ROLE, await addr1.getAddress());
      await policyContract
        .connect(addr1)
        [
          "addPolicyConditions(uint256,(string,string,uint8,bytes,uint8)[])"
        ](0, []);
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
      expect(byPolicyName).to.deep.equal([0n]);

      // search by registry of policy 2
      [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("description 2");
      expect(byPolicyName).to.have.length(0);
      expect(byPolicyDescription).to.deep.equal([2n]);

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
      expect(byPolicyDescription).to.deep.equal([4n]);
      [byPolicyName, byPolicyDescription] =
        await policyContract.searchPolicy("test policy 4");
      expect(byPolicyDescription).to.have.length(0);
      expect(byPolicyName).to.deep.equal([4n]);
    });
  });
});
