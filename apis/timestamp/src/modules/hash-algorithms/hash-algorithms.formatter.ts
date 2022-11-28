import { Timestamp } from "@ebsiint-sc/timestamp";
import { PaginatedList, paginate, AsyncReturnType } from "@ebsiint-api/shared";
import { HashAlgorithmLink } from "./hash-algorithms.interface";

export function formatHashAlgorithms(
  hashAlgorithms: AsyncReturnType<Timestamp["getHashAlgorithms"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
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
    extraQuery
  );
}

export default { formatHashAlgorithms };
