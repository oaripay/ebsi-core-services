import { DidLink } from "./identifiers.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate, remove0xPrefix } from "../../shared/utils";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatIdentifiers(
  identifiers: AsyncReturnType<DidRegistry["getDidRecordIdentifiers"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  controllerId?: string
): PaginatedList<DidLink> {
  const total = identifiers.total.toNumber();

  const extraQuery = controllerId ? `&controller=${controllerId}` : "";

  // Reshape items
  const items = identifiers.items.map((hexDid) => {
    const did = Buffer.from(remove0xPrefix(hexDid), "hex").toString("utf8");
    return {
      did,
      href: `${baseUrl}/${did}`,
    };
  });

  return paginate<DidLink>(items, baseUrl, total, page, pageSize, extraQuery);
}

export default { formatIdentifiers };
