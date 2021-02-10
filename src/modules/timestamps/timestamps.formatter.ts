import { TimestampLink } from "./timestamps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate, multibase64Encode } from "../../shared/utils";
import { Timestamp } from "../../contracts/timestamp";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatTimestamps(
  timestamps: AsyncReturnType<Timestamp["getTimestamps"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<TimestampLink> {
  // Reshape items
  const total = timestamps.total.toNumber();
  const items = timestamps.items.map((timestampId) => {
    const multibase64urlEncodedTimestampId = multibase64Encode(timestampId);
    return {
      timestampId: multibase64urlEncodedTimestampId,
      href: `${baseUrl}/${multibase64urlEncodedTimestampId}`,
    };
  });

  return paginate<TimestampLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export default { formatTimestamps };
