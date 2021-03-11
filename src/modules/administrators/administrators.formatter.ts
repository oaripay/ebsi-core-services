import { DidLink } from "./administrators.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { SchemaSCRegistry } from "../../contracts/trusted-schemas";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatAdministrators(
  administrators: AsyncReturnType<SchemaSCRegistry["getAdministrators"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<DidLink> {
  const total = administrators.total.toNumber();

  // Reshape items
  const items = administrators.items.map((did) => ({
    did,
    href: `${baseUrl}/${did}`,
  }));

  return paginate<DidLink>(items, baseUrl, total, page, pageSize);
}

export default formatAdministrators;
