import type { PaginatedList } from "@ebsiint-api/shared";
import type { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";

import { paginate } from "@ebsiint-api/shared";

import type { SubjectLink, SubjectPolicyLink } from "./subjects.interface.ts";

export function formatPolicies(
  policies: Awaited<ReturnType<PolicyRegistry["getUserAttributes"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<SubjectPolicyLink> {
  const total = Number(policies.total);

  // Reshape items
  const items = policies.items.map((policyName) => {
    return {
      href: `${baseUrl}/${policyName}`,
      policyName,
    };
  });

  return paginate<SubjectPolicyLink>(items, baseUrl, total, page, pageSize);
}

export function formatSubjects(
  subjects: Awaited<ReturnType<PolicyRegistry["getUsers"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<SubjectLink> {
  const total = Number(subjects.total);

  // Reshape items
  const items = subjects.items.map((subject) => {
    return {
      href: `${baseUrl}/${subject}`,
      subject,
    };
  });

  return paginate<SubjectLink>(items, baseUrl, total, page, pageSize);
}
