import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { paginateWithoutTotal } from "@ebsiint-api/shared";

import type { UserLink } from "./users.interface.ts";

export function formatUsers(
  users: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<UserLink> {
  // Reshape items
  const items = users.items.map((user) => {
    return {
      href: `${baseUrl}/${user}`,
      user,
    };
  });

  return paginateWithoutTotal<UserLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export default formatUsers;
