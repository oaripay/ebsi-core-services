import {
  AdministratorsListSmartContractResponseObject,
  AttributeObject,
  IdLink,
  DidLink,
} from "./administrators.interface";
import { PaginatedList } from "../../shared/interfaces";
import {
  formatPaginatedResponse,
  compute1BasedPaginationLinks,
} from "../../shared/utils";

function paginate<T>(
  items: T[],
  baseUrl: string,
  total: number,
  page: number,
  pageSize: number
): PaginatedList<T> {
  const {
    firstPage,
    prevPage,
    nextPage,
    lastPage,
  } = compute1BasedPaginationLinks(total, page, pageSize);

  return formatPaginatedResponse<T>(
    items,
    baseUrl,
    page,
    pageSize,
    total,
    firstPage,
    prevPage,
    nextPage,
    lastPage
  );
}

export function formatAdministrators(
  administrators: AdministratorsListSmartContractResponseObject,
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
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<AttributeObject> {
  const total = revisions.length;

  // Extract items
  const items = revisions.slice((page - 1) * pageSize, page * pageSize);

  return paginate<AttributeObject>(items, baseUrl, total, page, pageSize);
}
