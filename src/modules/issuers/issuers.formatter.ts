import {
  IssuersListSmartContractResponseObject,
  IssuersListSmartContractResponseObjectFormatted,
} from "./types/issuers.interface";

export default function formatIssuers(
  issuers: IssuersListSmartContractResponseObject
): IssuersListSmartContractResponseObjectFormatted {
  return {
    items: issuers.items,
    total: issuers.total.toNumber(),
    pageSize: issuers.pageSize.toNumber(),
    prev: issuers.prev.toNumber(),
    next: issuers.next.toNumber(),
  };
}
