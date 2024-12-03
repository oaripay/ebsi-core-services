import {
  multibase,
  multihashEncode,
  paginate,
  PaginatedList,
} from "@ebsiint-api/shared";
import { Timestamp } from "@ebsiint-sc/timestamp-v2";

import { TimestampLink } from "./timestamps.interface.js";

export function formatTimestamps(
  timestamps: Awaited<ReturnType<Timestamp["getTimestamps"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedList<TimestampLink> {
  // Reshape items
  const total = timestamps.total.toNumber();
  const items = timestamps.items.map((timestampId) => {
    const multibaseBase64urlTimestampId = multibase.base64url.encode(
      multihashEncode(timestampId.replace(/^0x/, ""), "sha2-256", 32),
    );

    return {
      href: `${baseUrl}/${multibaseBase64urlTimestampId}`,
      timestampId: multibaseBase64urlTimestampId,
    };
  });

  return paginate<TimestampLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery,
  );
}

export default { formatTimestamps };
