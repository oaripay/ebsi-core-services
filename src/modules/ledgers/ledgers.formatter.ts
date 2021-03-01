import { GetLedgersResponse } from "./ledgers.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { LedgerSCRegistry } from "../../contracts/trusted-ledgers-sc";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatLedgers(
  ledgers: AsyncReturnType<LedgerSCRegistry["getLedgerInfoIds"]>,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<GetLedgersResponse> {
  // Reshape items
  const total = ledgers.total.toNumber();
  const items = ledgers.items.map((ledger) => ({
    // TODO: base4url encode ID
    ledgerInfoId: ledger,
    href: `${baseUrl}/${ledger}`,
  }));

  return paginate<GetLedgersResponse>(items, baseUrl, total, page, pageSize);
}

export default formatLedgers;
