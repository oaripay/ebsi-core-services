import { PolicyLink } from "./policies.interface";
import { DidRegistry } from "../../contracts/did-registry";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatPolicies(
  policies: AsyncReturnType<DidRegistry["getPolicies"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<PolicyLink> {
  const total = policies.total.toNumber();

  // Reshape items
  const items = policies.items.map((policyId) => ({
    policyId,
    href: `${baseUrl}/${encodeURIComponent(policyId)}`,
  }));

  return paginate<PolicyLink>(items, baseUrl, total, page, pageSize);
}

export default { formatPolicies };
