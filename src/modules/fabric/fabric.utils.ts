import * as b64 from "multiformats/bases/base64";
import { PaginatedList } from "./interfaces";

type PaginationLinks = {
  firstPage: number;
  prevPage: number;
  nextPage: number;
  lastPage: number;
};

export function compute1BasedPaginationLinks(
  total: number,
  currentPage: number,
  pageSize: number
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
  extraQuery = ""
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

export function paginateString<T>(
  items: T[],
  baseUrl: string,
  firstPage: string,
  nextPage: string,
  page: string,
  pageSize: number,
  extraQuery = ""
): PaginatedList<T> {
  return {
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
    items,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=${firstPage}&page[size]=${pageSize}${extraQuery}`,
      next: `${baseUrl}?page[after]=${nextPage}&page[size]=${pageSize}${extraQuery}`,
    },
  };
}

export const encodeMultibase64url = (buffer: Buffer): string =>
  b64.base64url.encode(buffer).toString();
