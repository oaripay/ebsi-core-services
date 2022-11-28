import { PaginatedList, paginate } from "@ebsiint-api/shared";
import {
  GetLedgersResponse,
  GetRevisionsResponse,
  LedgerInfoIdsList,
  RevisionsList,
} from "./ledgers.interface";

export function formatLedgers(
  ledgers: LedgerInfoIdsList,
  page: number,
  pageSize: number,
  baseUrl: string,
  name?: string
): PaginatedList<GetLedgersResponse> {
  // Reshape items
  const { total } = ledgers;
  const items = ledgers.items.map((ledger) => ({
    ledgerInfoId: ledger,
    href: `${baseUrl}/${ledger}`,
  }));

  const extraQuery = name ? `&name=${name}` : "";

  return paginate<GetLedgersResponse>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export function formatRevisions(
  revisions: RevisionsList,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<GetRevisionsResponse> {
  // Reshape items
  const { total } = revisions;
  const items = revisions.items.map((revisionHash) => ({
    revisionHash,
    href: `${baseUrl}/${revisionHash}`,
  }));

  return paginate<GetRevisionsResponse>(items, baseUrl, total, page, pageSize);
}

export default formatLedgers;
