import { TimestampLink } from "./did-timestamps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

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
  const items = paginatedItems.map((hash) => ({
    timestampId: hash,
    href: `${baseUrl}/${hash}`,
  }));

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
