import { TimestampLink } from "./timestamps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate, multibase, multihashEncode } from "../../shared/utils";
import { Timestamp } from "@ebsiint-sc/timestamp";
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
    const multibaseBase64urlTimestampId = multibase.base64url.encode(
      multihashEncode(timestampId.replace(/^0x/, ""), "sha2-256", 32)
    );

    return {
      timestampId: multibaseBase64urlTimestampId,
      href: `${baseUrl}/${multibaseBase64urlTimestampId}`,
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
