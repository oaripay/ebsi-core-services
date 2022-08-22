import { RecordLink, VersionLink } from "./records.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate, multibase } from "../../shared/utils";
import { Timestamp } from "@ebsiint-sc/timestamp";
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
  const items = records.items.map((recordId) => {
    const multibaseBase64urlRecordId = multibase.base64url.encode(
      Buffer.from(recordId.replace(/^0x/, ""), "hex")
    );

    return {
      recordId: multibaseBase64urlRecordId,
      href: `${baseUrl}/${multibaseBase64urlRecordId}`,
    };
  });

  return paginate<RecordLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export function formatRecordVersions(
  totalVersions: number,
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string
): PaginatedList<VersionLink> {
  const total = totalVersions;
  const items = Array(total)
    .fill(0)
    .map((x, i) => i)
    .slice((page - 1) * pageSize, page * pageSize)
    .map((versionId) => ({
      versionId,
      href: `${baseUrl}/${versionId}`,
    }));

  return paginate<VersionLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}
