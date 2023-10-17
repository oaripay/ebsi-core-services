import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import { PaginatedList, paginate } from "@ebsiint-api/shared";
import {
  PolicyLink,
  PolicyRevisions,
  PolicyResponseObject,
} from "./policies.interface.js";

export function formatPolicies(
  policies: Awaited<ReturnType<Tir["getPolicies"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<PolicyLink> {
  const total = policies.total.toNumber();

  // Reshape items
  const items = policies.items.map((policyId) => ({
    policyId,
    href: `${baseUrl}/${encodeURIComponent(policyId)}`,
  }));

  return paginate<PolicyLink>(items, baseUrl, total, page, pageSize);
}

export function formatRevisions(
  revisions: PolicyRevisions,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<PolicyResponseObject> {
  const { total, items } = revisions;

  return paginate<PolicyResponseObject>(items, baseUrl, total, page, pageSize);
}
