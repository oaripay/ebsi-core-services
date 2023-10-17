import { PaginatedList2, paginateForCassandra2 } from "@ebsiint-api/shared";
import { AttributeResponseObject } from "./attributes.interface.js";

export function formatAttributes(
  attributes: AttributeResponseObject[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedList2<AttributeResponseObject> {
  return paginateForCassandra2<AttributeResponseObject>(
    attributes,
    baseUrl,
    currentPage,
    nextPage,
    pageSize,
    extraQuery,
  );
}

export default { formatAttributes };
