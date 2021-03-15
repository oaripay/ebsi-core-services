import {
  GetSchemaRevisionsResponse,
  GetSchemasResponse,
  GetSchemaRevisionMetadataListResponse,
  ItemsList,
} from "./schemas.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatSchemas(
  schemas: ItemsList,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<GetSchemasResponse> {
  // Reshape items
  const { total } = schemas;
  const items = schemas.items.map((schema) => ({
    schemaId: schema,
    href: `${baseUrl}/${schema}`,
  }));

  return paginate<GetSchemasResponse>(items, baseUrl, total, page, pageSize);
}

export function formatSchemaRevisions(
  schemas: ItemsList,
  page: number,
  pageSize: number,
  baseUrl: string,
  validAt?: string
): PaginatedList<GetSchemaRevisionsResponse> {
  // Reshape items
  const { total } = schemas;
  const items = schemas.items.map((schemaRevisionId) => ({
    schemaRevisionId,
    href: `${baseUrl}/${schemaRevisionId}`,
  }));

  const extraQuery = validAt ? `&valid-at=${validAt}` : "";

  return paginate<GetSchemaRevisionsResponse>(
    items,
    baseUrl,
    total,
    page,
    pageSize,
    extraQuery
  );
}

export function formatSchemaRevisionMetadataList(
  metadata: ItemsList,
  page: number,
  pageSize: number,
  baseUrl: string
): PaginatedList<GetSchemaRevisionMetadataListResponse> {
  // Reshape items
  const { total } = metadata;
  const items = metadata.items.map((metadataId) => ({
    metadataId,
    href: `${baseUrl}/${metadataId}`,
  }));

  return paginate<GetSchemaRevisionMetadataListResponse>(
    items,
    baseUrl,
    total,
    page,
    pageSize
  );
}
