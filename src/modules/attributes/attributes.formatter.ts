import { PaginatedList } from "../../shared/interfaces";
import { paginateForCassandra } from "../../shared/utils";
import { AttributeResponseObject } from "./attributes.interface";

export function formatAttributes(
  attributes: AttributeResponseObject[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<AttributeResponseObject> {
  return paginateForCassandra<AttributeResponseObject>(
    attributes,
    baseUrl,
    currentPage,
    nextPage,
    pageSize,
    extraQuery
  );
}

export default { formatAttributes };
