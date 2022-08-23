import {
  PolicyLink,
  PolicyRevisions,
  PolicyResponseObject,
} from "./policies.interface";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatPolicies(
  policies: AsyncReturnType<SchemaSCRegistry["getPolicies"]>,
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

export function formatRevisions(
  revisions: PolicyRevisions,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<PolicyResponseObject> {
  const { total, items } = revisions;

  return paginate<PolicyResponseObject>(items, baseUrl, total, page, pageSize);
}
