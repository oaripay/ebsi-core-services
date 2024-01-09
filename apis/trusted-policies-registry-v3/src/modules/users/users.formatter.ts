/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { PolicyRegistry } from "@ebsiint-sc/trusted-policies-registry-v2";
import { PaginatedList, paginate } from "@ebsiint-api/shared";
import { UserLink } from "./users.interface.js";

export function formatUsers(
  users: Awaited<ReturnType<PolicyRegistry["getUsers"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<UserLink> {
  const total = users.total.toNumber();

  // Reshape items
  const items = users.items.map((user) => {
    return {
      user,
      href: `${baseUrl}/${user}`,
    };
  });

  return paginate<UserLink>(items, baseUrl, total, page, pageSize);
}

export default formatUsers;
