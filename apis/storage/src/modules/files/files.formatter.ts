import { PaginatedList2, paginateForCassandra2 } from "@ebsiint-api/shared";

export function formatFiles(
  hashes: string[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedList2<string> {
  return paginateForCassandra2<string>(
    hashes,
    baseUrl,
    currentPage,
    nextPage,
    pageSize,
    extraQuery,
  );
}

export default { formatFiles };
