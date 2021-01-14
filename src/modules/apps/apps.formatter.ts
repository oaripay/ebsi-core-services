import { AppLink, AppObject } from "./apps.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatApps(
  apps: AppObject[],
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<AppLink> {
  // Reshape items
  const items = apps.map((app) => ({
    id: app.applicationId,
    name: app.name,
    href: `${baseUrl}/${app.applicationId}`,
  }));

  return paginate<AppLink>(items, baseUrl, total, page, pageSize, extraQuery);
}

export default formatApps;
