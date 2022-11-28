import { paginateForCassandra2, PaginatedList2 } from "@ebsiint-api/shared";

export function formatKeys(
  keys: string[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList2<string> {
  return paginateForCassandra2<string>(
    keys,
    baseUrl,
    currentPage,
    nextPage,
    pageSize,
    extraQuery
  );
}

export default { formatKeys };
