import { PaginatedResponse } from "./notifications.interface";

type PaginationIndices = {
  firstPage: number;
  prevPage: number;
  nextPage: number;
  lastPage: number;
};

export function getPaginationIndices(
  total: number,
  currentPage: number,
  pageSize: number
): PaginationIndices {
  const firstPage = 1;
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const prevPage = Math.max(Math.min(currentPage - 1, lastPage), firstPage);
  const nextPage = Math.max(Math.min(currentPage + 1, lastPage), firstPage);

  return { firstPage, prevPage, nextPage, lastPage };
}

export function formatPaginatedResponse<T>(
  items: T[],
  baseUrl: string,
  currentPage: number,
  pageSize: number,
  total: number,
  paginationIndices: PaginationIndices
): PaginatedResponse<T> {
  const { firstPage, prevPage, nextPage, lastPage } = paginationIndices;

  return {
    self: `${baseUrl}?page[after]=${currentPage}&page[size]=${pageSize}`,
    items,
    total,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=${firstPage}&page[size]=${pageSize}`,
      prev: `${baseUrl}?page[after]=${prevPage}&page[size]=${pageSize}`,
      next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}`,
      last: `${baseUrl}?page[after]=${lastPage}&page[size]=${pageSize}`,
    },
  };
}
