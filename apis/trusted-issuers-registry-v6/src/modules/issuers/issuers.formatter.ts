import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { paginateWithoutTotal } from "@ebsiint-api/shared";

import type {
  AttributeObject,
  DidLink,
  IdLink,
  ProxyLink,
} from "./issuers.interface.ts";

export function formatAttributes(
  attributes: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<IdLink> {
  const items = attributes.items.map((id) => ({
    href: `${baseUrl}/${id}`,
    id,
  }));

  return paginateWithoutTotal<IdLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

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

export function formatProxies(
  issuerProxies: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<ProxyLink> {
  const items: ProxyLink[] = issuerProxies.items.map((proxy) => ({
    href: `${baseUrl}/${proxy}`,
    proxyId: proxy,
  }));
  return paginateWithoutTotal<ProxyLink>(items, baseUrl, page, pageSize);
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
