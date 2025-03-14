import { PaginationQuery } from "@ebsiint-api/shared";
import { IsIn, IsOptional, IsString } from "class-validator";

export class GetDocumentAccessesDto extends PaginationQuery {
  @IsOptional()
  @IsIn(["delegate", "write", "creator"])
  permission?: "creator" | "delegate" | "write";

  @IsOptional()
  @IsString()
  "granted-by"?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
