import crypto from "node:crypto";

export function createPolicy(policyId: number, policyName: string) {
  const description = crypto.randomBytes(16).toString("hex");

  return {
    policyId,
    policyName,
    description,
    status: true,
  };
}

export const POLICIES_TOTAL = 12;
export const USERS_TOTAL = 12;

export const dummyPolicies = Array(POLICIES_TOTAL)
  .fill(undefined)
  .map((_, i) => ({
    id: `${i + 1}`,
    policyId: `${i + 1}`,
    policyName: `policyName${i + 1}`,
    description: `description${i + 1}`,
    status: true,
  }));

export const dummyUsers = Array(USERS_TOTAL)
  .fill(undefined)
  .map(() => {
    const id = `0x${crypto.randomBytes(20).toString("hex")}`;
    return {
      id,
      user: id,
      attributes: ["policyName1", "policyName2", "policyName3"],
    };
  });
