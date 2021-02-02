import { RecordLink } from "./records.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";
import { Timestamp } from "../../contracts/timestamp";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatRecords(
  records: AsyncReturnType<Timestamp["getRecordIds"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<RecordLink> {
  // Reshape items
  const total = records.total.toNumber();
  const items = records.items.map((recordId) => ({
    recordId,
    href: `${baseUrl}/${recordId}`,
  }));

  return paginate<RecordLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export default { formatRecords };
