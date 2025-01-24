import type { PaginatedListWithoutTotal } from "@ebsiint-api/shared";

import { paginateWithoutTotal } from "@ebsiint-api/shared";

import type {
  GetSchemaRevisionMetadataListResponse,
  GetSchemaRevisionsResponse,
  GetSchemasResponse,
} from "./schemas.interface.js";

import { hexToMultibaseBase58Btc } from "./schemas.utils.js";

export function formatSchemaRevisionMetadataList(
  metadata: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<GetSchemaRevisionMetadataListResponse> {
  // Reshape items
  const items = metadata.items.map((metadataId) => ({
    href: `${baseUrl}/${metadataId}`,
    metadataId,
  }));

  return paginateWithoutTotal<GetSchemaRevisionMetadataListResponse>(
    items,
    baseUrl,
    page,
    pageSize,
  );
}

export function formatSchemaRevisions(
  schemas: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<GetSchemaRevisionsResponse> {
  // Reshape items
  const items = schemas.items.map((schemaRevisionId) => ({
    href: `${baseUrl}/${schemaRevisionId}`,
    schemaRevisionId,
  }));

  return paginateWithoutTotal<GetSchemaRevisionsResponse>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatSchemas(
  schemas: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
  extraQuery?: string,
): PaginatedListWithoutTotal<GetSchemasResponse> {
  // Reshape items
  const items = schemas.items.map((schema) => {
    const multibaseBase58BtcSchemaId = hexToMultibaseBase58Btc(schema);

    return {
      href: `${baseUrl}/${multibaseBase58BtcSchemaId}`,
      schemaId: multibaseBase58BtcSchemaId,
    };
  });

  return paginateWithoutTotal<GetSchemasResponse>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}
