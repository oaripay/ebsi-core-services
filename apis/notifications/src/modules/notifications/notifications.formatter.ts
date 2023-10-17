import { PaginatedList2, paginateForCassandra } from "@ebsiint-api/shared";
import { NotificationResponseObject } from "./notifications.interface.js";

export function formatNotifications(
  attributes: NotificationResponseObject[],
  currentPage: string,
  nextPage: string,
  pageSize: number,
  baseUrl: string,
  total: number,
  extraQuery?: string,
): PaginatedList2<NotificationResponseObject> {
  return paginateForCassandra<NotificationResponseObject>(
    attributes,
    baseUrl,
    total,
    currentPage,
    nextPage,
    pageSize,
    extraQuery,
  );
}

export default { formatNotifications };
