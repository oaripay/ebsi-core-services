import { DidRegistry } from "@ebsiint-sc/did-registry";
import { PaginatedList, paginate, remove0xPrefix } from "@ebsiint-api/shared";
import {
  DidLink,
  MetadataIdLink,
  VersionIdLink,
} from "./identifiers.interface.js";

export function formatIdentifiers(
  identifiers: Awaited<ReturnType<DidRegistry["getDidRecordIdentifiers"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
  controllerId?: string,
): PaginatedList<DidLink> {
  const total = identifiers.total.toNumber();

  const extraQuery = controllerId ? `&controller=${controllerId}` : "";

  // Reshape items
  const items = identifiers.items.map((hexDid) => {
    const did = Buffer.from(remove0xPrefix(hexDid), "hex").toString("utf8");
    return {
      did,
      href: `${baseUrl}/${did}`,
    };
  });

  return paginate<DidLink>(items, baseUrl, total, page, pageSize, extraQuery);
}

export function formatVersions(
  versions: Awaited<ReturnType<DidRegistry["getDidDocumentVersionIds"]>>,
  page: number,
  pageSize: number,
  baseUrl: string,
  validAt?: string,
): PaginatedList<VersionIdLink> {
  const total = versions.total.toNumber();

  const extraQuery = validAt ? `&valid-at=${validAt}` : "";

  // Reshape items
  const items = versions.items.map((versionId) => {
    return {
      versionId,
      href: `${baseUrl}/${versionId}`,
    };
  });

  return paginate<VersionIdLink>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatMetadata(
  metadata: Awaited<
    ReturnType<DidRegistry["getDidDocumentVersionMetadataIds"]>
  >,
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedList<MetadataIdLink> {
  const total = metadata.total.toNumber();

  // Reshape items
  const items = metadata.items.map((metadataId) => {
    return {
      metadataId,
      href: `${baseUrl}/${metadataId}`,
    };
  });

  return paginate<MetadataIdLink>(items, baseUrl, total, page, pageSize);
}
