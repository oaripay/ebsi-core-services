import { NameLink } from "./did-methods.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatDidMethods(
  didMethods: AsyncReturnType<DidRegistry["getDidMethods"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<NameLink> {
  const total = didMethods.total.toNumber();

  // Reshape items
  const items = didMethods.items.map((name) => ({
    name,
    href: `${baseUrl}/${name}`,
  }));

  return paginate<NameLink>(items, baseUrl, total, page, pageSize);
}

export default { formatDidMethods };
