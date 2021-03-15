export interface GetSchemasResponse {
  schemaId: string;
  href: string;
}

export interface GetSchemaRevisionsResponse {
  schemaRevisionId: string;
  href: string;
}

export interface ItemsList {
  items: string[];
  total: number;
}
