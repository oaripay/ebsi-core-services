import { PaginatedList } from "./interfaces";
import { paginate } from "./fabric.utils";

export function formatChannels(
  channels: string[],
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<string> {
  const total = channels.length;

  // Extract items
  const items = channels.slice((page - 1) * pageSize, page * pageSize);

  return paginate<string>(items, baseUrl, total, page, pageSize);
}

export default formatChannels;
