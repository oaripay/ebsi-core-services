import { DidRegistry } from "@ebsiint-sc/did-registry";
import { PaginatedList, paginate } from "@ebsiint-api/shared";
import { HashAlgorithmLink } from "./hash-algorithms.interface.js";

export function formatHashAlgorithms(
  hashAlgorithms: Awaited<ReturnType<DidRegistry["getHashAlgorithms"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedList<HashAlgorithmLink> {
  // Reshape items
  const total = hashAlgorithms.total.toNumber();
  const items = hashAlgorithms.items.map((hashAlgorithmId) => ({
    hashAlgorithmId: hashAlgorithmId.toNumber(),
    href: `${baseUrl}/${hashAlgorithmId.toNumber()}`,
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
