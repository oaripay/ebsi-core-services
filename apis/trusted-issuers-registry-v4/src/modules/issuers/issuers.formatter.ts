import type { PaginatedList } from "@ebsiint-api/shared";
import type { Tir } from "@ebsiint-sc/trusted-issuers-registry";

import { paginate } from "@ebsiint-api/shared";

import type {
  AttributeObject,
  DidLink,
  IdLink,
  ProxyLink,
} from "./issuers.interface.ts";

export function formatAttributes(
  attributes: AttributeObject[],
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<IdLink> {
  const total = attributes.length;

  // Extract and reshape items
  const items = attributes
    .slice((page - 1) * pageSize, page * pageSize)
    .map((attr) => ({
      href: `${baseUrl}/${attr.hash}`,
      id: attr.hash,
    }));

  return paginate<IdLink>(items, baseUrl, total, page, pageSize);
}

export function formatIssuers(
  issuers: Awaited<ReturnType<Tir["getIssuers"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<DidLink> {
  const total = Number(issuers.total);

  // Reshape items
  const items = issuers.items.map((did) => ({
    did,
    href: `${baseUrl}/${did}`,
  }));

  return paginate<DidLink>(items, baseUrl, total, page, pageSize);
}

export function formatProxies(
  issuerProxies: Awaited<ReturnType<Tir["getIssuerProxies"]>>,
  baseUrl: string,
): PaginatedList<ProxyLink> {
  const items: ProxyLink[] = issuerProxies.map((proxy) => ({
    href: `${baseUrl}/${proxy}`,
    proxyId: proxy,
  }));
  const total = items.length;

  return {
    items,
    total,
  };
}

export function formatRevisions(
  revisions: AttributeObject[],
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<AttributeObject> {
  return paginate<AttributeObject>(revisions, baseUrl, total, page, pageSize);
}
