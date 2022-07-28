import { PaginatedList } from "../../shared/interfaces";
import { paginateForCassandra } from "../../shared/utils";
import { NotificationResponseObject } from "./notifications.interface";

export function formatNotifications(
  attributes: NotificationResponseObject[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  total: number,
  extraQuery?: string
): PaginatedList<NotificationResponseObject> {
  return paginateForCassandra<NotificationResponseObject>(
    attributes,
    baseUrl,
    total,
    currentPage,
    nextPage,
    pageSize,
    extraQuery
  );
}

export default { formatNotifications };
