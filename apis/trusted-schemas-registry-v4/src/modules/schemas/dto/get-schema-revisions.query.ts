import { IsOptional, IsISO8601 } from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetSchemaRevisionsQuery extends PaginationQuery {
  @IsOptional()
  @IsISO8601()
  "valid-at"?: string;
}

export default GetSchemaRevisionsQuery;
