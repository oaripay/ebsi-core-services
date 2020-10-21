import {
  AdministratorsListSmartContractResponseObject,
  AttributeObject,
  PaginatedList,
  IdLink,
  DidLink,
} from "./administrators.interface";

export function formatAdministrators(
  administrators: AdministratorsListSmartContractResponseObject,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<DidLink> {
  const total = administrators.total.toNumber();
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  // Ignore SC's "prev" and "next"
  const prev = Math.min(Math.max(page - 1, 1), lastPage);
  const next = Math.min(page + 1, lastPage);

  return {
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}`,
    items: administrators.items.map((did) => ({
      did,
      href: `${baseUrl}/${did}`,
    })),
    total,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=1&page[size]=${pageSize}`,
      prev: `${baseUrl}?page[after]=${prev}&page[size]=${pageSize}`,
      next: `${baseUrl}?page[after]=${next}&page[size]=${pageSize}`,
      last: `${baseUrl}?page[after]=${lastPage}&page[size]=${pageSize}`,
    },
  };
}

export function formatAttributes(
  attributes: AttributeObject[],
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<IdLink> {
  const total = attributes.length;
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const prev = Math.min(Math.max(page - 1, 1), lastPage);
  const next = Math.min(page + 1, lastPage);

  return {
    self: `${baseUrl}?page[after]=${page}&page[size]=${pageSize}`,
    items: attributes
      .slice((page - 1) * pageSize, page * pageSize)
      .map((attr) => ({
        id: attr.hash,
        href: `${baseUrl}/${attr.hash}`,
      })),
    total,
    pageSize,
    links: {
      first: `${baseUrl}?page[after]=1&page[size]=${pageSize}`,
      prev: `${baseUrl}?page[after]=${prev}&page[size]=${pageSize}`,
      next: `${baseUrl}?page[after]=${next}&page[size]=${pageSize}`,
      last: `${baseUrl}?page[after]=${lastPage}&page[size]=${pageSize}`,
    },
  };
}
