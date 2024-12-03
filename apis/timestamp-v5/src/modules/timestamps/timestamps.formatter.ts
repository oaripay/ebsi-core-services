import {
  multibase,
  multihashEncode,
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";

import { TimestampLink } from "./timestamps.interface.js";

export function formatTimestamps(
  timestamps: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<TimestampLink> {
  // Reshape items
  const items = timestamps.items.map((timestampId) => {
    const multibaseBase64urlTimestampId = multibase.base64url.encode(
      multihashEncode(timestampId.replace(/^0x/, ""), "sha2-256", 32),
    );

    return {
      href: `${baseUrl}/${multibaseBase64urlTimestampId}`,
      timestampId: multibaseBase64urlTimestampId,
    };
  });

  return paginateWithoutTotal<TimestampLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export default { formatTimestamps };
