import { DidRegistry } from "@ebsiint-sc/did-registry-v4";
import { DidLink } from "./identifiers.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatIdentifiers(
  identifiers: AsyncReturnType<DidRegistry["getDids"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  controller?: string,
  vMethodId?: string,
  vRelationship?: string
): PaginatedList<DidLink> {
  const total = identifiers.total.toNumber();

  let extraQuery = controller ? `&controller=${controller}` : "";
  extraQuery +=
    vMethodId && vRelationship
      ? `&verification-method-id=${vMethodId}&verification-relationship=${vRelationship}`
      : "";

  // Reshape items
  const items = identifiers.items.map((did) => {
    return {
      did,
      href: `${baseUrl}/${did}`,
    };
  });

  return paginate<DidLink>(items, baseUrl, total, page, pageSize, extraQuery);
}

export default formatIdentifiers;
