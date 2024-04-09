import { Event } from "../../src/modules/identifiers/identifiers.interface.js";
import type { PaginatedList } from "../interfaces/index.js";

interface PaginationLinks {
  prevPage: number | string;
  nextPage: number | string;
}

export function compute1BasedPaginationLinks(
  currentPage: number,
  prevPageIdentifiers: string[],
  nextPageIdentifiers: string[],
): PaginationLinks {
  let prevPage;
  let nextPage;

  if (prevPageIdentifiers.length === 0) {
    prevPage = "";
  } else {
    prevPage = `?page[after]=${currentPage - 1}`;
  }
  if (nextPageIdentifiers.length === 0) {
    nextPage = "";
  } else {
    nextPage = `?page[after]=${currentPage + 1}`;
  }

  return { prevPage, nextPage };
}

export function compute1BasedPaginationLinksEvents(
  currentPage: number,
  prevPageIdentifiers: Event[],
  nextPageIdentifiers: Event[],
): PaginationLinks {
  let prevPage;
  let nextPage;

  if (prevPageIdentifiers.length === 0) {
    prevPage = "";
  } else {
    prevPage = `?page[after]=${currentPage - 1}`;
  }
  if (nextPageIdentifiers.length === 0) {
    nextPage = "";
  } else {
    nextPage = `?page[after]=${currentPage + 1}`;
  }

  return { prevPage, nextPage };
}

export function paginate<T>(
  items: T[],
  baseUrl: string,
  page: number,
  pageSize: number,
  prevPageIdentifiers: string[],
  nextPageIdentifiers: string[],
  extraQuery = "",
): PaginatedList<T> {
  const { prevPage, nextPage } = compute1BasedPaginationLinks(
    page,
    prevPageIdentifiers,
    nextPageIdentifiers,
  );

  return {
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}${extraQuery}`,
    items,
    pageSize,
    links: {
      prev: `${baseUrl}${prevPage}${prevPage === "" ? "?" : "&"}page[size]=${pageSize}${extraQuery}`,
      next: `${baseUrl}${nextPage}${nextPage === "" ? "?" : "&"}page[size]=${pageSize}${extraQuery}`,
    },
  };
}

export function paginateEvents<T>(
  events: T[],
  baseUrl: string,
  page: number,
  pageSize: number,
  prevPageEvents: Event[],
  nextPageEvents: Event[],
): PaginatedList<T> {
  const { prevPage, nextPage } = compute1BasedPaginationLinksEvents(
    page,
    prevPageEvents,
    nextPageEvents,
  );

  return {
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}`,
    items: events,
    pageSize,
    links: {
      prev: `${baseUrl}${prevPage}${prevPage === "" ? "?" : "&"}page[size]=${pageSize}`,
      next: `${baseUrl}${nextPage}${prevPage === "" ? "?" : "&"}page[size]=${pageSize}`,
    },
  };
}
