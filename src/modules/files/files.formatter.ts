import { PaginatedList } from "../../shared/interfaces";
import { paginateForCassandra } from "../../shared/utils";

export function formatFiles(
  hashes: string[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<string> {
  return paginateForCassandra<string>(
    hashes,
    baseUrl,
    currentPage,
    nextPage,
    pageSize,
    extraQuery
  );
}

export default { formatFiles };
