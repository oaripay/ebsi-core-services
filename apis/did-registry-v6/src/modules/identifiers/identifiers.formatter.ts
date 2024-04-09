import { PaginatedList } from "../../interfaces/index.js";
import { paginate, paginateEvents } from "../../utils/pagination.utils.js";
import { DidLink, Event } from "./identifiers.interface.js";

export function formatIdentifiers(
  identifiers: string[],
  page: number,
  pageSize: number,
  baseUrl: string,
  prevPageIdentifiers: string[],
  nextPageIdentifiers: string[],
  controller?: string,
  vMethodId?: string,
  vRelationship?: string,
): PaginatedList<DidLink> {
  let extraQuery = controller ? `&controller=${controller}` : "";
  extraQuery +=
    vMethodId && vRelationship
      ? `&verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`
      : "";

  // Reshape items
  const items = identifiers.map((did) => {
    return {
      did,
      href: `${baseUrl}/${did}`,
    };
  });

  return paginate<DidLink>(
    items,
    baseUrl,
    page,
    pageSize,
    prevPageIdentifiers,
    nextPageIdentifiers,
    extraQuery,
  );
}

export function formatEvents(
  events: Event[],
  page: number,
  pageSize: number,
  baseUrl: string,
  prevPageEvents: Event[],
  nextPageEvents: Event[],
): PaginatedList<Event> {
  return paginateEvents<Event>(
    events,
    baseUrl,
    page,
    pageSize,
    prevPageEvents,
    nextPageEvents,
  );
}

export default formatIdentifiers;
