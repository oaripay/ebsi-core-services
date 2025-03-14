import { PaginationQuery } from "@ebsiint-api/shared";
import { IsISO8601, IsOptional } from "class-validator";

export class GetSchemaRevisionsQuery extends PaginationQuery {
  @IsISO8601()
  @IsOptional()
  "valid-at"?: string;
}
