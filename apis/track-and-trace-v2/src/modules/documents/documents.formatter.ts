import {
  paginateWithoutTotal,
  type PaginatedListWithoutTotal,
} from "@ebsiint-api/shared";
import type {
  Access,
  DocumentEventsLink,
  DocumentsLink,
} from "./documents.interface.js";

export function formatDocuments(
  documents: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<DocumentsLink> {
  const items = documents.items.map((documentId) => {
    return {
      documentId,
      href: `${baseUrl}/${documentId}`,
    };
  });

  return paginateWithoutTotal<DocumentsLink>(items, baseUrl, page, pageSize);
}

export function formatDocumentEvents(
  events: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<DocumentEventsLink> {
  const items = events.items.map((eventId) => {
    return {
      eventId,
      href: `${baseUrl}/${eventId}`,
    };
  });

  return paginateWithoutTotal<DocumentEventsLink>(
    items,
    baseUrl,
    page,
    pageSize,
  );
}

export function formatDocumentAccesses(
  accesses: { items: Access[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<Access> {
  const { items } = accesses;

  return paginateWithoutTotal<Access>(items, baseUrl, page, pageSize);
}
