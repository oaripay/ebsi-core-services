import type {
  PaginatedList,
  PaginatedListWithoutTotal,
} from "../interfaces/index.ts";

interface PaginationLinks {
  firstPage: number;
  lastPage: number;
  nextPage: number;
  prevPage: number;
}

export function compute1BasedPaginationLinks(
  total: number,
  currentPage: number,
  pageSize: number,
): PaginationLinks {
  const firstPage = 1;
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const prevPage = Math.max(Math.min(currentPage - 1, lastPage), firstPage);
  const nextPage = Math.max(Math.min(currentPage + 1, lastPage), firstPage);

  return { firstPage, lastPage, nextPage, prevPage };
}

export function paginate<T>(
  items: T[],
  baseUrl: string,
  total: number,
  page: number,
  pageSize: number,
  extraQuery = "",
): PaginatedList<T> {
  const { firstPage, lastPage, nextPage, prevPage } =
    compute1BasedPaginationLinks(total, page, pageSize);

  return {
    items,
    links: {
      first: `${baseUrl}?page[after]=${firstPage}&page[size]=${pageSize}${extraQuery}`,
      last: `${baseUrl}?page[after]=${lastPage}&page[size]=${pageSize}${extraQuery}`,
      next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}${extraQuery}`,
      prev: `${baseUrl}?page[after]=${prevPage}&page[size]=${pageSize}${extraQuery}`,
    },
    pageSize,
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
    total,
  };
}

/**
 * Pagination without total. The length of the items in the arguments can be greater
 * than the pageSize. The interpretation in this case is that the next page exists.
 * Otherwise the function considers that the current page is the last one.
 * The returned object will slice the items to not exceed the page size.
 */
export function paginateWithoutTotal<T>(
  items: T[],
  baseUrl: string,
  page: number,
  pageSize: number,
  extraQuery = "",
): PaginatedListWithoutTotal<T> {
  const currentPageIsLastPage = items.length <= pageSize;
  const firstPage = 1;
  const prevPage = Math.max(page - 1, firstPage);
  const nextPage = currentPageIsLastPage ? page : page + 1;

  return {
    items: items.slice(0, pageSize),
    links: {
      first: `${baseUrl}?page[after]=${firstPage}&page[size]=${pageSize}${extraQuery}`,
      next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}${extraQuery}`,
      prev: `${baseUrl}?page[after]=${prevPage}&page[size]=${pageSize}${extraQuery}`,
      ...(currentPageIsLastPage && {
        last: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
      }),
    },
    pageSize,
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
  };
}
