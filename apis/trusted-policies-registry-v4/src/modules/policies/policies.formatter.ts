import {
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import { PolicyLink } from "./policies.interface.js";

export function formatPolicies(
  policies: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<PolicyLink> {
  // Reshape items
  const items = policies.items.map((policyName) => {
    return {
      policyName,
      href: `${baseUrl}/${policyName}`,
    };
  });

  return paginateWithoutTotal<PolicyLink>(items, baseUrl, page, pageSize);
}

export default formatPolicies;
