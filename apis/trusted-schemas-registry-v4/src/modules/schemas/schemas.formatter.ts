import {
  PaginatedListWithoutTotal,
  paginateWithoutTotal,
} from "@ebsiint-api/shared";
import {
  GetSchemaRevisionsResponse,
  GetSchemasResponse,
  GetSchemaRevisionMetadataListResponse,
} from "./schemas.interface.js";
import { hexToMultibaseBase58Btc } from "./schemas.utils.js";

export function formatSchemas(
  schemas: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<GetSchemasResponse> {
  // Reshape items
  const items = schemas.items.map((schema) => {
    const multibaseBase58BtcSchemaId = hexToMultibaseBase58Btc(schema);

    return {
      schemaId: multibaseBase58BtcSchemaId,
      href: `${baseUrl}/${multibaseBase58BtcSchemaId}`,
    };
  });

  return paginateWithoutTotal<GetSchemasResponse>(
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
  validAt?: string,
): PaginatedListWithoutTotal<GetSchemaRevisionsResponse> {
  // Reshape items
  const items = schemas.items.map((schemaRevisionId) => ({
    schemaRevisionId,
    href: `${baseUrl}/${schemaRevisionId}`,
  }));

  const extraQuery = validAt ? `&valid-at=${validAt}` : "";

  return paginateWithoutTotal<GetSchemaRevisionsResponse>(
    items,
    baseUrl,
    page,
    pageSize,
    extraQuery,
  );
}

export function formatSchemaRevisionMetadataList(
  metadata: { items: string[] },
  page: number,
  pageSize: number,
  baseUrl: string,
): PaginatedListWithoutTotal<GetSchemaRevisionMetadataListResponse> {
  // Reshape items
  const items = metadata.items.map((metadataId) => ({
    metadataId,
    href: `${baseUrl}/${metadataId}`,
  }));

  return paginateWithoutTotal<GetSchemaRevisionMetadataListResponse>(
    items,
    baseUrl,
    page,
    pageSize,
  );
}
