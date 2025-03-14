import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { paginateWithoutTotal } from "@ebsiint-api/shared";

import type { HashAlgorithmLink } from "./hash-algorithms.interface.ts";

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
