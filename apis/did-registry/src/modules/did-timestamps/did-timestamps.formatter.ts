import { multibase, paginate, PaginatedList } from "@ebsiint-api/shared";
import { TimestampLink } from "./did-timestamps.interface";

export function formatDidTimestamps(
  didTimestamps: {
    items: string[];
    total: number;
  },
  page: number,
  pageSize: number,
  baseUrl: string,
  identifier?: string,
  versionId?: number
): PaginatedList<TimestampLink> {
  const { total } = didTimestamps;

  let paginatedItems: string[];
  let extraQuery = "";

  if (identifier && versionId) {
    extraQuery = `&identifier=${identifier}&version-id=${versionId}`;

    // Manual pagination when getDidDocumentVersionDidTimestampIds is used
    paginatedItems = didTimestamps.items.slice(
      (page - 1) * pageSize,
      page * pageSize
    );
  } else {
    paginatedItems = didTimestamps.items;
  }

  // Reshape items
  const items = paginatedItems.map((hash) => {
    const multibaseBase64urlHash = multibase.base64url.encode(
      Buffer.from(hash.replace(/^0x/, ""), "hex")
    );

    return {
      timestampId: multibaseBase64urlHash,
      href: `${baseUrl}/${multibaseBase64urlHash}`,
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

export default { formatDidTimestamps };
