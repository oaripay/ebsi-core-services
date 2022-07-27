import { PaginatedList } from "../interfaces";

export function paginateForCassandra<T>(
  items: T[],
  baseUrl: string,
  total: number,
  currentPage: string,
  nextPage: string,
  pageSize: number,
  extraQuery = ""
): PaginatedList<T> {
  return {
    self: `${baseUrl}?${
      currentPage && `page[after]=${currentPage}&`
    }page[size]=${pageSize}${extraQuery}`,
    items,
    total,
    pageSize,
    links: {
      ...(nextPage && {
        next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}${extraQuery}`,
      }),
    },
  };
}

export default paginateForCassandra;
