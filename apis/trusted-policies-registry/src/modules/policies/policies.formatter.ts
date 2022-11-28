/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";
import { PaginatedList, paginate, AsyncReturnType } from "@ebsiint-api/shared";
import { PolicyLink } from "./policies.interface";

export function formatPolicies(
  policies: AsyncReturnType<PolicyRegistry["getPolicyNames"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<PolicyLink> {
  const total = policies.total.toNumber();

  // Reshape items
  const items = policies.items.map((policyName) => {
    return {
      policyName,
      href: `${baseUrl}/${policyName}`,
    };
  });

  return paginate<PolicyLink>(items, baseUrl, total, page, pageSize);
}

export default formatPolicies;
