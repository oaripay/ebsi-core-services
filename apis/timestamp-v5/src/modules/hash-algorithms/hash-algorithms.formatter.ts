import {
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";

import { HashAlgorithmLink } from "./hash-algorithms.interface.js";

export function formatHashAlgorithms(
  hashAlgorithms: { items: number[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<HashAlgorithmLink> {
  // Reshape items
  const items = hashAlgorithms.items.map((hashAlgorithmId) => ({
    hashAlgorithmId,
    href: `${baseUrl}/${hashAlgorithmId}`,
  }));

  return paginateWithoutTotal<HashAlgorithmLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export default { formatHashAlgorithms };
