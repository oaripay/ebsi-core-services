import type { TrackAndTrace } from "@ebsiint-sc/track-and-trace";

import { paginate, type PaginatedList } from "@ebsiint-api/shared";

import type {
  Access,
  DocumentAccesses,
  DocumentEventsLink,
  DocumentsLink,
} from "./documents.interface.js";

export function formatDocumentAccesses(
  accesses: DocumentAccesses,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<Access> {
  const total = accesses.length;

  const items = accesses.slice((page - 1) * pageSize, page * pageSize);

  return paginate<Access>(items, baseUrl, total, page, pageSize);
}

export function formatDocumentEvents(
  events: Awaited<ReturnType<TrackAndTrace["getEvents"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<DocumentEventsLink> {
  const total = events.total.toNumber();

  // Reshape items
  const items = events.items.map((eventId) => {
    return {
      eventId,
      href: `${baseUrl}/${eventId}`,
    };
  });

  return paginate<DocumentEventsLink>(items, baseUrl, total, page, pageSize);
}

export function formatDocuments(
  documents: Awaited<ReturnType<TrackAndTrace["getDocuments"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<DocumentsLink> {
  const total = documents.total.toNumber();

  // Reshape items
  const items = documents.items.map((documentId) => {
    return {
      documentId,
      href: `${baseUrl}/${documentId}`,
    };
  });

  return paginate<DocumentsLink>(items, baseUrl, total, page, pageSize);
}
