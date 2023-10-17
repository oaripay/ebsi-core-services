import { PaginatedList2, paginate2 } from "@ebsiint-api/shared";
import { STORES } from "./stores.constants.js";

export function formatStores(
  filteredStores: string[],
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedList2<string> {
  const total = STORES.length;

  return paginate2<string>(
    filteredStores,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery,
  );
}

export default { formatStores };
