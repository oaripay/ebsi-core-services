import {
  DidLink,
  MetadataIdLink,
  VersionIdLink,
} from "./identifiers.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate, remove0xPrefix } from "../../shared/utils";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

export function formatIdentifiers(
  identifiers: AsyncReturnType<DidRegistry["getDidRecordIdentifiers"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  controllerId?: string
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
  versions: AsyncReturnType<DidRegistry["getDidDocumentVersionIds"]>,
  page: number,
  pageSize: number,
  baseUrl: string,
  validAt?: string
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
    extraQuery
  );
}

export function formatMetadata(
  metadata: AsyncReturnType<DidRegistry["getDidDocumentVersionMetadataIds"]>,
  page: number,
  pageSize: number,
  baseUrl: string
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
