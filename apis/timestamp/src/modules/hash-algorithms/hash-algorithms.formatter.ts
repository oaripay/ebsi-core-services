import { paginate, PaginatedList } from "@ebsiint-api/shared";
import { Timestamp } from "@ebsiint-sc/timestamp";

import { HashAlgorithmLink } from "./hash-algorithms.interface.js";

export function formatHashAlgorithms(
  hashAlgorithms: Awaited<ReturnType<Timestamp["getHashAlgorithms"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedList<HashAlgorithmLink> {
  // Reshape items
  const total = Number(hashAlgorithms.total);
  const items = hashAlgorithms.items.map((hashAlgorithmId) => ({
    hashAlgorithmId: Number(hashAlgorithmId),
    href: `${baseUrl}/${Number(hashAlgorithmId)}`,
  }));

  return paginate<HashAlgorithmLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery,
  );
}

export default { formatHashAlgorithms };
