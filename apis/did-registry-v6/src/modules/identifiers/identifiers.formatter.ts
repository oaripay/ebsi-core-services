import {
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import { DidLink, Event } from "./identifiers.interface.js";

export function formatIdentifiers(
  identifiers: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<DidLink> {
  // Reshape items
  const items = identifiers.items.map((did) => {
    return {
      did,
      href: `${baseUrl}/${did}`,
    };
  });

  return paginateWithoutTotal<DidLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatEvents(
  events: { items: Event[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<Event> {
  return paginateWithoutTotal<Event>(
    events.items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export default formatIdentifiers;
