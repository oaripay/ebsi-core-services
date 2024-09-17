import {
  paginateWithoutTotal,
  PaginatedListWithoutTotal,
} from "@ebsiint-api/shared";
import {
  AttributeObject,
  IdLink,
  DidLink,
  ProxyLink,
} from "./issuers.interface.js";

export function formatIssuers(
  issuers: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<DidLink> {
  // Reshape items
  const items = issuers.items.map((did) => ({
    did,
    href: `${baseUrl}/${did}`,
  }));

  return paginateWithoutTotal<DidLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatAttributes(
  attributes: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<IdLink> {
  const items = attributes.items.map((id) => ({
    id,
    href: `${baseUrl}/${id}`,
  }));

  return paginateWithoutTotal<IdLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatRevisions(
  revisions: { items: AttributeObject[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<AttributeObject> {
  const { items } = revisions;
  return paginateWithoutTotal<AttributeObject>(items, baseUrl, page, pageSize);
}

export function formatProxies(
  issuerProxies: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<ProxyLink> {
  const items: ProxyLink[] = issuerProxies.items.map((proxy) => ({
    proxyId: proxy,
    href: `${baseUrl}/${proxy}`,
  }));
  return paginateWithoutTotal<ProxyLink>(items, baseUrl, page, pageSize);
}
