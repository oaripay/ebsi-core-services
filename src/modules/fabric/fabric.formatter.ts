import { PaginatedList } from "./interfaces";
import { paginate } from "./fabric.utils";
import { Block } from "./interfaces/blocks.interface";

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

export function formatBlocks(
  items: Block[],
  total: number,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<Block> {
  return paginate<Block>(items, baseUrl, total, page, pageSize);
}
