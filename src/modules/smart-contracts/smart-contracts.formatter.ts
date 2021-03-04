import {
  GetSmartContractsResponse,
  SmartContractInfoIdsList,
} from "./smart-contracts.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatSmartContracts(
  smartContracts: SmartContractInfoIdsList,
  page: number,
  pageSize: number,
  baseUrl: string,
  name?: string
): PaginatedList<GetSmartContractsResponse> {
  // Reshape items
  const { total } = smartContracts;
  const items = smartContracts.items.map((ledger) => ({
    smartContractInfoId: ledger,
    href: `${baseUrl}/${ledger}`,
  }));

  const extraQuery = name ? `&name=${name}` : "";

  return paginate<GetSmartContractsResponse>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export default formatSmartContracts;
