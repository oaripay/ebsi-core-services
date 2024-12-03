import crypto from "node:crypto";

export function createPolicy(policyId: number, policyName: string) {
  const description = crypto.randomBytes(16).toString("hex");

  return {
    description,
    policyId,
    policyName,
    status: true,
  };
}

export const POLICIES_TOTAL = 12;
export const USERS_TOTAL = 12;

export const dummyPolicies = Array.from({ length: POLICIES_TOTAL }).map(
  (_, i) => ({
    description: `description${i + 1}`,
    id: `${i + 1}`,
    policyId: `${i + 1}`,
    policyName: `policyName${i + 1}`,
    status: true,
  }),
);

export const dummyUsers = Array.from({ length: USERS_TOTAL }).map(() => {
  const id = `0x${crypto.randomBytes(20).toString("hex")}`;
  return {
    attributes: ["policyName1", "policyName2", "policyName3"],
    id,
    user: id,
  };
});
