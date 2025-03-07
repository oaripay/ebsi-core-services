import type { PaginatedList } from "@ebsiint-api/shared";
import type { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";

import { paginate } from "@ebsiint-api/shared";

import type {
  PolicyLink,
  PolicyResponseObject,
  PolicyRevisions,
} from "./policies.interface.ts";

export function formatPolicies(
  policies: Awaited<ReturnType<SchemaSCRegistry["getPolicies"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<PolicyLink> {
  const total = Number(policies.total);

  // Reshape items
  const items = policies.items.map((policyId) => ({
    href: `${baseUrl}/${encodeURIComponent(policyId)}`,
    policyId,
  }));

  return paginate<PolicyLink>(items, baseUrl, total, page, pageSize);
}

export function formatRevisions(
  revisions: PolicyRevisions,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<PolicyResponseObject> {
  const { items, total } = revisions;

  return paginate<PolicyResponseObject>(items, baseUrl, total, page, pageSize);
}
