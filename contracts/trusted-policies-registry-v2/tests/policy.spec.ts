import type { ContractFunction, Signer } from "ethers";

import { expect } from "chai";
import { ethers } from "hardhat";

import type { PolicyRegistry, PolicyRegistry__factory } from "../src/types";

function getEthObject(o: unknown): Record<string, unknown> | unknown[] {
  const obj = o as Record<string, unknown> & string[];
  const keys = Object.keys(obj);

  // check if it is a string
  if (typeof obj === "string") return obj;

  // check if it is an array
  if (keys.at(-1) === String(keys.length - 1)) {
    return (o as unknown[]).map((item) => getEthObject(item));
  }

  // check if it is a buffer
  if (keys[0] !== "0") return obj;

  // treat it as object. ["alice", "name": "alice"] ==> { "name" : "alice" }
  const result: Record<string, unknown> = {};
  for (const [i, k] of keys.entries()) {
    if (i < keys.length / 2) continue;

    result[k] = typeof obj[k] === "object" ? getEthObject(obj[k]) : obj[k];
  }
  return result;
}

describe("Policy", () => {
  let snapshotId: string;
  let policyContract: PolicyRegistry;
  let policyRegistryFactory: PolicyRegistry__factory;

  let addr1: Signer;
  const OPERATOR_ROLE =
    "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";

  before(async () => {
    policyRegistryFactory = await ethers.getContractFactory(
      "PolicyRegistry",
      {},
    );
    policyContract = await policyRegistryFactory.deploy();
    [, addr1] = await ethers.getSigners();
    await policyContract.deployed();

    await policyContract.initialize(12);
    expect(await policyContract.version()).to.equal(12);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(policyContract.address).to.properAddress;

    await policyContract.insertPolicy("policy-0", "description 0");
    await policyContract.insertPolicy("policy-1", "description 1");
    await policyContract.insertPolicy("policy-2", "description 2");
    await policyContract.insertPolicy("policy-3", "description 3");
  });

  beforeEach(async () => {
    snapshotId = (await ethers.provider.send("evm_snapshot", [])) as string;
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("Get functions", () => {
    it("should fail to initialize", async () => {
      await expect(policyContract.initialize(1)).to.be.revertedWith(
        "Initializable: contract is already initialized",
      );
    });

    it("Should fail for invalid policy", async () => {
      await expect(policyContract["getPolicy(uint256)"](5)).to.be.revertedWith(
        "Policy: invalid policy",
      );
    });

    it("Should return policy by id or by name", async () => {
      // Policy 0 - set of policyConditions
      let policyById = await policyContract["getPolicy(uint256)"](1);
      let policyByName = await policyContract["getPolicy(string)"]("policy-0");
      let expectedPolicy = {
        description: "description 0",
        policyId: ethers.BigNumber.from(1),
        policyName: "policy-0",
        status: true,
      };
      expect(getEthObject(policyById)).to.eql(expectedPolicy);
      expect(getEthObject(policyByName)).to.eql(expectedPolicy);

      // Policy 1 - no policyConditions
      policyById = await policyContract["getPolicy(uint256)"](2);
      policyByName = await policyContract["getPolicy(string)"]("policy-1");
      expectedPolicy = {
        description: "description 1",
        policyId: ethers.BigNumber.from(2),
        policyName: "policy-1",
        status: true,
      };
      expect(getEthObject(policyById)).to.eql(expectedPolicy);
      expect(getEthObject(policyByName)).to.eql(expectedPolicy);
    });

    it("should fail to initialize twice", async () => {
      const emptyPolicyContract = await policyRegistryFactory.deploy();
      await emptyPolicyContract.deployed();

      await emptyPolicyContract.initialize(12);

      expect((await emptyPolicyContract.getPolicies(3, 1)).total).to.equal(
        ethers.BigNumber.from(0),
      );
    });

    it("should revert on inactive policy", async () => {
      await policyContract["deactivatePolicy(uint256)"](1);
      await expect(
        policyContract["checkPolicy(string,address)"](
          "policy-0",
          await addr1.getAddress(),
        ),
      ).to.be.revertedWith("Policy: inactive or not defined");
    });

    it("should check pagination conditions are working", async () => {
      await expect(policyContract.getPolicyNames(1, 51)).to.be.revertedWith(
        "PSize not <=50",
      );
      await expect(policyContract.getPolicyNames(1, 0)).to.be.revertedWith(
        "PSize not >0",
      );
      await expect(policyContract.getPolicyNames(0, 10)).to.be.revertedWith(
        "Page not >0",
      );

      await expect(policyContract.getPolicies(1, 51)).to.be.revertedWith(
        "PSize not <=50",
      );
      await expect(policyContract.getPolicies(1, 0)).to.be.revertedWith(
        "PSize not >0",
      );
      await expect(policyContract.getPolicies(0, 10)).to.be.revertedWith(
        "Page not >0",
      );
    });

    it("should return policies by id or by name", async () => {
      // by Policy ID - page 1
      let policiesById = await policyContract.getPolicies(1, 2);
      expect(getEthObject(policiesById)).to.eql({
        howMany: ethers.BigNumber.from(2),
        items: [ethers.BigNumber.from(1), ethers.BigNumber.from(2)],
        next: ethers.BigNumber.from(2),
        prev: ethers.BigNumber.from(1),
        total: ethers.BigNumber.from(4),
      });

      // by Policy ID - page 2
      policiesById = await policyContract.getPolicies(2, 2);
      expect(getEthObject(policiesById)).to.eql({
        howMany: ethers.BigNumber.from(2),
        items: [ethers.BigNumber.from(3), ethers.BigNumber.from(4)],
        next: ethers.BigNumber.from(2),
        prev: ethers.BigNumber.from(1),
        total: ethers.BigNumber.from(4),
      });

      // by Policy Name - page 1
      let policiesByName = await policyContract.getPolicyNames(1, 2);
      expect(getEthObject(policiesByName)).to.eql({
        howMany: ethers.BigNumber.from(2),
        items: ["policy-0", "policy-1"],
        next: ethers.BigNumber.from(2),
        prev: ethers.BigNumber.from(1),
        total: ethers.BigNumber.from(4),
      });

      // by Policy Name - page 2
      policiesByName = await policyContract.getPolicyNames(2, 2);
      expect(getEthObject(policiesByName)).to.eql({
        howMany: ethers.BigNumber.from(2),
        items: ["policy-2", "policy-3"],
        next: ethers.BigNumber.from(2),
        prev: ethers.BigNumber.from(1),
        total: ethers.BigNumber.from(4),
      });
    });
  });

  describe("deactivatePolicy", () => {
    const tests = [
      {
        invalidValue: 5,
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
      let deactivatePolicy: ContractFunction;
      let deactivatePolicyBadUser: ContractFunction;
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

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
        // @ts-expect-error Mismatch of types
        const policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.false;
      });

      it(`Should fail for inactive policy (${type})`, async () => {
        await deactivatePolicy(value);
        await expect(deactivatePolicy(value)).to.be.revertedWith(
          "Policy: invalid policy",
        );
      });
    }
  });

  describe("activatePolicy", () => {
    const tests = [
      {
        invalidValue: 5,
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
      let activatePolicy: ContractFunction;
      let activatePolicyBadUser: ContractFunction;
      let deactivatePolicy: ContractFunction;
      let getPolicy: (typeof policyContract)[`getPolicy(${typeof override})`];

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
        // @ts-expect-error Mismatch of types
        let policy = await getPolicy(value);
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(policy.status).to.be.false;
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

  describe("insertPolicy", () => {
    it("Should fail for empty name", async () => {
      await expect(
        policyContract.insertPolicy("", "description"),
      ).to.be.revertedWith("Policy: name required");
    });

    it("Should fail for empty description", async () => {
      await expect(policyContract.insertPolicy("name", "")).to.be.revertedWith(
        "Policy: description required",
      );
    });

    it("Should fail for same policyName", async () => {
      await expect(
        policyContract.insertPolicy("policy-1", "description"),
      ).to.be.revertedWith("Policy: policy exists");
    });

    it("Should be reverted if it doesn't have operator role", async () => {
      await expect(
        policyContract.connect(addr1).insertPolicy("name", "description"),
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await addr1.getAddress()
        ).toLowerCase()} is missing role ${OPERATOR_ROLE}`,
      );
    });

    it("Should insert policy", async () => {
      await expect(policyContract.insertPolicy("name", "description"))
        .to.emit(policyContract, "PolicyInserted")
        .withArgs(5, "name", "description");
      const policy = await policyContract["getPolicy(uint256)"](5);
      expect(getEthObject(policy)).to.eql({
        description: "description",
        policyId: ethers.BigNumber.from(5),
        policyName: "name",
        status: true,
      });
    });
  });

  describe("Access Control and registry", () => {
    it("Admin Should be able to grant role", async () => {
      const addr = await addr1.getAddress();
      await expect(policyContract.grantRole(OPERATOR_ROLE, addr))
        .to.emit(policyContract, "RoleGranted")
        .withArgs(OPERATOR_ROLE, addr, (await ethers.getSigners())[0].address); // emit RoleGranted(role, account, _msgSender());
    });

    it("proxy view functions not return default", async () => {
      const addrAdm = await policyContract.admin();
      const impl = await policyContract.implementation();
      expect(addrAdm).to.be.equal(ethers.constants.AddressZero);
      expect(impl).to.be.equal(ethers.constants.AddressZero);
    });
  });

  describe("Update Policy", () => {
    it("should fail to update a policy description with empty string", async () => {
      await policyContract.insertPolicy("name", "description-test"); // policy Id 5
      await expect(
        policyContract["updatePolicy(string,string)"]("name", ""),
      ).to.be.revertedWith("Policy: invalidDescription");
    });

    it("should fail to update a policy that is inactive", async () => {
      await policyContract["deactivatePolicy(uint256)"](1);
      await expect(
        policyContract["updatePolicy(string,string)"](
          "policy-0",
          "description",
        ),
      ).to.be.revertedWith("Policy: policy inactive");
    });

    it("should fail to update policy if it doesn't have operator role", async () => {
      await policyContract.insertPolicy("test", "description-test");
      await expect(
        policyContract
          .connect(addr1)
          ["updatePolicy(string,string)"]("test", "description"),
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await addr1.getAddress()
        ).toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929`,
      );
      await expect(
        policyContract
          .connect(addr1)
          ["updatePolicy(uint256,string)"](1, "description"),
      ).to.be.revertedWith(
        `AccessControl: account ${(
          await addr1.getAddress()
        ).toLowerCase()} is missing role 0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929`,
      );
    });

    it("should update a policy description", async () => {
      await policyContract.insertPolicy("name", "description-test"); // policy Id 5
      await policyContract.insertPolicy("name2", "description-test"); // policy Id 6
      await policyContract["updatePolicy(string,string)"](
        "name",
        "test-some-other-description",
      );
      let policy = await policyContract["getPolicy(string)"]("name");
      expect(policy.description).to.be.equal("test-some-other-description");
      await policyContract["updatePolicy(uint256,string)"](
        5,
        "test-some-other-description3",
      );
      policy = await policyContract["getPolicy(string)"]("name");
      expect(policy.description).to.be.equal("test-some-other-description3");
    });
  });
});
