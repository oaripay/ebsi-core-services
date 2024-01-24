import { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import { PaginatedList, paginate } from "@ebsiint-api/shared";
import { DocumentsLink } from "./documents.interface.js";

export function formatDocuments(
  documents: Awaited<ReturnType<TrackAndTrace["getDocuments"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<DocumentsLink> {
  const total = documents.total.toNumber();

  // Reshape items
  const items = documents.items.map((documentId) => {
    return {
      documentId,
      href: `${baseUrl}/${documentId}`,
    };
  });

  return paginate<DocumentsLink>(items, baseUrl, total, page, pageSize);
}

export default formatDocuments;
