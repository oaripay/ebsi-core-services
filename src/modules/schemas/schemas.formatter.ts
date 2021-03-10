import { GetSchemasResponse, SchemasList } from "./schemas.interface";
import { PaginatedList } from "../../shared/interfaces";
import { paginate } from "../../shared/utils";

export function formatSchemas(
  schemas: SchemasList,
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

export default { formatSchemas };
