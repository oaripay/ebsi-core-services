/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { UserLink } from "./users.interface";
import { PolicyRegistry } from "../../contracts";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatUsers(
  users: AsyncReturnType<PolicyRegistry["getUsers"]>,
  page: number,
  pageSize: number,
  baseUrl: string
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
