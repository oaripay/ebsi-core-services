import {
  PoliciesListSmartContractResponseObject,
  PolicyLink,
} from "./policies.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatPolicies(
  policies: PoliciesListSmartContractResponseObject,
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

export default formatPolicies;
