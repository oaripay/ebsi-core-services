import { paginate, PaginatedList } from "@ebsiint-api/shared";
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry";

import { UserLink } from "./users.interface.js";

export function formatUsers(
  users: Awaited<ReturnType<PolicyRegistry["getUsers"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<UserLink> {
  const total = users.total.toNumber();

  // Reshape items
  const items = users.items.map((address) => {
    return {
      address,
      href: `${baseUrl}/${address}`,
    };
  });

  return paginate<UserLink>(items, baseUrl, total, page, pageSize);
}

export default formatUsers;
