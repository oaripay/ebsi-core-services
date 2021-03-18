import { AttributeObject, IdLink, DidLink } from "./administrators.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatAdministrators(
  administrators: AsyncReturnType<DidRegistry["getAdministrators"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<DidLink> {
  const total = administrators.total.toNumber();

  // Reshape items
  const items = administrators.items.map((did) => ({
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
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<AttributeObject> {
  return paginate<AttributeObject>(revisions, baseUrl, total, page, pageSize);
}
