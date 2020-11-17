import { PaginatedResponse } from "./notifications.interface";

type PaginationIndices = {
  currentPage: number;
  firstPage: number;
  prevPage: number;
  nextPage: number;
  lastPage: number;
  firstElementIndex: number;
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
  const firstElementIndex = pageSize * (currentPage - 1);

  return {
    currentPage,
    firstPage,
    prevPage,
    nextPage,
    lastPage,
    firstElementIndex,
  };
}

export function formatPaginatedResponse<T>(
  items: T[],
  baseUrl: string,
  currentPage: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  const indexes = getPaginationIndices(items.length, currentPage, pageSize);

  const paginatedItems = items.slice(
    indexes.firstElementIndex,
    indexes.firstElementIndex + pageSize
  );

  return {
    self: `${baseUrl}?page[after]=${indexes.currentPage}&page[size]=${pageSize}`,
    items: paginatedItems,
    total,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=${indexes.firstPage}&page[size]=${pageSize}`,
      prev: `${baseUrl}?page[after]=${indexes.prevPage}&page[size]=${pageSize}`,
      next: `${baseUrl}?page[after]=${indexes.nextPage}&page[size]=${pageSize}`,
      last: `${baseUrl}?page[after]=${indexes.lastPage}&page[size]=${pageSize}`,
    },
  };
}

export function isExpired(date: string): boolean {
  const expirationDate = new Date(date);
  const now = new Date();
  if (expirationDate < now) return true;
  return false;
}
