import { PaginatedList } from "../../shared/interfaces";
import { paginateForCassandra } from "../../shared/utils";

export function formatKeys(
  keys: string[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<string> {
  return paginateForCassandra<string>(
    keys,
    baseUrl,
    currentPage,
    nextPage,
    pageSize,
    extraQuery
  );
}

export default { formatKeys };
