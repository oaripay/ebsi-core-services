import {
  GetSmartContractsResponse,
  GetRevisionsResponse,
  SmartContractInfoIdsList,
  RevisionsList,
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
  const items = smartContracts.items.map((smartContractInfoId) => ({
    smartContractInfoId,
    href: `${baseUrl}/${smartContractInfoId}`,
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

export default formatSmartContracts;
