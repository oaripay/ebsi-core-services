import type {
  PaginatedList,
  PaginatedListWithoutTotal,
} from "../interfaces/index.js";

interface PaginationLinks {
  firstPage: number;
  prevPage: number;
  nextPage: number;
  lastPage: number;
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

  return { firstPage, prevPage, nextPage, lastPage };
}

export function paginate<T>(
  items: T[],
  baseUrl: string,
  total: number,
  page: number,
  pageSize: number,
  extraQuery = "",
): PaginatedList<T> {
  const { firstPage, prevPage, nextPage, lastPage } =
    compute1BasedPaginationLinks(total, page, pageSize);

  return {
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
    items,
    total,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=${firstPage}&page[size]=${pageSize}${extraQuery}`,
      prev: `${baseUrl}?page[after]=${prevPage}&page[size]=${pageSize}${extraQuery}`,
      next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}${extraQuery}`,
      last: `${baseUrl}?page[after]=${lastPage}&page[size]=${pageSize}${extraQuery}`,
    },
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
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
    items: items.slice(0, pageSize),
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=${firstPage}&page[size]=${pageSize}${extraQuery}`,
      prev: `${baseUrl}?page[after]=${prevPage}&page[size]=${pageSize}${extraQuery}`,
      next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}${extraQuery}`,
      ...(currentPageIsLastPage && {
        last: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
      }),
    },
  };
}
