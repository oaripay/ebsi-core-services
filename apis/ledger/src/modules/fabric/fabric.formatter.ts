import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import { PaginatedList, Transaction } from "./interfaces";
import { paginate, paginateString } from "./fabric.utils";
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

export function formatTransactions(
  items: Transaction[],
  page: string,
  pageSize: number,
  baseUrl: string,
  firstPage: string,
  nextPage: string
): PaginatedList<Transaction> {
  return paginateString<Transaction>(
    items,
    baseUrl,
    firstPage,
    nextPage,
    page,
    pageSize
  );
}

export function encodePageAfter(blockNumber: number, txId: string): string {
  return Number(blockNumber).toString(10) + txId;
}

export function decodePageAfter(after: string): {
  blockNumber: number;
  txId: string;
} {
  let blockString: string = null;
  let txId: string = null;
  if (after.length <= 64) blockString = after;
  else {
    blockString = after.substring(0, after.length - 64);
    txId = after.replace(blockString, "");
  }

  const blockNumber = parseInt(blockString, 10);

  if (Number.isNaN(blockNumber) || blockNumber < 0)
    throw new BadRequestError("Invalid params", {
      detail: `page[after] must contain a blockNumber greater or equal to 0. Received: ${blockString}`,
    });

  return { blockNumber, txId };
}
