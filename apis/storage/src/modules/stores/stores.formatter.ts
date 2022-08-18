import { STORES } from "./stores.constants";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatStores(
  filteredStores: string[],
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<string> {
  const total = STORES.length;

  return paginate<string>(
    filteredStores,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export default { formatStores };
