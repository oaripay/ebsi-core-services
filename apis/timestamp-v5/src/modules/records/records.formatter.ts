import {
  multibase,
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import { RecordLink, VersionLink } from "./records.interface.js";

export function formatRecords(
  records: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<RecordLink> {
  // Reshape items
  const items = records.items.map((recordId) => {
    const multibaseBase64urlRecordId = multibase.base64url.encode(
      Buffer.from(recordId.replace(/^0x/, ""), "hex"),
    );

    return {
      recordId: multibaseBase64urlRecordId,
      href: `${baseUrl}/${multibaseBase64urlRecordId}`,
    };
  });

  return paginateWithoutTotal<RecordLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatRecordVersions(
  versions: { items: number[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<VersionLink> {
  const items = versions.items.map((versionId) => ({
    versionId,
    href: `${baseUrl}/${versionId}`,
  }));

  return paginateWithoutTotal<VersionLink>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}
