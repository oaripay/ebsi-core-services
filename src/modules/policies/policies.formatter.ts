/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { PolicyLink } from "./policies.interface";
import { PolicyRegistry } from "../../contracts";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatPolicies(
  policies: AsyncReturnType<PolicyRegistry["getPolicies"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<PolicyLink> {
  const total = policies.total.toNumber();

  // Reshape items
  const items = policies.items.map((policy) => {
    const policyId = policy.toNumber().toString();
    return {
      policyId,
      href: `${baseUrl}/${policyId}`,
    };
  });

  return paginate<PolicyLink>(items, baseUrl, total, page, pageSize);
}

export default formatPolicies;
