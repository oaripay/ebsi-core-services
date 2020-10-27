import {
  IssuersListSmartContractResponseObject,
  AttributeObject,
  IdLink,
  DidLink,
} from "./issuers.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatIssuers(
  issuers: IssuersListSmartContractResponseObject,
  page: number,
  pageSize: number,
  baseUrl: string
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
  baseUrl: string
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
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<AttributeObject> {
  const total = revisions.length;

  // Extract items
  const items = revisions.slice((page - 1) * pageSize, page * pageSize);

  return paginate<AttributeObject>(items, baseUrl, total, page, pageSize);
}
