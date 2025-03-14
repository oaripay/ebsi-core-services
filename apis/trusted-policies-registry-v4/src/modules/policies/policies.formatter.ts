import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { paginateWithoutTotal } from "@ebsiint-api/shared";

import type { PolicyLink } from "./policies.interface.ts";

export function formatPolicies(
  policies: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<PolicyLink> {
  // Reshape items
  const items = policies.items.map((policyName) => {
    return {
      href: `${baseUrl}/${policyName}`,
      policyName,
    };
  });

  return paginateWithoutTotal<PolicyLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}
