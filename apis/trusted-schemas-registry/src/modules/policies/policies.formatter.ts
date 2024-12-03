import { paginate, PaginatedList } from "@ebsiint-api/shared";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";

import {
  PolicyLink,
  PolicyResponseObject,
  PolicyRevisions,
} from "./policies.interface.js";

export function formatPolicies(
  policies: Awaited<ReturnType<SchemaSCRegistry["getPolicies"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<PolicyLink> {
  const total = policies.total.toNumber();

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
