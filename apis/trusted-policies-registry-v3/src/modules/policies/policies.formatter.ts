import { paginate, PaginatedList } from "@ebsiint-api/shared";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";

import { PolicyLink } from "./policies.interface.js";

export function formatPolicies(
  policies: Awaited<ReturnType<PolicyRegistry["getPolicyNames"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<PolicyLink> {
  const total = policies.total.toNumber();

  // Reshape items
  const items = policies.items.map((policyName) => {
    return {
      href: `${baseUrl}/${policyName}`,
      policyName,
    };
  });

  return paginate<PolicyLink>(items, baseUrl, total, page, pageSize);
}

export default formatPolicies;
