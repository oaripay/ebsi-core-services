import type { Result, Signer } from "ethers";

import { expect } from "chai";
import { ethers } from "hardhat";

import type { PolicyRegistry, PolicyRegistry__factory } from "../src/types";

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

    await policyContract.initialize(12);
    expect(await policyContract.version()).to.equal(12);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(await policyContract.getAddress()).to.properAddress;

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
        policyId: 1n,
        policyName: "policy-0",
        status: true,
      };
      expect(decodeResult(policyById)).to.eql(expectedPolicy);
      expect(decodeResult(policyByName)).to.eql(expectedPolicy);

      // Policy 1 - no policyConditions
      policyById = await policyContract["getPolicy(uint256)"](2);
      policyByName = await policyContract["getPolicy(string)"]("policy-1");
      expectedPolicy = {
        description: "description 1",
        policyId: 2n,
        policyName: "policy-1",
        status: true,
      };
      expect(decodeResult(policyById)).to.eql(expectedPolicy);
      expect(decodeResult(policyByName)).to.eql(expectedPolicy);
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
      expect(decodeResult(policy)).to.eql({
        description: "description",
        policyId: BigInt(5),
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
      expect(addrAdm).to.be.equal(ethers.ZeroAddress);
      expect(impl).to.be.equal(ethers.ZeroAddress);
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
