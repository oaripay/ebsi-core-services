import {
  AdministratorsListSmartContractResponseObject,
  AdministratorsListSmartContractResponseObjectFormatted,
} from "./types/administrators.interface";

export default function formatAdministrators(
  administrators: AdministratorsListSmartContractResponseObject
): AdministratorsListSmartContractResponseObjectFormatted {
  return {
    items: administrators.items,
    total: administrators.total.toNumber(),
    pageSize: administrators.pageSize.toNumber(),
    prev: administrators.prev.toNumber(),
    next: administrators.next.toNumber(),
  };
}
