import {
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import { UserLink } from "./users.interface.js";

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
      user,
      href: `${baseUrl}/${user}`,
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
