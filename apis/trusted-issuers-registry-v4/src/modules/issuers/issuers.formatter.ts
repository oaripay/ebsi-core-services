import { Tir } from "@ebsiint-sc/trusted-issuers-registry";
import { paginate, PaginatedList } from "@ebsiint-api/shared";
import {
  AttributeObject,
  IdLink,
  DidLink,
  ProxyLink,
} from "./issuers.interface.js";

export function formatIssuers(
  issuers: Awaited<ReturnType<Tir["getIssuers"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<DidLink> {
  const total = issuers.total.toNumber();

  // Reshape items
  const items = issuers.items.map((did) => ({
    did,
    href: `${baseUrl}/${did}`,
  }));

  return paginate<DidLink>(items, baseUrl, total, page, pageSize);
}

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
      id: attr.hash,
      href: `${baseUrl}/${attr.hash}`,
    }));

  return paginate<IdLink>(items, baseUrl, total, page, pageSize);
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

export function formatProxies(
  issuerProxies: Awaited<ReturnType<Tir["getIssuerProxies"]>>,
  baseUrl: string,
): PaginatedList<ProxyLink> {
  const items: ProxyLink[] = issuerProxies.map((proxy) => ({
    proxyId: proxy,
    href: `${baseUrl}/${proxy}`,
  }));
  const total = items.length;

  return {
    items,
    total,
  };
}
