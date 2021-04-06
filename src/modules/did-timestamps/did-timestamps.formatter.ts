import { TimestampLink } from "./did-timestamps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatDidTimestamps(
  didTimestamps: AsyncReturnType<DidRegistry["getDidTimestamps"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<TimestampLink> {
  const total = didTimestamps.total.toNumber();

  // Reshape items
  const items = didTimestamps.items.map((hash) => ({
    timestampId: hash,
    href: `${baseUrl}/${hash}`,
  }));

  return paginate<TimestampLink>(items, baseUrl, total, page, pageSize);
}

export default { formatDidTimestamps };
