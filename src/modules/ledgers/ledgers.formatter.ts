import { GetLedgersResponse, LedgerInfoIdsList } from "./ledgers.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

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

export default formatLedgers;
